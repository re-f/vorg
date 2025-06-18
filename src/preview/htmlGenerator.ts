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
      // 使用 unified 处理流程转换 Org 到 HTML
      const processor = unified()
        .use(uniorgParse as any)
        .use(uniorgRehype as any)
        .use(rehypeStringify as any);

      const html = processor.processSync(text).toString();

      // 获取当前 VS Code 主题信息
      const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

      // 添加行号标记到 HTML 中以便滚动同步
      const htmlWithLineMarkers = this.addLineMarkers(html, text);

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

  private static addLineMarkers(html: string, text: string): string {
    const lines = text.split('\n');
    let htmlWithLineMarkers = '';
    let currentLineIndex = 0;

    // 为每个标题添加行号标记
    const htmlLines = html.split('\n');
    htmlLines.forEach((line, index) => {
      if (line.includes('<h1') || line.includes('<h2') || line.includes('<h3') || 
          line.includes('<h4') || line.includes('<h5') || line.includes('<h6')) {
        // 找到对应的原始行号
        const headerMatch = line.match(/>([^<]+)</);
        if (headerMatch) {
          const headerText = headerMatch[1].trim();
          const originalLineIndex = lines.findIndex((orgLine, lineIndex) => {
            return lineIndex >= currentLineIndex && 
                   orgLine.trim().startsWith('*') && 
                   orgLine.includes(headerText);
          });
          if (originalLineIndex !== -1) {
            currentLineIndex = originalLineIndex + 1;
            htmlWithLineMarkers += line.replace(/(<h[1-6][^>]*>)/, `$1<span class="line-marker" data-line="${originalLineIndex}"></span>`);
          } else {
            htmlWithLineMarkers += line;
          }
        } else {
          htmlWithLineMarkers += line;
        }
      } else {
        htmlWithLineMarkers += line;
      }
      if (index < htmlLines.length - 1) {
        htmlWithLineMarkers += '\n';
      }
    });

    return htmlWithLineMarkers;
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
        list-style-type: none;
      }

      .task-list-item input[type="checkbox"] {
        margin-right: 0.5em;
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
            updateScrollPosition(message.scrollPercentage);
            break;
        }
      });
      
      function updateScrollPosition(percentage) {
        const body = document.body;
        const documentHeight = body.scrollHeight - window.innerHeight;
        const targetScrollTop = documentHeight * percentage;
        
        // 平滑滚动到目标位置
        window.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        
        // 更新滚动指示器
        updateScrollIndicator(percentage);
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