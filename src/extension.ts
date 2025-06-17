import * as vscode from 'vscode';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import uniorgRehype from 'uniorg-rehype';
import rehypeStringify from 'rehype-stringify';

export function activate(context: vscode.ExtensionContext) {
  let currentPanel: vscode.WebviewPanel | undefined = undefined;

  let disposable = vscode.commands.registerCommand('vorg.preview', () => {
    const columnToShowIn = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (currentPanel) {
      currentPanel.reveal(columnToShowIn);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'vorgPreview',
        'Org Preview',
        columnToShowIn || vscode.ViewColumn.Beside,
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

    updatePreview();
  });

  context.subscriptions.push(disposable);

  // 监听文档变化
  vscode.workspace.onDidChangeTextDocument(
    event => {
      if (currentPanel && event.document === vscode.window.activeTextEditor?.document) {
        updatePreview();
      }
    },
    null,
    context.subscriptions
  );

  function updatePreview() {
    if (!currentPanel || !vscode.window.activeTextEditor) {
      return;
    }

    const document = vscode.window.activeTextEditor.document;
    const text = document.getText();

    try {
      // 使用 unified 处理流程转换 Org 到 HTML
      const processor = unified()
        .use(uniorgParse as any)
        .use(uniorgRehype as any)
        .use(rehypeStringify as any);

      const html = processor.processSync(text).toString();

      // 添加基本的样式
      const styledHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                padding: 2em;
                max-width: 800px;
                margin: 0 auto;
              }
              h1, h2, h3, h4, h5, h6 {
                margin-top: 1.5em;
                margin-bottom: 0.5em;
              }
              code {
                background-color: #f0f0f0;
                padding: 0.2em 0.4em;
                border-radius: 3px;
              }
              pre {
                background-color: #f0f0f0;
                padding: 1em;
                border-radius: 5px;
                overflow-x: auto;
              }
              blockquote {
                border-left: 4px solid #ddd;
                margin: 0;
                padding-left: 1em;
                color: #666;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 0.5em;
              }
              th {
                background-color: #f5f5f5;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      currentPanel.webview.html = styledHtml;
    } catch (error) {
      vscode.window.showErrorMessage(`Error previewing Org file: ${error}`);
    }
  }
}

export function deactivate() {} 