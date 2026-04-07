import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureTestReady } from './testUtils';
import { OrgSymbolIndexService } from '../../services/orgSymbolIndexService';

type QuickPickChangeHandler = (value: string) => void;
type QuickPickSimpleHandler = () => void;

interface MockQuickPick<T extends vscode.QuickPickItem> {
  items: readonly T[];
  activeItems: readonly T[];
  selectedItems: readonly T[];
  title: string;
  placeholder: string;
  ignoreFocusOut: boolean;
  matchOnDescription: boolean;
  matchOnDetail: boolean;
  sortByLabel: boolean;
  onDidChangeValue(handler: QuickPickChangeHandler): vscode.Disposable;
  onDidAccept(handler: QuickPickSimpleHandler): vscode.Disposable;
  onDidHide(handler: QuickPickSimpleHandler): vscode.Disposable;
  show(): void;
  dispose(): void;
}

function createMockQuickPick<T extends vscode.QuickPickItem>(
  query: string,
  onAfterFilter: (items: readonly T[], quickPick: MockQuickPick<T>) => void
): MockQuickPick<T> {
  let changeHandler: QuickPickChangeHandler = () => { };
  let acceptHandler: QuickPickSimpleHandler = () => { };
  let hideHandler: QuickPickSimpleHandler = () => { };

  const mock: MockQuickPick<T> = {
    items: [],
    activeItems: [],
    selectedItems: [],
    title: '',
    placeholder: '',
    ignoreFocusOut: false,
    matchOnDescription: false,
    matchOnDetail: false,
    sortByLabel: true,
    onDidChangeValue(handler: QuickPickChangeHandler) {
      changeHandler = handler;
      return new vscode.Disposable(() => { });
    },
    onDidAccept(handler: QuickPickSimpleHandler) {
      acceptHandler = handler;
      return new vscode.Disposable(() => { });
    },
    onDidHide(handler: QuickPickSimpleHandler) {
      hideHandler = handler;
      return new vscode.Disposable(() => { });
    },
    show() {
      changeHandler(query);
      onAfterFilter(mock.items, mock);
      mock.selectedItems = mock.activeItems;
      acceptHandler();
      hideHandler();
    },
    dispose() { },
  };

  return mock;
}

suite('SymbolQuickPickCommands Integration Test Suite', () => {
  suiteSetup(async () => {
    await ensureTestReady();
  });

  async function openOrgEditor(content: string) {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'org',
    });
    const editor = await vscode.window.showTextDocument(doc);
    return { doc, editor };
  }

  test('goToSymbolInEditor should keep pinyin-matched item visible in quick pick', async () => {
    const { editor } = await openOrgEditor(`* 项目\n** 测试标题\n`);

    const originalCreateQuickPick = vscode.window.createQuickPick;
    let capturedItems: readonly vscode.QuickPickItem[] = [];

    Object.defineProperty(vscode.window, 'createQuickPick', {
      value: () => createMockQuickPick('csbt', (items) => {
        capturedItems = items;
      }),
      configurable: true,
    });

    try {
      await vscode.commands.executeCommand('vorg.goToSymbolInEditor');
    } finally {
      Object.defineProperty(vscode.window, 'createQuickPick', {
        value: originalCreateQuickPick,
        configurable: true,
      });
    }

    assert.ok(capturedItems.length > 0, 'should show at least one item after pinyin filtering');
    assert.strictEqual(capturedItems[0].label, '测试标题');
    assert.strictEqual(capturedItems[0].alwaysShow, true);
    assert.strictEqual(editor.selection.active.line, 1);
  });

  test('goToSymbolInWorkspace should keep pinyin-matched item visible in quick pick', async () => {
    await openOrgEditor(`* 当前文件\n`);

    const originalCreateQuickPick = vscode.window.createQuickPick;
    const indexService = OrgSymbolIndexService.getInstance();
    const originalGetAllSymbols = indexService.getAllSymbols.bind(indexService);
    const tempFilePath = path.join(os.tmpdir(), `vorg-quickpick-${Date.now()}.org`);
    let capturedItems: readonly vscode.QuickPickItem[] = [];

    fs.writeFileSync(tempFilePath, '* 测试标题\n');

    Object.defineProperty(vscode.window, 'createQuickPick', {
      value: () => createMockQuickPick('csbt', (items) => {
        capturedItems = items;
      }),
      configurable: true,
    });

    (indexService as any).getAllSymbols = async () => [{
      displayName: '测试标题',
      text: '测试标题',
      pinyinText: 'ceshibiaoti csbt',
      pinyinDisplayName: 'ceshibiaoti csbt',
      level: 1,
      todoKeyword: null,
      tags: [],
      uri: vscode.Uri.file(tempFilePath),
      line: 0,
      symbolKind: vscode.SymbolKind.Namespace,
      relativePath: 'notes/pinyin-search.org',
    }];

    try {
      await vscode.commands.executeCommand('vorg.goToSymbolInWorkspace');
    } finally {
      Object.defineProperty(vscode.window, 'createQuickPick', {
        value: originalCreateQuickPick,
        configurable: true,
      });
      (indexService as any).getAllSymbols = originalGetAllSymbols;
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    assert.ok(capturedItems.length > 0, 'should show workspace item after pinyin filtering');
    assert.strictEqual(capturedItems[0].label, '测试标题');
    assert.strictEqual(capturedItems[0].description, 'notes/pinyin-search.org');
    assert.strictEqual(capturedItems[0].alwaysShow, true);
  });
});
