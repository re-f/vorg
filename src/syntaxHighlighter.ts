import * as vscode from 'vscode';

/**
 * 语法高亮器类
 * 提供 Org-mode 语法的高级渲染功能，自动跟随 VS Code 主题
 */
export class OrgSyntaxHighlighter {
    private static instance: OrgSyntaxHighlighter;
    private decorationTypes: Map<string, vscode.TextEditorDecorationType>;
    private currentTheme: vscode.ColorThemeKind | undefined;

    private constructor() {
        this.decorationTypes = new Map();
        this.currentTheme = vscode.window.activeColorTheme.kind;
        this.initializeDecorationTypes();
        
        // 监听主题变化
        vscode.window.onDidChangeActiveColorTheme((theme) => {
            if (theme.kind !== this.currentTheme) {
                this.currentTheme = theme.kind;
                this.updateDecorationTypes();
                this.refreshAllEditors();
            }
        });
    }

    public static getInstance(): OrgSyntaxHighlighter {
        if (!OrgSyntaxHighlighter.instance) {
            OrgSyntaxHighlighter.instance = new OrgSyntaxHighlighter();
        }
        return OrgSyntaxHighlighter.instance;
    }

    /**
     * 获取当前主题的颜色配置
     */
    private getThemeColors() {
        const isDark = this.currentTheme === vscode.ColorThemeKind.Dark || this.currentTheme === vscode.ColorThemeKind.HighContrast;
        
        if (isDark) {
            return {
                todo: { color: '#F44747', background: 'rgba(244, 71, 71, 0.15)' },
                done: { color: '#4EC9B0', background: 'rgba(78, 201, 176, 0.15)' },
                tags: { color: '#C586C0', background: 'rgba(197, 134, 192, 0.15)' },
                timestamp: { color: '#B5CEA8', background: 'rgba(181, 206, 168, 0.15)' },
                link: { color: '#9CDCFE' },
                codeBlock: { background: 'rgba(45, 45, 45, 0.4)', border: '0 0 0 4px solid #CE9178' },
                quoteBlock: { background: 'rgba(181, 206, 168, 0.15)', border: '0 0 0 4px solid #B5CEA8' },
                tableRow: { background: 'rgba(220, 220, 170, 0.15)' },
                math: { color: '#C586C0', background: 'rgba(197, 134, 192, 0.15)' }
            };
        } else {
            return {
                todo: { color: '#e45649', background: 'rgba(228, 86, 73, 0.15)' },
                done: { color: '#50a14f', background: 'rgba(80, 161, 79, 0.15)' },
                tags: { color: '#a626a4', background: 'rgba(166, 38, 164, 0.15)' },
                timestamp: { color: '#50a14f', background: 'rgba(80, 161, 79, 0.15)' },
                link: { color: '#4078f2' },
                codeBlock: { background: 'rgba(245, 245, 245, 0.6)', border: '0 0 0 4px solid #986801' },
                quoteBlock: { background: 'rgba(80, 161, 79, 0.15)', border: '0 0 0 4px solid #50a14f' },
                tableRow: { background: 'rgba(255, 215, 0, 0.15)' },
                math: { color: '#a626a4', background: 'rgba(166, 38, 164, 0.15)' }
            };
        }
    }

    /**
     * 初始化装饰类型
     */
    private initializeDecorationTypes(): void {
        this.updateDecorationTypes();
    }

    /**
     * 更新装饰类型（主题变化时调用）
     */
    private updateDecorationTypes(): void {
        // 清理旧的装饰类型
        this.decorationTypes.forEach((decorationType) => {
            decorationType.dispose();
        });
        this.decorationTypes.clear();

        const colors = this.getThemeColors();

        // TODO 状态高亮
        this.decorationTypes.set('todo', vscode.window.createTextEditorDecorationType({
            color: colors.todo.color,
            fontWeight: 'bold',
            backgroundColor: colors.todo.background,
            borderRadius: '3px'
        }));

        // DONE 状态高亮
        this.decorationTypes.set('done', vscode.window.createTextEditorDecorationType({
            color: colors.done.color,
            fontWeight: 'bold',
            backgroundColor: colors.done.background,
            borderRadius: '3px'
        }));

        // 标签高亮
        this.decorationTypes.set('tags', vscode.window.createTextEditorDecorationType({
            color: colors.tags.color,
            fontStyle: 'italic',
            backgroundColor: colors.tags.background,
            borderRadius: '3px'
        }));

        // 时间戳高亮
        this.decorationTypes.set('timestamp', vscode.window.createTextEditorDecorationType({
            color: colors.timestamp.color,
            backgroundColor: colors.timestamp.background,
            borderRadius: '3px'
        }));

        // 链接高亮
        this.decorationTypes.set('link', vscode.window.createTextEditorDecorationType({
            color: colors.link.color,
            textDecoration: 'underline',
            cursor: 'pointer'
        }));

        // 代码块高亮
        this.decorationTypes.set('code-block', vscode.window.createTextEditorDecorationType({
            backgroundColor: colors.codeBlock.background,
            border: colors.codeBlock.border,
            borderRadius: '3px'
        }));

        // 引用块高亮
        this.decorationTypes.set('quote-block', vscode.window.createTextEditorDecorationType({
            backgroundColor: colors.quoteBlock.background,
            border: colors.quoteBlock.border,
            fontStyle: 'italic',
            borderRadius: '3px'
        }));

        // 表格行高亮
        this.decorationTypes.set('table-row', vscode.window.createTextEditorDecorationType({
            backgroundColor: colors.tableRow.background
        }));

        // 数学公式高亮
        this.decorationTypes.set('math', vscode.window.createTextEditorDecorationType({
            color: colors.math.color,
            backgroundColor: colors.math.background,
            borderRadius: '3px'
        }));
    }

    /**
     * 刷新所有编辑器的语法高亮
     */
    private refreshAllEditors(): void {
        vscode.window.visibleTextEditors.forEach(editor => {
            if (editor.document.languageId === 'org') {
                this.applySyntaxHighlighting(editor);
            }
        });
    }

    /**
     * 应用语法高亮
     * @param editor 文本编辑器
     */
    public applySyntaxHighlighting(editor: vscode.TextEditor): void {
        if (editor.document.languageId !== 'org') {
            return;
        }

        const text = editor.document.getText();
        const lines = text.split('\n');

        // 清除之前的装饰
        this.clearDecorations(editor);

        // 应用各种装饰
        this.applyTodoHighlighting(editor, lines);
        this.applyTagHighlighting(editor, lines);
        this.applyTimestampHighlighting(editor, lines);
        this.applyLinkHighlighting(editor, lines);
        this.applyCodeBlockHighlighting(editor, lines);
        this.applyQuoteBlockHighlighting(editor, lines);
        this.applyTableHighlighting(editor, lines);
        this.applyMathHighlighting(editor, lines);
    }

    /**
     * 清除所有装饰
     * @param editor 文本编辑器
     */
    private clearDecorations(editor: vscode.TextEditor): void {
        this.decorationTypes.forEach((decorationType) => {
            editor.setDecorations(decorationType, []);
        });
    }

    /**
     * 应用 TODO 状态高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyTodoHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const todoRanges: vscode.Range[] = [];
        const doneRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            const todoMatch = line.match(/\b(TODO|NEXT|WAITING)\b/);
            const doneMatch = line.match(/\b(DONE|CANCELLED)\b/);

            if (todoMatch) {
                const startPos = new vscode.Position(lineIndex, todoMatch.index!);
                const endPos = new vscode.Position(lineIndex, todoMatch.index! + todoMatch[0].length);
                todoRanges.push(new vscode.Range(startPos, endPos));
            }

            if (doneMatch) {
                const startPos = new vscode.Position(lineIndex, doneMatch.index!);
                const endPos = new vscode.Position(lineIndex, doneMatch.index! + doneMatch[0].length);
                doneRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const todoType = this.decorationTypes.get('todo')!;
        const doneType = this.decorationTypes.get('done')!;
        editor.setDecorations(todoType, todoRanges);
        editor.setDecorations(doneType, doneRanges);
    }

    /**
     * 应用标签高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyTagHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const tagRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            const tagMatches = line.matchAll(/:[a-zA-Z_][a-zA-Z0-9_]*:/g);
            for (const match of tagMatches) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                tagRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const tagType = this.decorationTypes.get('tags')!;
        editor.setDecorations(tagType, tagRanges);
    }

    /**
     * 应用时间戳高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyTimestampHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const timestampRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 匹配各种时间戳格式
            const timestampMatches = line.matchAll(/[<\[](\d{4}-\d{2}-\d{2}(?:\s+\w{3})?(?:\s+\d{2}:\d{2})?(?:-\d{2}:\d{2})?(?:\s+[+\-]\d+[dwmy])*)[>\]]/g);
            for (const match of timestampMatches) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                timestampRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const timestampType = this.decorationTypes.get('timestamp')!;
        editor.setDecorations(timestampType, timestampRanges);
    }

    /**
     * 应用链接高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyLinkHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const linkRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 匹配 Org-mode 链接格式
            const linkMatches = line.matchAll(/\[\[([^\]]+)\](?:\[([^\]]+)\])?\]/g);
            for (const match of linkMatches) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                linkRanges.push(new vscode.Range(startPos, endPos));
            }

            // 匹配裸链接
            const urlMatches = line.matchAll(/https?:\/\/[^\s]+/g);
            for (const match of urlMatches) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                linkRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const linkType = this.decorationTypes.get('link')!;
        editor.setDecorations(linkType, linkRanges);
    }

    /**
     * 应用代码块高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyCodeBlockHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const codeBlockRanges: vscode.Range[] = [];
        let inCodeBlock = false;
        let blockStart = 0;

        lines.forEach((line, lineIndex) => {
            if (line.trim().match(/^#\+BEGIN_SRC/)) {
                inCodeBlock = true;
                blockStart = lineIndex;
            } else if (line.trim().match(/^#\+END_SRC/) && inCodeBlock) {
                inCodeBlock = false;
                const startPos = new vscode.Position(blockStart, 0);
                const endPos = new vscode.Position(lineIndex, line.length);
                codeBlockRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const codeBlockType = this.decorationTypes.get('code-block')!;
        editor.setDecorations(codeBlockType, codeBlockRanges);
    }

    /**
     * 应用引用块高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyQuoteBlockHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const quoteBlockRanges: vscode.Range[] = [];
        let inQuoteBlock = false;
        let blockStart = 0;

        lines.forEach((line, lineIndex) => {
            if (line.trim().match(/^#\+BEGIN_QUOTE/)) {
                inQuoteBlock = true;
                blockStart = lineIndex;
            } else if (line.trim().match(/^#\+END_QUOTE/) && inQuoteBlock) {
                inQuoteBlock = false;
                const startPos = new vscode.Position(blockStart, 0);
                const endPos = new vscode.Position(lineIndex, line.length);
                quoteBlockRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const quoteBlockType = this.decorationTypes.get('quote-block')!;
        editor.setDecorations(quoteBlockType, quoteBlockRanges);
    }

    /**
     * 应用表格高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyTableHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const tableRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            if (line.trim().match(/^\|.*\|$/)) {
                const startPos = new vscode.Position(lineIndex, 0);
                const endPos = new vscode.Position(lineIndex, line.length);
                tableRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const tableType = this.decorationTypes.get('table-row')!;
        editor.setDecorations(tableType, tableRanges);
    }

    /**
     * 应用数学公式高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyMathHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const mathRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 行内数学公式
            const inlineMathMatches = line.matchAll(/\$([^$]+)\$/g);
            for (const match of inlineMathMatches) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                mathRanges.push(new vscode.Range(startPos, endPos));
            }

            // 块级数学公式
            if (line.trim().match(/^\$\$/) || line.trim().match(/\$\$$/)) {
                const startPos = new vscode.Position(lineIndex, 0);
                const endPos = new vscode.Position(lineIndex, line.length);
                mathRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const mathType = this.decorationTypes.get('math')!;
        editor.setDecorations(mathType, mathRanges);
    }

    /**
     * 销毁所有装饰类型
     */
    public dispose(): void {
        this.decorationTypes.forEach((decorationType) => {
            decorationType.dispose();
        });
        this.decorationTypes.clear();
    }
} 