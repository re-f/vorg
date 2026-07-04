import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';
import { SyntaxHighlighter } from '../../syntaxHighlighter';
import { ConfigService } from '../../services/configService';

/**
 * SyntaxHighlighter 强调标记隐藏/装饰集成测试
 *
 * 注意：VS Code 没有公开的 API 可以读取某个 TextEditorDecorationType 当前被应用到哪些
 * Range 上，所以这里主要验证：
 * 1. `vorg.hideEmphasisMarkers` 配置能正确接入 ConfigService；
 * 2. 在真实的 vscode.TextEditor 上、不同配置值下调用 `applyHighlighting` 均不抛出异常，
 *    且不会意外修改文档内容（装饰是纯视觉层，不应改变文本）；
 * 3. 光标移动、文档内容变化等事件触发的高亮刷新链路可以正常走完。
 */
suite('SyntaxHighlighter Emphasis Integration Test Suite', function () {
    this.timeout(10000);

    let originalConfigInstance: ConfigService;

    suiteSetup(async () => {
        await ensureTestReady();
        originalConfigInstance = ConfigService.getInstance();
    });

    teardown(() => {
        // 恢复原始配置实例，避免影响其他测试套件
        ConfigService.setInstance(originalConfigInstance);
    });

    vscode.window.showInformationMessage('Start SyntaxHighlighter emphasis integration tests.');

    async function setupTest(content: string) {
        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        const editor = await vscode.window.showTextDocument(doc);
        return { doc, editor };
    }

    const sampleContent = [
        '* 标题',
        '这段文本包含 *粗体* /斜体/ _下划线_ +删除线+ =逐字= ~代码~ 混合内容',
    ].join('\n');

    test('hideEmphasisMarkers=false 时 applyHighlighting 不应修改文档内容', async () => {
        ConfigService.setInstance(new ConfigService(undefined, undefined, undefined, false));

        const { doc, editor } = await setupTest(sampleContent);
        const highlighter = new SyntaxHighlighter();

        assert.doesNotThrow(() => highlighter.applyHighlighting(editor));
        assert.strictEqual(doc.getText(), sampleContent);

        highlighter.dispose();
    });

    test('hideEmphasisMarkers=true 时 applyHighlighting 不应修改文档内容', async () => {
        ConfigService.setInstance(new ConfigService(undefined, undefined, undefined, true));

        const { doc, editor } = await setupTest(sampleContent);
        const highlighter = new SyntaxHighlighter();

        assert.doesNotThrow(() => highlighter.applyHighlighting(editor));
        assert.strictEqual(doc.getText(), sampleContent);

        highlighter.dispose();
    });

    test('光标移动到标记范围内外时重复调用 applyHighlighting 均不应抛出异常', async () => {
        ConfigService.setInstance(new ConfigService(undefined, undefined, undefined, true));

        const { doc, editor } = await setupTest(sampleContent);
        const highlighter = new SyntaxHighlighter();

        // 光标落在 "*粗体*" 标记内部
        const insideMarkerPos = new vscode.Position(1, 8);
        editor.selection = new vscode.Selection(insideMarkerPos, insideMarkerPos);
        assert.doesNotThrow(() => highlighter.applyHighlighting(editor));

        // 光标移出标记范围
        const outsidePos = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(outsidePos, outsidePos);
        assert.doesNotThrow(() => highlighter.applyHighlighting(editor));

        assert.strictEqual(doc.getText(), sampleContent);

        highlighter.dispose();
    });

    test('ConfigService 应正确读取 hideEmphasisMarkers 默认值与自定义值', () => {
        const defaultConfig = new ConfigService();
        assert.strictEqual(defaultConfig.getHideEmphasisMarkers(), false);

        const enabledConfig = new ConfigService(undefined, undefined, undefined, true);
        assert.strictEqual(enabledConfig.getHideEmphasisMarkers(), true);
    });

    test('refreshHighlighting 后再次 applyHighlighting 不应抛出异常（模拟配置变化刷新）', async () => {
        ConfigService.setInstance(new ConfigService(undefined, undefined, undefined, false));

        const { editor } = await setupTest(sampleContent);
        const highlighter = new SyntaxHighlighter();
        highlighter.applyHighlighting(editor);

        // 模拟用户开启配置后触发的刷新流程
        ConfigService.setInstance(new ConfigService(undefined, undefined, undefined, true));
        assert.doesNotThrow(() => {
            highlighter.refreshHighlighting();
            highlighter.applyHighlighting(editor);
        });

        highlighter.dispose();
    });
});
