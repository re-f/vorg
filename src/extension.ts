import * as vscode from 'vscode';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import uniorgRehype from 'uniorg-rehype';
import rehypeStringify from 'rehype-stringify';

export function activate(context: vscode.ExtensionContext) {
  let currentPanel: vscode.WebviewPanel | undefined = undefined;
  let currentSidePanel: vscode.WebviewPanel | undefined = undefined;

  // 普通预览命令（在当前标签页中打开）
  let previewDisposable = vscode.commands.registerCommand('vorg.preview', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found. Please open an Org-mode file first.');
      return;
    }

    if (activeEditor.document.languageId !== 'org') {
      vscode.window.showWarningMessage('Current file is not an Org-mode file. VOrg works best with .org files.');
    }

    const columnToShowIn = activeEditor.viewColumn;

    if (currentPanel) {
      currentPanel.reveal(columnToShowIn);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'vorgPreview',
        'Org Preview',
        columnToShowIn || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      currentPanel.onDidDispose(
        () => {
          currentPanel = undefined;
        },
        null,
        context.subscriptions
      );
    }

    updatePreview(currentPanel);
  });

  // 并排预览命令（在侧边打开）
  let previewToSideDisposable = vscode.commands.registerCommand('vorg.previewToSide', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found. Please open an Org-mode file first.');
      return;
    }

    if (activeEditor.document.languageId !== 'org') {
      vscode.window.showWarningMessage('Current file is not an Org-mode file. VOrg works best with .org files.');
    }

    // 确定预览窗口应该显示在哪一列
    const currentColumn = activeEditor.viewColumn || vscode.ViewColumn.One;
    const previewColumn = currentColumn === vscode.ViewColumn.One 
      ? vscode.ViewColumn.Two 
      : vscode.ViewColumn.Beside;

    if (currentSidePanel) {
      currentSidePanel.reveal(previewColumn);
    } else {
      currentSidePanel = vscode.window.createWebviewPanel(
        'vorgSidePreview',
        'Org Preview',
        previewColumn,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      currentSidePanel.onDidDispose(
        () => {
          currentSidePanel = undefined;
        },
        null,
        context.subscriptions
      );
    }

    updatePreview(currentSidePanel);
  });

  context.subscriptions.push(previewDisposable, previewToSideDisposable);

  // 监听文档变化，实时更新预览
  vscode.workspace.onDidChangeTextDocument(
    event => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        // 更新所有打开的预览窗口
        if (currentPanel) {
          updatePreview(currentPanel);
        }
        if (currentSidePanel) {
          updatePreview(currentSidePanel);
        }
      }
    },
    null,
    context.subscriptions
  );

  // 监听活动编辑器变化
  vscode.window.onDidChangeActiveTextEditor(
    editor => {
      if (editor) {
        // 当切换编辑器时，更新预览
        if (currentPanel) {
          updatePreview(currentPanel);
        }
        if (currentSidePanel) {
          updatePreview(currentSidePanel);
        }
      }
    },
    null,
    context.subscriptions
  );

  function updatePreview(panel: vscode.WebviewPanel) {
    if (!panel || !vscode.window.activeTextEditor) {
      return;
    }

    const document = vscode.window.activeTextEditor.document;
    const text = document.getText();

    // 如果不是 org 文件，显示提示信息
    if (document.languageId !== 'org') {
      const infoHtml = `
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
            <p>Current file type: <strong>${document.languageId}</strong></p>
            <p>To get the best experience, please open a file with .org extension.</p>
          </body>
        </html>
      `;
      panel.webview.html = infoHtml;
      return;
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

      // 添加美观的样式，支持明暗主题
      const styledHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
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
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      panel.webview.html = styledHtml;
    } catch (error) {
      const errorHtml = `
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
      panel.webview.html = errorHtml;
    }
  }
}

export function deactivate() {} 