import * as vscode from 'vscode';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import uniorgRehype from 'uniorg-rehype';
import rehypeStringify from 'rehype-stringify';

export class HtmlGenerator {
  
  public static generatePreviewHtml(document: vscode.TextDocument): string {
    const text = document.getText();

    // 如果不是 org 文件，显示提示信息
    if (document.languageId !== 'org') {
      return this.generateInfoHtml(document.languageId);
    }

    try {
      // 首先解析 AST（只解析一次，后续重用）
      const parser = unified().use(uniorgParse as any);
      const ast = parser.parse(text);
      
      // 使用 AST 生成 HTML
      const processor = unified()
        .use(uniorgParse as any)
        .use(uniorgRehype as any)
        .use(rehypeStringify as any);

      let html = processor.processSync(text).toString();
      
      // 后处理：添加 checkbox 支持（重用 AST）
      html = this.processCheckboxes(html, ast);

      // 后处理：修复示例块的换行
      html = this.processExampleBlocks(html);

      // 获取当前 VS Code 主题信息
      const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

      // 添加行号标记到 HTML 中以便滚动同步（重用 AST）
      const htmlWithLineMarkers = this.addLineMarkers(html, ast);

      return this.generateStyledHtml(htmlWithLineMarkers || html, isDarkTheme);
    } catch (error) {
      return this.generateErrorHtml(error);
    }
  }

  private static generateInfoHtml(languageId: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              padding: 2em;
              color: #856404;
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 4px;
              text-align: center;
            }
            h1 {
              color: #856404;
              margin-top: 0;
            }
            .icon {
              font-size: 3em;
              margin-bottom: 1em;
            }
          </style>
        </head>
        <body>
          <div class="icon">📄</div>
          <h1>Not an Org-mode File</h1>
          <p>VOrg is designed to preview Org-mode files (.org extension).</p>
          <p>Current file type: <strong>${languageId}</strong></p>
          <p>To get the best experience, please open a file with .org extension.</p>
        </body>
      </html>
    `;
  }

  private static generateErrorHtml(error: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              padding: 2em;
              color: #721c24;
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              border-radius: 4px;
            }
            h1 {
              color: #721c24;
              margin-top: 0;
            }
            pre {
              background-color: #f1f1f1;
              padding: 1em;
              border-radius: 4px;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <h1>Error Previewing Org File</h1>
          <p>An error occurred while processing the Org-mode document:</p>
          <pre>${String(error)}</pre>
          <p>Please check your Org-mode syntax and try again.</p>
        </body>
      </html>
    `;
  }

  private static addLineMarkers(html: string, ast: any): string {
    // 从 AST 中提取元素和行号的映射关系
    const lineMap = new Map<string, number>();
    
    const extractLineInfo = (node: any): void => {
      // 获取节点的位置信息（如果有的话）
      if (node.position && node.position.start) {
        const lineNumber = node.position.start.line - 1; // AST 行号从 1 开始，我们需要从 0 开始
        
        // 处理标题节点
        if (node.type === 'headline') {
          // 提取标题的纯文本内容
          const titleText = this.extractTextFromNode(node);
          if (titleText) {
            lineMap.set(titleText.trim(), lineNumber);
          }
        }
        
        // 处理段落节点
        else if (node.type === 'paragraph') {
          const paragraphText = this.extractTextFromNode(node);
          if (paragraphText && paragraphText.length >= 10) {
            // 使用前50个字符作为键，提高匹配成功率
            lineMap.set(paragraphText.trim().substring(0, 50), lineNumber);
          }
        }
        
        // 处理列表项节点
        else if (node.type === 'list-item') {
          const listText = this.extractTextFromNode(node);
          if (listText && listText.length >= 5) {
            lineMap.set(listText.trim().substring(0, 50), lineNumber);
          }
        }
      }
      
      // 递归处理子节点
      if (node.children) {
        node.children.forEach(extractLineInfo);
      }
    };
    
    extractLineInfo(ast);

    // 使用正则在 HTML 中插入行号标记
    let htmlWithLineMarkers = html;
    
    // 为标题添加行号标记
    htmlWithLineMarkers = htmlWithLineMarkers.replace(
      /(<h[1-6][^>]*>)([^<]+)/g,
      (match, openTag, content) => {
        const cleanContent = content.trim();
        const lineNum = lineMap.get(cleanContent);
        if (lineNum !== undefined) {
          return `${openTag}<span class="line-marker" data-line="${lineNum}"></span>${content}`;
        }
        return match;
      }
    );

    // 为段落和列表项添加行号标记
    htmlWithLineMarkers = htmlWithLineMarkers.replace(
      /(<(?:p|li)[^>]*>)([^<]{10,})/g,
      (match, openTag, content) => {
        const cleanContent = content.trim().substring(0, 50);
        const lineNum = lineMap.get(cleanContent);
        if (lineNum !== undefined) {
          return `${openTag}<span class="line-marker" data-line="${lineNum}"></span>${content}`;
        }
        return match;
      }
    );

    return htmlWithLineMarkers;
  }

  /**
   * 从 AST 节点中提取纯文本内容
   */
  private static extractTextFromNode(node: any): string {
    if (!node) {
      return '';
    }
    
    // 如果节点有直接的值，返回它
    if (node.value) {
      return node.value;
    }
    
    // 如果有子节点，递归提取文本
    if (node.children && node.children.length > 0) {
      return node.children
        .map((child: any) => this.extractTextFromNode(child))
        .join('')
        .trim();
    }
    
    return '';
  }

  private static processCheckboxes(html: string, ast: any): string {
    // 收集所有的 checkbox 信息
    const checkboxItems: Array<{checkbox: string | null, content: string}> = [];
    
    function collectCheckboxes(node: any): void {
      if (node.type === 'list-item' && node.checkbox !== null && node.checkbox !== undefined) {
        // 提取列表项的文本内容
        let content = '';
        if (node.children && node.children.length > 0) {
          const paragraph = node.children[0];
          if (paragraph && paragraph.children) {
            content = paragraph.children.map((child: any) => child.value || '').join('').trim();
          }
        }
        checkboxItems.push({
          checkbox: node.checkbox,
          content: content
        });
      }
      
      if (node.children) {
        node.children.forEach(collectCheckboxes);
      }
    }
    
    collectCheckboxes(ast);
    
    // 在 HTML 中替换对应的列表项
    let processedHtml = html;
    
    checkboxItems.forEach((item) => {
      if (item.content) {
        // 匹配对应的 <li> 元素
        const liPattern = new RegExp(`<li>([^<]*${item.content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*)</li>`, 'g');
        
        // 创建带 checkbox 的替换内容
        const checkboxElement = `<input type="checkbox"${item.checkbox === 'on' ? ' checked' : ''} disabled>`;
        const replacement = `<li class="task-list-item">${checkboxElement} $1</li>`;
        
        processedHtml = processedHtml.replace(liPattern, replacement);
      }
    });
    
    return processedHtml;
  }

  private static processExampleBlocks(html: string): string {
    // 修复示例块中的换行问题
    // uniorg-rehype 可能会将示例块转换为没有正确保持换行的格式
    
    // 处理所有的 pre 标签，确保保持换行
    html = html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (match, attributes, content) => {
      // 确保内容中的换行符被保持
      const processedContent = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&'); // 解码HTML实体
      
      return `<pre${attributes} style="white-space: pre-wrap;">${processedContent}</pre>`;
    });

    // 处理可能的其他格式的示例块
    html = html.replace(/<div([^>]*class[^>]*example[^>]*)>([\s\S]*?)<\/div>/gi, (match, attributes, content) => {
      return `<div${attributes}><pre style="white-space: pre-wrap;">${content}</pre></div>`;
    });

    // 处理可能的代码块包装
    html = html.replace(/<code([^>]*)>([\s\S]*?)<\/code>/g, (match, attributes, content) => {
      // 如果是多行代码，应该使用 pre 包装
      if (content.includes('\n')) {
        return `<pre${attributes} style="white-space: pre-wrap;"><code>${content}</code></pre>`;
      }
      return match; // 保持单行代码不变
    });

    return html;
  }

  private static generateStyledHtml(content: string, isDarkTheme: boolean): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${this.getStyles(isDarkTheme)}
          </style>
        </head>
        <body>
          <div class="scroll-indicator" id="scrollIndicator"></div>
          ${content}
          
          <script>
            ${this.getScript()}
          </script>
        </body>
      </html>
    `;
  }

  private static getStyles(isDarkTheme: boolean): string {
    return `
      :root {
        --bg-color: ${isDarkTheme ? '#1e1e1e' : '#ffffff'};
        --text-color: ${isDarkTheme ? '#d4d4d4' : '#333333'};
        --border-color: ${isDarkTheme ? '#404040' : '#e1e4e8'};
        --code-bg: ${isDarkTheme ? '#2d2d30' : '#f6f8fa'};
        --quote-border: ${isDarkTheme ? '#0366d6' : '#0366d6'};
        --quote-bg: ${isDarkTheme ? '#282828' : '#f6f8fa'};
        --table-header-bg: ${isDarkTheme ? '#404040' : '#f6f8fa'};
        --link-color: ${isDarkTheme ? '#58a6ff' : '#0366d6'};
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: var(--text-color);
        background-color: var(--bg-color);
        padding: 2em;
        max-width: none;
        margin: 0;
        word-wrap: break-word;
      }

      h1, h2, h3, h4, h5, h6 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        font-weight: 600;
        line-height: 1.25;
        position: relative;
      }

      h1 {
        font-size: 2em;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.3em;
      }

      h2 {
        font-size: 1.5em;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.3em;
      }

      p {
        margin-bottom: 1em;
      }

      a {
        color: var(--link-color);
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      code {
        background-color: var(--code-bg);
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 85%;
      }

      pre {
        background-color: var(--code-bg);
        padding: 1em;
        border-radius: 6px;
        overflow-x: auto;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 85%;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      pre code {
        background-color: transparent;
        padding: 0;
        border-radius: 0;
        font-size: 100%;
      }

      blockquote {
        border-left: 4px solid var(--quote-border);
        margin: 0 0 1em 0;
        padding: 0 1em;
        background-color: var(--quote-bg);
        border-radius: 0 6px 6px 0;
      }

      ul, ol {
        padding-left: 2em;
        margin-bottom: 1em;
      }

      li {
        margin-bottom: 0.25em;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }

      /* 确保示例块和代码块保持换行 */
      .example, .src {
        white-space: pre-wrap;
      }

      /* 针对不同的 org 导出元素 */
      .org-src-container pre,
      .example pre,
      .verse,
      div[class*="example"] {
        white-space: pre-wrap;
      }

      th, td {
        border: 1px solid var(--border-color);
        padding: 0.6em 1em;
        text-align: left;
      }

      th {
        background-color: var(--table-header-bg);
        font-weight: 600;
      }

      tr:nth-child(2n) {
        background-color: var(--code-bg);
      }

      hr {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 2em 0;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      /* 任务列表样式 */
      .task-list-item {
        /* 不设置 list-style-type，自然继承父元素的样式，保持一致 */
      }

      .task-list-item input[type="checkbox"] {
        margin-right: 0.5em;
        vertical-align: middle;
      }

      /* 标签样式 */
      .org-tag {
        background-color: var(--quote-border);
        color: white;
        padding: 0.2em 0.5em;
        border-radius: 3px;
        font-size: 0.8em;
        margin-left: 0.5em;
      }

      /* 行号标记（不可见） */
      .line-marker {
        display: none;
      }

      /* 滚动指示器 */
      .scroll-indicator {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background-color: var(--quote-border);
        transform-origin: left;
        z-index: 1000;
        opacity: 0.7;
      }
    `;
  }

  private static getScript(): string {
    return `
      const vscode = acquireVsCodeApi();
      
      // 通知 VS Code 预览窗口已准备就绪
      vscode.postMessage({ command: 'ready' });
      
      // 监听来自 VS Code 的消息
      window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
          case 'updateScroll':
            updateScrollPosition(message.scrollPercentage, message.lineNumber);
            break;
        }
      });
      
      function updateScrollPosition(percentage, lineNumber) {
        // 尝试使用行号进行精确定位
        if (lineNumber !== undefined) {
          const targetElement = findClosestElementByLine(lineNumber);
          if (targetElement) {
            // 找到了对应的元素，滚动到该元素
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            updateScrollIndicator(percentage);
            return;
          }
        }
        
        // 如果无法通过行号定位，使用百分比作为后备方案
        const body = document.body;
        const documentHeight = body.scrollHeight - window.innerHeight;
        const targetScrollTop = documentHeight * percentage;
        
        window.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        
        updateScrollIndicator(percentage);
      }
      
      function findClosestElementByLine(targetLine) {
        // 查找所有带有行号标记的元素
        const markers = document.querySelectorAll('.line-marker');
        let closestMarker = null;
        let closestDistance = Infinity;
        
        markers.forEach(marker => {
          const line = parseInt(marker.getAttribute('data-line'), 10);
          const distance = Math.abs(line - targetLine);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestMarker = marker;
          }
        });
        
        // 返回标记所在的父元素
        return closestMarker ? closestMarker.parentElement : null;
      }
      
      function updateScrollIndicator(percentage) {
        const indicator = document.getElementById('scrollIndicator');
        if (indicator) {
          indicator.style.transform = \`scaleX(\${percentage})\`;
        }
      }
      
      // 初始化滚动指示器
      updateScrollIndicator(0);
    `;
  }
} 