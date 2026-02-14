
import * as assert from 'assert';
import * as vscode from 'vscode';
import { OrgCompletionProvider } from '../../completion/orgCompletionProvider';
import { OrgSymbolIndexService } from '../../services/orgSymbolIndexService';
import { ConfigService } from '../../services/configService';

suite('OrgCompletionProvider 标签补全测试', () => {
    let provider: OrgCompletionProvider;
    let mockIndexService: any;

    setup(() => {
        // 创建 mock index service
        mockIndexService = {
            getAllTags: () => {
                const map = new Map<string, number>();
                map.set('work', 5);
                map.set('home', 3);
                map.set('project', 10);
                return map;
            },
            getAllSymbols: async () => []
        };

        // Mock OrgSymbolIndexService.getInstance
        (OrgSymbolIndexService as any).getInstance = function () {
            return mockIndexService;
        };

        provider = new OrgCompletionProvider();
    });

    function createMockDocument(text: string): vscode.TextDocument {
        return {
            lineAt: (line: number) => ({
                text: text,
                lineNumber: line,
                range: new vscode.Range(line, 0, line, text.length)
            }),
            lineCount: 1,
            uri: vscode.Uri.file('/test.org'),
            getText: () => text
        } as any;
    }

    test('第一个标签补全触发', async () => {
        const text = '* Headline :';
        const doc = createMockDocument(text);
        const pos = new vscode.Position(0, text.length);

        const items = await provider.provideCompletionItems(doc, pos, {} as any, { triggerCharacter: ':' } as any);
        assert.ok(items && items.length > 0, '应该触发补全');
        assert.ok(items!.some(item => item.label === 'work'), '应该包含 "work" 标签');
    });

    test('第二个标签补全触发 (复现问题)', async () => {
        const text = '* Headline :tag1:';
        const doc = createMockDocument(text);
        const pos = new vscode.Position(0, text.length);

        const items = await provider.provideCompletionItems(doc, pos, {} as any, { triggerCharacter: ':' } as any);
        assert.ok(items && items.length > 0, '第二个标签也应该触发补全');
        assert.ok(items!.some(item => item.label === 'work'), '应该包含 "work" 标签');
    });

    test('带前缀的第二个标签补全触发', async () => {
        const text = '* Headline :tag1:w';
        const doc = createMockDocument(text);
        const pos = new vscode.Position(0, text.length);

        const items = await provider.provideCompletionItems(doc, pos, {} as any, { triggerCharacter: 'w' } as any);
        assert.ok(items && items.length > 0, '带前缀的第二个标签应该触发补全');
        const workItem = items!.find(item => item.label === 'work');
        assert.ok(workItem, '应该找到 "work"');
    });
});
