import * as vscode from 'vscode';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import uniorgRehype from 'uniorg-rehype';
import rehypeStringify from 'rehype-stringify';
import { QueryService } from '../services/queryService';
import { parseTodoKeywords } from '../utils/constants';
import { OrgHeading } from '../database/types';
import * as path from 'path';

/**
 * HTML 生成器
 * 
 * 负责将 org 内容转换为 HTML，包括样式和脚本。
 * 使用 uniorg 解析器将 org-mode 语法转换为 HTML。
 * 
 * 功能包括：
 * - 生成预览 HTML（包含滚动同步标记）
 * - 生成可导出的 HTML（独立文件）
 * - 处理复选框交互
 * - 添加行号标记用于滚动同步
 * - 根据 VS Code 主题应用样式
 * 
 * @class HtmlGenerator
 */
export class HtmlGenerator {

  public static generatePreviewHtml(document: vscode.TextDocument, webview?: vscode.Webview): string {
    const text = document.getText();

    // 如果不是 org 文件，显示提示信息
    if (document.languageId !== 'org') {
      return this.generateInfoHtml(document.languageId);
    }

    try {
      // 提取文档标题
      const documentTitle = this.extractTitle(text);

      // 首先解析 AST（只解析一次，后续重用）
      const todoConfig = vscode.workspace.getConfiguration('vorg').get<string>('todoKeywords', '');
      const { allKeywords } = parseTodoKeywords(todoConfig);

      const parser = unified().use(uniorgParse as any, {
        todoKeywords: allKeywords.map(k => k.keyword)
      });
      const ast = parser.parse(text);

      // 使用 AST 生成 HTML
      const processor = unified()
        .use(uniorgRehype as any)
        .use(rehypeStringify as any);

      // 在转换为 HTML 之前处理查询块 (修改 AST)
      const queryResults = new Map<string, string>();
      this.preProcessQueryBlocks(ast, queryResults);

      const hast = processor.runSync(ast);
      let html = (processor.stringify(hast as any) as any).toString();

      // 后处理：添加 checkbox 支持（重用 AST）
      html = this.processCheckboxes(html, ast);

      // 后处理：执行并替换嵌入式查询块
      html = this.postProcessQueryBlocks(html, queryResults);

      // 后处理：修复示例块的换行
      html = this.processExampleBlocks(html);

      // 后处理：处理 Mermaid 图表
      html = this.processMermaidBlocks(html, ast);

      // 获取当前 VS Code 主题信息
      const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

      // 添加行号标记到 HTML 中以便滚动同步（重用 AST）
      const htmlWithLineMarkers = this.addLineMarkers(html, ast);

      return this.generateStyledHtml(htmlWithLineMarkers || html, isDarkTheme, webview, documentTitle);
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
          <p>VOrg is designed to preview Org-mode files (.org and .org_archive extensions).</p>
          <p>Current file type: <strong>${languageId}</strong></p>
          <p>To get the best experience, please open a file with .org or .org_archive extension.</p>
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
          } else if (paragraphText && paragraphText.trim().length > 0) {
            // 即使内容较短也记录，提高覆盖率
            lineMap.set(paragraphText.trim(), lineNumber);
          }
        }

        // 处理列表项节点
        else if (node.type === 'list-item') {
          const listText = this.extractTextFromNode(node);
          if (listText && listText.length >= 5) {
            lineMap.set(listText.trim().substring(0, 50), lineNumber);
          } else if (listText && listText.trim().length > 0) {
            lineMap.set(listText.trim(), lineNumber);
          }
        }

        // 处理代码块节点（src-block, example-block 等）
        else if (node.type === 'src-block' || node.type === 'example-block' || node.type === 'special-block') {
          // 对于 Query 块，value 可能是我们的 Token
          const text = (node.type === 'special-block')
            ? this.extractTextFromNode(node)
            : (node.value || '');

          const firstLine = text.split('\n')[0];
          if (firstLine && firstLine.trim().length > 0) {
            lineMap.set(`code:${firstLine.trim().substring(0, 30)}`, lineNumber);
          } else {
            lineMap.set(`code:${node.type}`, lineNumber);
          }
        }

        // 处理表格节点
        else if (node.type === 'table') {
          // 使用表格的第一行内容作为标识
          if (node.children && node.children.length > 0) {
            const firstRow = node.children[0];
            const rowText = this.extractTextFromNode(firstRow);
            if (rowText && rowText.trim().length > 0) {
              lineMap.set(`table:${rowText.trim().substring(0, 30)}`, lineNumber);
            } else {
              lineMap.set('table:', lineNumber);
            }
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
      /(<(?:p|li)[^>]*>)([^<]+)/g,
      (match, openTag, content) => {
        const cleanContent = content.trim();
        // 尝试匹配完整内容
        let lineNum = lineMap.get(cleanContent);
        // 如果没找到，尝试匹配前50个字符
        if (lineNum === undefined && cleanContent.length >= 10) {
          lineNum = lineMap.get(cleanContent.substring(0, 50));
        }
        // 如果还是没找到，尝试匹配前5个字符（对于短内容）
        if (lineNum === undefined && cleanContent.length >= 5) {
          lineNum = lineMap.get(cleanContent.substring(0, 5));
        }
        if (lineNum !== undefined) {
          return `${openTag}<span class="line-marker" data-line="${lineNum}"></span>${content}`;
        }
        return match;
      }
    );

    // 为代码块添加行号标记
    htmlWithLineMarkers = htmlWithLineMarkers.replace(
      /(<pre[^>]*>)([\s\S]*?)(<\/pre>)/g,
      (match, openTag, content, closeTag) => {
        const cleanContent = content.trim();
        const firstLine = cleanContent.split('\n')[0];
        // 尝试匹配代码块
        let lineNum = lineMap.get(`code:${firstLine.substring(0, 30)}`);
        if (lineNum === undefined && firstLine.length > 0) {
          lineNum = lineMap.get(`code:${firstLine}`);
        }
        if (lineNum !== undefined) {
          return `${openTag}<span class="line-marker" data-line="${lineNum}"></span>${content}${closeTag}`;
        }
        return match;
      }
    );

    // 为表格添加行号标记（在 table 标签后添加）
    htmlWithLineMarkers = htmlWithLineMarkers.replace(
      /(<table[^>]*>)([\s\S]*?<tr[^>]*>[\s\S]*?<\/tr>)/g,
      (match, openTag, firstRow) => {
        const rowText = firstRow.replace(/<[^>]+>/g, '').trim();
        let lineNum = lineMap.get(`table:${rowText.substring(0, 30)}`);
        if (lineNum === undefined && rowText.length > 0) {
          lineNum = lineMap.get(`table:${rowText}`);
        }
        if (lineNum !== undefined) {
          return `${openTag}<span class="line-marker" data-line="${lineNum}"></span>${firstRow}`;
        }
        return match;
      }
    );

    return htmlWithLineMarkers;
  }

  /**
   * 从文档文本中提取 #+TITLE 元数据
   */
  private static extractTitle(text: string): string | null {
    const lines = text.split('\n');
    for (const line of lines) {
      // 匹配 #+TITLE: 或 #+title:（不区分大小写）
      const titleMatch = line.match(/^#\+title:\s*(.+)$/i);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }
    return null;
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
    const checkboxItems: Array<{ checkbox: string | null, content: string }> = [];

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

  /**
   * 处理 Mermaid 代码块
   * 将 mermaid 语言的代码块转换为可渲染的 div
   */
  private static processMermaidBlocks(html: string, ast: any): string {
    const mermaidBlocks: Array<{ code: string }> = [];

    // 从 AST 中提取 mermaid 代码块
    const extractMermaid = (node: any): void => {
      if (node.type === 'src-block' && node.language && node.language.toLowerCase() === 'mermaid') {
        mermaidBlocks.push({ code: node.value || '' });
      }
      if (node.children) {
        node.children.forEach(extractMermaid);
      }
    };

    extractMermaid(ast);

    // 如果没有 mermaid 块,直接返回
    if (mermaidBlocks.length === 0) {
      return html;
    }

    // 替换 HTML 中的 mermaid 代码块
    let processedHtml = html;
    let blockIndex = 0;

    // 匹配 pre 标签中包含 mermaid 代码的内容
    processedHtml = processedHtml.replace(
      /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
      (match, preAttrs, codeAttrs, content) => {
        // 检查是否是 mermaid 代码块
        if (blockIndex < mermaidBlocks.length) {
          const block = mermaidBlocks[blockIndex];
          const decodedContent = content
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .trim();

          // 检查内容是否匹配(去除空白符后比较)
          const normalizedBlock = block.code.replace(/\s+/g, ' ').trim();
          const normalizedContent = decodedContent.replace(/\s+/g, ' ').trim();

          if (normalizedContent.includes('graph') ||
            normalizedContent.includes('sequenceDiagram') ||
            normalizedContent.includes('classDiagram') ||
            normalizedContent.includes('stateDiagram') ||
            normalizedContent.includes('erDiagram') ||
            normalizedContent.includes('gantt') ||
            normalizedContent.includes('pie') ||
            normalizedContent.includes('flowchart')) {
            blockIndex++;
            return `<div class="mermaid">${decodedContent}</div>`;
          }
        }
        return match;
      }
    );

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

  /**
   * 在 AST 转换前，将查询块替换为占位符
   */
  private static preProcessQueryBlocks(ast: any, queryResults: Map<string, string>): void {
    let queryCounter = 0;

    const traverse = (node: any): void => {
      let isQuery = false;
      let queryValue = '';

      const nodeType = node.type;
      const blockName = (node.blockType || node.name || node.language || '').toString().toUpperCase();

      if (nodeType === 'src-block' && blockName === 'QUERY') {
        isQuery = true;
        queryValue = node.value;
      } else if (nodeType === 'special-block' && blockName === 'QUERY') {
        isQuery = true;
        queryValue = this.extractTextFromNode(node);
      } else if (blockName === 'QUERY' && (nodeType === 'export-block' || nodeType === 'example-block')) {
        isQuery = true;
        queryValue = node.value;
      } else if (nodeType === 'example-block' && node.value && node.value.trim().startsWith('{') && node.value.includes('"todo"')) {
        isQuery = true;
        queryValue = node.value;
      }

      if (isQuery && queryValue) {
        const tokenId = `__VORG_QUERY_BLOCK_${queryCounter++}__`;
        try {
          const headings = QueryService.executeSync(queryValue);
          const resultHtml = this.renderHeadingList(headings);
          queryResults.set(tokenId, resultHtml);

          // 修改节点内容为 Token，并确保结构符合 Org 规范（Greater Element 包含 Element）
          if (nodeType === 'src-block' || nodeType === 'example-block' || nodeType === 'export-block') {
            node.value = tokenId;
          } else if (nodeType === 'special-block') {
            node.children = [{
              type: 'paragraph',
              children: [{ type: 'text', value: tokenId }]
            }];
          }
        } catch (e) {
          console.error('Failed to pre-process query block', e);
        }
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(ast);
  }

  /**
   * 在 HTML 生成后，将占位符替换为查询结果
   */
  private static postProcessQueryBlocks(html: string, queryResults: Map<string, string>): string {
    let processedHtml = html;

    queryResults.forEach((resultHtml, tokenId) => {
      // 匹配包含 Token 的容器 (pre 或 div)
      // 使用更宽松的正则处理可能的空白符
      const pattern = new RegExp(`<(pre|div)[^>]*>[\\s\\S]*?\\s*${tokenId}\\s*[\\s\\S]*?<\\/\\1>`, 'g');
      processedHtml = processedHtml.replace(pattern, `<div class="org-query-container">${resultHtml}</div>`);
    });

    return processedHtml;
  }

  /**
   * 将查询到的 Heading 列表渲染为 HTML
   */
  private static renderHeadingList(headings: OrgHeading[]): string {
    if (headings.length === 0) {
      return '<div class="org-query-no-results">No results found.</div>';
    }

    const items = headings.map(h => {
      const todoClass = h.todoState ? `todo-${h.todoState.toLowerCase()}` : '';
      const priorityTag = h.priority ? `<span class="org-priority">[#${h.priority}]</span>` : '';
      const tagsHtml = (h.tags && h.tags.length > 0)
        ? `<span class="org-tags">${h.tags.map(t => `<span class="org-tag">${t}</span>`).join('')}</span>`
        : '';

      const fileName = path.basename(h.fileUri);

      return `
        <div class="org-query-item">
          <div class="org-query-row">
            ${h.todoState ? `<span class="org-todo ${todoClass}">${h.todoState}</span>` : ''}
            ${priorityTag}
            <a href="#" class="org-query-link" 
               onclick="onHeadingClick('${h.fileUri.replace(/'/g, "\\'")}', ${h.startLine})"
               title="${h.fileUri}">
               ${this.escapeHtml(h.title)}
            </a>
            ${tagsHtml}
          </div>
          <div class="org-query-meta">${fileName}:${h.startLine + 1}</div>
        </div>
      `;
    }).join('');

    return `<div class="org-query-results">${items}</div>`;
  }

  private static generateStyledHtml(content: string, isDarkTheme: boolean, webview?: vscode.Webview, documentTitle?: string | null): string {
    const exportButtonHtml = webview ? this.getExportButtonHtml() : '';
    const titleHtml = documentTitle ? `<h1 class="document-title">${this.escapeHtml(documentTitle)}</h1>` : '';
    const pageTitle = documentTitle || 'Org Preview';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(pageTitle)}</title>
          <style>
            ${this.getStyles(isDarkTheme)}
            ${this.getExportButtonStyles()}
            ${this.getMermaidStyles()}
          </style>
          <!-- Mermaid 库 -->
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        </head>
        <body>
          ${exportButtonHtml}
          <div class="scroll-indicator" id="scrollIndicator"></div>
          ${titleHtml}
          ${content}
          
          <script>
            ${this.getMermaidInitScript(isDarkTheme)}
            ${this.getScript(webview)}
          </script>
        </body>
      </html>
    `;
  }

  private static getExportButtonHtml(): string {
    return `
      <div class="export-button-container">
        <button id="exportHtmlButton" class="export-button" title="导出为 HTML 文件">
          <svg class="export-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    `;
  }

  private static getExportButtonStyles(): string {
    return `
      .export-button-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1001;
      }

      .export-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background-color: var(--quote-border);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: visible;
      }

      .export-button:hover {
        background-color: var(--link-color);
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15);
      }

      .export-button:active {
        transform: translateY(0) scale(0.98);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .export-button::before {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        right: 0;
        margin-bottom: 8px;
        padding: 6px 12px;
        background-color: rgba(0, 0, 0, 0.85);
        color: white;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        white-space: nowrap;
        border-radius: 4px;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        transition: opacity 0.2s, transform 0.2s;
      }

      .export-button:hover::before {
        opacity: 1;
        transform: translateY(0);
      }

      .export-icon {
        width: 20px;
        height: 20px;
        stroke: currentColor;
      }

      /* 确保按钮在滚动时保持可见 */
      @media (max-width: 600px) {
        .export-button-container {
          bottom: 15px;
          right: 15px;
        }
        
        .export-button {
          width: 44px;
          height: 44px;
        }
        
        .export-icon {
          width: 18px;
          height: 18px;
        }
      }
    `;
  }

  /**
   * 生成可导出的完整 HTML（不包含 VS Code 特定的脚本）
   */
  public static generateExportableHtml(document: vscode.TextDocument): string {
    const text = document.getText();

    // 如果不是 org 文件，显示提示信息
    if (document.languageId !== 'org') {
      return this.generateInfoHtml(document.languageId);
    }

    try {
      // 提取文档标题
      const documentTitle = this.extractTitle(text);

      // 首先解析 AST（只解析一次，后续重用）
      const todoConfig = vscode.workspace.getConfiguration('vorg').get<string>('todoKeywords', '');
      const { allKeywords } = parseTodoKeywords(todoConfig);

      const parser = unified().use(uniorgParse as any, {
        todoKeywords: allKeywords.map(k => k.keyword)
      });
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

      // 后处理：处理 Mermaid 图表
      html = this.processMermaidBlocks(html, ast);

      // 获取当前 VS Code 主题信息
      const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

      // 添加行号标记到 HTML 中（导出版本不需要滚动同步，但保留标记以便将来可能使用）
      const htmlWithLineMarkers = this.addLineMarkers(html, ast);

      return this.generateExportableStyledHtml(htmlWithLineMarkers || html, isDarkTheme, documentTitle);
    } catch (error) {
      return this.generateErrorHtml(error);
    }
  }

  /**
   * 生成可导出的样式化 HTML（不包含 VS Code 特定脚本）
   */
  private static generateExportableStyledHtml(content: string, isDarkTheme: boolean, documentTitle?: string | null): string {
    // 移除滚动指示器（导出版本不需要）
    const contentWithoutScrollIndicator = content.replace(
      /<div class="scroll-indicator"[^>]*>.*?<\/div>/s,
      ''
    );

    const titleHtml = documentTitle ? `<h1 class="document-title">${this.escapeHtml(documentTitle)}</h1>` : '';
    const pageTitle = documentTitle || 'Org Preview Export';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(pageTitle)}</title>
          <style>
            ${this.getStyles(isDarkTheme)}
            ${this.getMermaidStyles()}
            /* 隐藏滚动指示器（如果存在） */
            .scroll-indicator {
              display: none !important;
            }
          </style>
          <!-- Mermaid 库 -->
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        </head>
        <body>
          ${titleHtml}
          ${contentWithoutScrollIndicator}
          <script>
            ${this.getMermaidInitScript(isDarkTheme)}
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

      /* 文档标题样式（来自 #+TITLE） */
      .document-title {
        margin-top: 0;
        margin-bottom: 1.5em;
        font-size: 2.5em;
        font-weight: 700;
        border-bottom: 2px solid var(--quote-border);
        padding-bottom: 0.5em;
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

      /* 嵌入式查询样式 */
      .org-query-container {
        margin: 1.5em 0;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1em;
        background-color: var(--code-bg);
      }
      .org-query-results {
        display: flex;
        flex-direction: column;
        gap: 0.8em;
      }
      .org-query-item {
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.6em;
      }
      .org-query-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .org-query-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5em;
      }
      .org-query-link {
        font-weight: 600;
        color: var(--link-color);
        text-decoration: none;
      }
      .org-query-link:hover {
        text-decoration: underline;
      }
      .org-query-meta {
        font-size: 0.8em;
        color: #888;
        margin-top: 0.2em;
      }
      .org-todo {
        padding: 0.1em 0.4em;
        border-radius: 3px;
        font-weight: bold;
        font-size: 0.75em;
        color: white;
      }
      .todo-todo { background-color: #ff5252; }
      .todo-next { background-color: #ffab40; }
      .todo-done { background-color: #4caf50; opacity: 0.7; }
      .org-priority {
        color: #e91e63;
        font-family: monospace;
        font-weight: bold;
      }
      .org-query-no-results {
        text-align: center;
        color: #888;
        padding: 1em;
        font-style: italic;
      }
    `;
  }

  /**
   * 获取 Mermaid 样式
   */
  private static getMermaidStyles(): string {
    return `
      /* Mermaid 图表样式 */
      .mermaid {
        margin: 1.5em 0;
        padding: 1em;
        background-color: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        text-align: center;
        overflow-x: auto;
      }

      .mermaid svg {
        max-width: 100%;
        height: auto;
      }
    `;
  }

  /**
   * 获取 Mermaid 初始化脚本
   */
  private static getMermaidInitScript(isDarkTheme: boolean): string {
    const theme = isDarkTheme ? 'dark' : 'default';
    return `
      // 初始化 Mermaid
      if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
          startOnLoad: true,
          theme: '${theme}',
          securityLevel: 'loose',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
        });
      }
    `;
  }

  private static getScript(webview?: vscode.Webview): string {
    const hasWebview = webview ? 'true' : 'false';

    return `
      const vscode = ${webview ? 'acquireVsCodeApi()' : 'null'};
      const hasWebview = ${hasWebview};
      
      // 通知 VS Code 预览窗口已准备就绪
      if (hasWebview && vscode) {
        vscode.postMessage({ command: 'ready' });
      }

      window.onHeadingClick = function(uri, line) {
        if (vscode) {
          vscode.postMessage({
            command: 'openHeading',
            uri: uri,
            line: line
          });
        }
      };
      
      // 监听来自 VS Code 的消息
      if (hasWebview && vscode) {
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.command) {
            case 'updateScroll':
              updateScrollPosition(
                message.scrollPercentage, 
                message.lineNumber,
                message.centerLine,
                message.lastVisibleLine
              );
              break;
          }
        });
      }

      // 导出按钮点击处理
      if (hasWebview && vscode) {
        const exportButton = document.getElementById('exportHtmlButton');
        if (exportButton) {
          exportButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'exportHtml' });
          });
        }
      }
      
      function updateScrollPosition(percentage, lineNumber, centerLine, lastVisibleLine) {
        // 优先使用行号进行精确定位
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
        
        // 如果无法通过行号定位，使用改进的百分比计算
        const body = document.body;
        const html = document.documentElement;
        
        // 计算实际可滚动高度（考虑 padding 和 margin）
        const scrollHeight = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
        const clientHeight = window.innerHeight || html.clientHeight;
        const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
        
        // 改进的百分比计算：确保在文件尾部能正确滚动到底部
        // 当百分比接近 1 时，直接滚动到底部
        let targetScrollTop;
        if (percentage >= 0.99 || percentage >= 1) {
          targetScrollTop = maxScrollTop;
        } else {
          targetScrollTop = maxScrollTop * percentage;
        }
        
        // 确保滚动位置在有效范围内
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
        
        window.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        
        updateScrollIndicator(percentage);
      }
      
      function findClosestElementByLine(targetLine) {
        // 查找所有带有行号标记的元素
        const markers = document.querySelectorAll('.line-marker');
        if (markers.length === 0) {
          return null;
        }
        
        let closestMarker = null;
        let closestDistance = Infinity;
        
        markers.forEach(marker => {
          const line = parseInt(marker.getAttribute('data-line'), 10);
          if (isNaN(line)) {
            return;
          }
          
          const distance = Math.abs(line - targetLine);
          
          // 优先选择小于等于目标行号的最近元素（向上查找）
          // 这样可以确保滚动位置不会超过编辑器中的位置
          if (line <= targetLine && distance < closestDistance) {
            closestDistance = distance;
            closestMarker = marker;
          } else if (!closestMarker && distance < closestDistance) {
            // 如果没有找到小于等于目标行号的元素，则选择最近的
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

  /**
   * HTML 转义工具函数
   */
  private static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
} 