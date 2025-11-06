import * as vscode from 'vscode';
import { HeadingParser } from '../parsers/headingParser';

/**
 * 标题 CodeLens 提供者
 * 在标题行上方显示 Promote 和 Demote 按钮
 */
export class HeadingCodeLensProvider implements vscode.CodeLensProvider, vscode.Disposable {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    // 监听配置变化
    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('vorg.showCodeLens')) {
          this._onDidChangeCodeLenses.fire();
        }
      })
    );
  }

  dispose() {
    this._onDidChangeCodeLenses.dispose();
    this._disposables.forEach(d => d.dispose());
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    // 检查配置，如果禁用则返回空数组
    const config = vscode.workspace.getConfiguration('vorg');
    const showCodeLens = config.get<boolean>('showCodeLens', true);
    
    if (!showCodeLens) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];

    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingParser.parseHeading(line.text);

      // 如果是标题行，添加 CodeLens
      if (headingInfo.level > 0) {
        const range = new vscode.Range(lineNumber, 0, lineNumber, 0);

        // 如果不是1级标题，显示 Promote 按钮
        if (headingInfo.level > 1) {
          lenses.push(
            new vscode.CodeLens(range, {
              title: '$(arrow-up) Promote',
              command: 'vorg.promoteSubtree',
              arguments: [lineNumber]
            })
          );
        }

        // 总是显示 Demote 按钮
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(arrow-down) Demote',
            command: 'vorg.demoteSubtree',
            arguments: [lineNumber]
          })
        );
      }
    }

    return lenses;
  }

  public resolveCodeLens?(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.CodeLens | Thenable<vscode.CodeLens> {
    return codeLens;
  }
}

