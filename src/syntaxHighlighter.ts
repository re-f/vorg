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
     * 使用 VSCode 主题中程序语言的保留字样式
     */
    private getThemeColors() {
        const isDark = this.currentTheme === vscode.ColorThemeKind.Dark || this.currentTheme === vscode.ColorThemeKind.HighContrast;
        
        if (isDark) {
            return {
                // TODO/DONE 状态 - 使用关键字颜色
                todo: { color: '#569CD6', background: 'rgba(86, 156, 214, 0.15)' },  // 蓝色关键字
                done: { color: '#4EC9B0', background: 'rgba(78, 201, 176, 0.15)' },   // 青色关键字
                // 标签 - 使用类型名颜色
                tags: { color: '#4EC9B0', background: 'rgba(78, 201, 176, 0.15)' },
                // 属性名 - 使用控制流关键字颜色
                properties: { color: '#C586C0', background: 'rgba(197, 134, 192, 0.15)' },
                // 块开始/结束 - 使用控制流关键字颜色
                blockKeywords: { color: '#C586C0', background: 'rgba(197, 134, 192, 0.15)' },
                // 指令关键字 - 使用低调的注释色调
                directives: { color: '#6A9955', background: 'rgba(106, 153, 85, 0.08)' },
                // 时间戳 - 使用字符串颜色
                timestamp: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.15)' },
                // 链接 - 使用注释颜色但更亮
                link: { color: '#9CDCFE' },
                // 链接hover状态
                linkHover: { color: '#569CD6', background: 'rgba(86, 156, 214, 0.2)' },
                // 链接描述文本
                linkDescription: { color: '#DCDCAA' },
                // 链接描述hover状态
                linkDescriptionHover: { background: 'rgba(220, 220, 170, 0.2)' },
                // 代码块 - 使用深色背景
                codeBlock: { background: 'rgba(45, 45, 45, 0.4)', border: '0 0 0 4px solid #CE9178' },
                // 引用块 - 使用注释色调
                quoteBlock: { background: 'rgba(106, 153, 85, 0.15)', border: '0 0 0 4px solid #6A9955' },
                // 表格行
                tableRow: { background: 'rgba(220, 220, 170, 0.15)' },
                // 数学公式 - 使用字符串颜色
                math: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.15)' },
                

                
                // 文本格式 - 新增
                bold: { color: '#FFFFFF', fontWeight: 'bold' },
                italic: { color: '#DCDCAA', fontStyle: 'italic' },
                underline: { color: '#9CDCFE', textDecoration: 'underline' },
                strikethrough: { color: '#808080', textDecoration: 'line-through' },
                monospace: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.15)' }
            };
        } else {
            return {
                // 亮色主题 - 使用传统编程语言色彩
                todo: { color: '#0000FF', background: 'rgba(0, 0, 255, 0.15)' },        // 蓝色关键字
                done: { color: '#008000', background: 'rgba(0, 128, 0, 0.15)' },        // 绿色关键字
                tags: { color: '#008080', background: 'rgba(0, 128, 128, 0.15)' },
                properties: { color: '#800080', background: 'rgba(128, 0, 128, 0.15)' },
                blockKeywords: { color: '#800080', background: 'rgba(128, 0, 128, 0.15)' },
                directives: { color: '#708090', background: 'rgba(112, 128, 144, 0.08)' },
                timestamp: { color: '#A31515', background: 'rgba(163, 21, 21, 0.15)' },  // 字符串红色
                link: { color: '#0000EE' },
                // 链接hover状态  
                linkHover: { color: '#0000FF', background: 'rgba(0, 0, 255, 0.2)' },
                // 链接描述文本
                linkDescription: { color: '#8B4513' },
                // 链接描述hover状态
                linkDescriptionHover: { background: 'rgba(139, 69, 19, 0.2)' },
                codeBlock: { background: 'rgba(245, 245, 245, 0.6)', border: '0 0 0 4px solid #A31515' },
                quoteBlock: { background: 'rgba(0, 128, 0, 0.15)', border: '0 0 0 4px solid #008000' },
                tableRow: { background: 'rgba(255, 215, 0, 0.15)' },
                math: { color: '#A31515', background: 'rgba(163, 21, 21, 0.15)' },
                

                
                // 文本格式 - 新增
                bold: { color: '#000000', fontWeight: 'bold' },
                italic: { color: '#8B4513', fontStyle: 'italic' },
                underline: { color: '#0000EE', textDecoration: 'underline' },
                strikethrough: { color: '#808080', textDecoration: 'line-through' },
                monospace: { color: '#A31515', background: 'rgba(163, 21, 21, 0.15)' }
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
            borderRadius: '3px',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            overviewRulerColor: colors.tags.color
        }));

        // 时间戳高亮
        this.decorationTypes.set('timestamp', vscode.window.createTextEditorDecorationType({
            color: colors.timestamp.color,
            backgroundColor: colors.timestamp.background,
            borderRadius: '3px'
        }));

        // 链接URL部分高亮（带下划线）
        this.decorationTypes.set('link-url', vscode.window.createTextEditorDecorationType({
            color: colors.link.color,
            textDecoration: 'underline',
            cursor: 'pointer'
        }));

        // 链接描述部分高亮（加粗，明确移除下划线）
        this.decorationTypes.set('link-description', vscode.window.createTextEditorDecorationType({
            color: colors.linkDescription.color,
            fontWeight: 'bold',
            cursor: 'pointer',
            textDecoration: 'none' // 明确移除所有文本装饰
        }));

        // 完整链接高亮（用于无描述的链接）
        this.decorationTypes.set('link-full', vscode.window.createTextEditorDecorationType({
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

        // 属性名高亮
        this.decorationTypes.set('properties', vscode.window.createTextEditorDecorationType({
            color: colors.properties.color,
            backgroundColor: colors.properties.background,
            borderRadius: '3px'
        }));

        // 块关键字高亮 (BEGIN_*, END_*)
        this.decorationTypes.set('block-keywords', vscode.window.createTextEditorDecorationType({
            color: colors.blockKeywords.color,
            fontWeight: 'bold',
            backgroundColor: colors.blockKeywords.background,
            borderRadius: '3px'
        }));

        // 指令关键字高亮 (#+TITLE:, #+AUTHOR: 等)
        this.decorationTypes.set('directives', vscode.window.createTextEditorDecorationType({
            color: colors.directives.color,
            backgroundColor: colors.directives.background,
            borderRadius: '3px'
        }));

        // 文本格式高亮
        this.decorationTypes.set('bold', vscode.window.createTextEditorDecorationType({
            color: colors.bold.color,
            fontWeight: colors.bold.fontWeight as any
        }));

        this.decorationTypes.set('italic', vscode.window.createTextEditorDecorationType({
            color: colors.italic.color,
            fontStyle: colors.italic.fontStyle as any
        }));

        this.decorationTypes.set('underline', vscode.window.createTextEditorDecorationType({
            color: colors.underline.color,
            textDecoration: colors.underline.textDecoration
        }));

        this.decorationTypes.set('strikethrough', vscode.window.createTextEditorDecorationType({
            color: colors.strikethrough.color,
            textDecoration: colors.strikethrough.textDecoration
        }));

        this.decorationTypes.set('monospace', vscode.window.createTextEditorDecorationType({
            color: colors.monospace.color,
            backgroundColor: colors.monospace.background,
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
        this.applyTimestampHighlighting(editor, lines);
        this.applyTextFormattingHighlighting(editor, lines);  // 新增文本格式高亮
        this.applyCodeBlockHighlighting(editor, lines);
        this.applyQuoteBlockHighlighting(editor, lines);
        this.applyTableHighlighting(editor, lines);
        this.applyMathHighlighting(editor, lines);
        this.applyPropertiesHighlighting(editor, lines);
        this.applyBlockKeywordsHighlighting(editor, lines);
        this.applyDirectivesHighlighting(editor, lines);
        this.applyLinkHighlighting(editor, lines);
        
        // 最后应用标签高亮，确保覆盖所有其他样式
        this.applyTagHighlighting(editor, lines);
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
            // Debug: 打印行内容
            if (line.includes(':')) {
                console.log(`Debug Tag Line ${lineIndex}: "${line}"`);
            }
            
            // 修复连续标签匹配问题，处理共享冒号的情况
            let index = 0;
            while (index < line.length) {
                const colonIndex = line.indexOf(':', index);
                if (colonIndex === -1) break;
                
                // 寻找标签结束的冒号
                const tagEndIndex = line.indexOf(':', colonIndex + 1);
                if (tagEndIndex === -1) break;
                
                // 提取标签内容
                const tagContent = line.substring(colonIndex + 1, tagEndIndex);
                // 验证标签内容是否有效（只包含字母、数字、下划线）
                if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tagContent)) {
                    const startPos = new vscode.Position(lineIndex, colonIndex);
                    const endPos = new vscode.Position(lineIndex, tagEndIndex + 1);
                    tagRanges.push(new vscode.Range(startPos, endPos));
                    
                    // Debug: 打印找到的标签
                    const tagText = `:${tagContent}:`;
                    console.log(`Debug Tag Found: "${tagText}" at line ${lineIndex}, cols ${colonIndex}-${tagEndIndex + 1}`);
                    
                    // 关键修复：从标签结束的冒号位置继续搜索，而不是跳过它
                    // 这样可以处理 :tag1:tag2: 这种连续标签的情况
                    index = tagEndIndex;
                } else {
                    // 如果不是有效标签，从下一个字符继续搜索
                    index = colonIndex + 1;
                }
            }
        });

        console.log(`Debug Tag Total ranges found: ${tagRanges.length}`);
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
     * 应用文本格式高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyTextFormattingHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const boldRanges: vscode.Range[] = [];
        const italicRanges: vscode.Range[] = [];
        const underlineRanges: vscode.Range[] = [];
        const strikethroughRanges: vscode.Range[] = [];
        const monospaceRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 粗体 *text*
            const boldMatches = line.matchAll(/(?<!\w)\*([^*\s](?:[^*]*[^*\s])?)\*(?!\w)/g);
            for (const match of boldMatches) {
                const startPos = new vscode.Position(lineIndex, match.index! + 1); // 跳过*
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length - 1); // 跳过*
                boldRanges.push(new vscode.Range(startPos, endPos));
            }

            // 斜体 /text/
            const italicMatches = line.matchAll(/(?<!\w)\/([^\/\s](?:[^\/]*[^\/\s])?)\/(?!\w)/g);
            for (const match of italicMatches) {
                const startPos = new vscode.Position(lineIndex, match.index! + 1); // 跳过/
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length - 1); // 跳过/
                italicRanges.push(new vscode.Range(startPos, endPos));
            }

            // 下划线 _text_
            const underlineMatches = line.matchAll(/(?<!\w)_([^_\s](?:[^_]*[^_\s])?)_(?!\w)/g);
            for (const match of underlineMatches) {
                const startPos = new vscode.Position(lineIndex, match.index! + 1); // 跳过_
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length - 1); // 跳过_
                underlineRanges.push(new vscode.Range(startPos, endPos));
            }

            // 删除线 +text+
            const strikethroughMatches = line.matchAll(/(?<!\w)\+([^+\s](?:[^+]*[^+\s])?)\+(?!\w)/g);
            for (const match of strikethroughMatches) {
                const startPos = new vscode.Position(lineIndex, match.index! + 1); // 跳过+
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length - 1); // 跳过+
                strikethroughRanges.push(new vscode.Range(startPos, endPos));
            }

            // 等宽字体 =text= 和 ~text~
            const monospaceMatches = line.matchAll(/(?<!\w)([=~])([^=~\s](?:[^=~]*[^=~\s])?)\1(?!\w)/g);
            for (const match of monospaceMatches) {
                const startPos = new vscode.Position(lineIndex, match.index! + 1); // 跳过=或~
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length - 1); // 跳过=或~
                monospaceRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        // 应用装饰
        const boldType = this.decorationTypes.get('bold')!;
        const italicType = this.decorationTypes.get('italic')!;
        const underlineType = this.decorationTypes.get('underline')!;
        const strikethroughType = this.decorationTypes.get('strikethrough')!;
        const monospaceType = this.decorationTypes.get('monospace')!;

        editor.setDecorations(boldType, boldRanges);
        editor.setDecorations(italicType, italicRanges);
        editor.setDecorations(underlineType, underlineRanges);
        editor.setDecorations(strikethroughType, strikethroughRanges);
        editor.setDecorations(monospaceType, monospaceRanges);
    }

    /**
     * 应用链接高亮
     * @param editor 文本编辑器
     * @param lines 文档行数组
     */
    private applyLinkHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const linkUrlRanges: vscode.Range[] = [];
        const linkDescriptionRanges: vscode.Range[] = [];
        const linkFullRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 先处理带描述的链接格式 [[url][description]]
            const linkWithDescMatches = [...line.matchAll(/\[\[([^\]]+)\]\[([^\]]+)\]\]/g)];
            const processedRanges: Array<{start: number, end: number}> = [];
            
            for (const match of linkWithDescMatches) {
                const fullMatch = match[0];
                const url = match[1];
                const description = match[2];
                const matchStart = match.index!;
                const matchEnd = match.index! + fullMatch.length;
                
                console.log(`Debug Link: Found link with description: "${fullMatch}"`);
                console.log(`  URL: "${url}", Description: "${description}"`);
                console.log(`  Line ${lineIndex}: ${line}`);
                
                processedRanges.push({start: matchStart, end: matchEnd});
                
                // URL部分的位置（只包括URL内容，不包括括号）
                const urlStart = matchStart + 2; // 跳过 [[
                const urlEnd = urlStart + url.length;
                const urlStartPos = new vscode.Position(lineIndex, urlStart);
                const urlEndPos = new vscode.Position(lineIndex, urlEnd);
                linkUrlRanges.push(new vscode.Range(urlStartPos, urlEndPos));
                
                console.log(`  URL range: line ${lineIndex}, cols ${urlStart}-${urlEnd}`);
                
                // 描述部分的位置（只包括描述文本，不包括括号）
                const descStart = matchStart + fullMatch.indexOf('][') + 2; // 跳过 ][
                const descEnd = descStart + description.length;
                const descStartPos = new vscode.Position(lineIndex, descStart);
                const descEndPos = new vscode.Position(lineIndex, descEnd);
                linkDescriptionRanges.push(new vscode.Range(descStartPos, descEndPos));
                
                console.log(`  Description range: line ${lineIndex}, cols ${descStart}-${descEnd}`);
            }

            // 然后处理无描述的链接格式 [[url]]，但要避免重复处理
            const linkNoDescMatches = [...line.matchAll(/\[\[([^\]]+)\]\]/g)];
            for (const match of linkNoDescMatches) {
                const matchStart = match.index!;
                const matchEnd = match.index! + match[0].length;
                
                // 检查是否已经被带描述的链接处理过
                const isAlreadyProcessed = processedRanges.some(range => 
                    matchStart >= range.start && matchEnd <= range.end
                );
                
                if (!isAlreadyProcessed) {
                    const url = match[1];
                    const urlStart = matchStart + 2; // 跳过 [[
                    const urlEnd = urlStart + url.length;
                    const urlStartPos = new vscode.Position(lineIndex, urlStart);
                    const urlEndPos = new vscode.Position(lineIndex, urlEnd);
                    linkFullRanges.push(new vscode.Range(urlStartPos, urlEndPos));
                }
            }

            // 最后处理裸链接
            const urlMatches = [...line.matchAll(/https?:\/\/[^\s\]]+/g)];
            for (const match of urlMatches) {
                const matchStart = match.index!;
                const matchEnd = match.index! + match[0].length;
                
                // 确保不在任何链接语法内部
                const isInsideLink = processedRanges.some(range => 
                    matchStart >= range.start && matchEnd <= range.end
                );
                
                if (!isInsideLink) {
                    const startPos = new vscode.Position(lineIndex, matchStart);
                    const endPos = new vscode.Position(lineIndex, matchEnd);
                    linkFullRanges.push(new vscode.Range(startPos, endPos));
                }
            }
        });

        // 清除所有旧的链接装饰
        this.decorationTypes.forEach((decorationType, key) => {
            if (key.startsWith('link')) {
                editor.setDecorations(decorationType, []);
            }
        });

        // 应用新的装饰
        const linkUrlType = this.decorationTypes.get('link-url')!;
        const linkDescType = this.decorationTypes.get('link-description')!;
        const linkFullType = this.decorationTypes.get('link-full')!;
        
        console.log(`Debug Link: Applying decorations:`);
        console.log(`  URL ranges: ${linkUrlRanges.length}`);
        console.log(`  Description ranges: ${linkDescriptionRanges.length}`);
        console.log(`  Full ranges: ${linkFullRanges.length}`);
        
        editor.setDecorations(linkUrlType, linkUrlRanges);
        editor.setDecorations(linkDescType, linkDescriptionRanges);
        editor.setDecorations(linkFullType, linkFullRanges);
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
     * 应用属性高亮
     * @param editor 文本编辑器
     * @param lines 文本行数组
     */
    private applyPropertiesHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const decorationType = this.decorationTypes.get('properties');
        if (!decorationType) return;

        const decorations: vscode.DecorationOptions[] = [];
        const propertyRegex = /^\s*:([A-Z_]+):/;

        lines.forEach((line, lineIndex) => {
            const match = line.match(propertyRegex);
            if (match) {
                const startPos = new vscode.Position(lineIndex, match.index! + match[0].indexOf(':'));
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length - 1);
                decorations.push({
                    range: new vscode.Range(startPos, endPos)
                });
            }
        });

        editor.setDecorations(decorationType, decorations);
    }

    /**
     * 应用块关键字高亮 (BEGIN_*, END_*)
     * @param editor 文本编辑器
     * @param lines 文本行数组
     */
    private applyBlockKeywordsHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const decorationType = this.decorationTypes.get('block-keywords');
        if (!decorationType) return;

        const decorations: vscode.DecorationOptions[] = [];
        const blockKeywordRegex = /^\s*#\+(BEGIN_\w+|END_\w+)/;

        lines.forEach((line, lineIndex) => {
            const match = line.match(blockKeywordRegex);
            if (match) {
                const keywordStart = match[0].indexOf('BEGIN_') !== -1 ? match[0].indexOf('BEGIN_') : match[0].indexOf('END_');
                const startPos = new vscode.Position(lineIndex, match.index! + keywordStart);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                decorations.push({
                    range: new vscode.Range(startPos, endPos)
                });
            }
        });

        editor.setDecorations(decorationType, decorations);
    }

    /**
     * 应用指令关键字高亮 (#+TITLE:, #+AUTHOR: 等)
     * @param editor 文本编辑器
     * @param lines 文本行数组
     */
    private applyDirectivesHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const decorationType = this.decorationTypes.get('directives');
        if (!decorationType) return;

        const decorations: vscode.DecorationOptions[] = [];
        const directiveRegex = /^\s*#\+(\w+):/;

        lines.forEach((line, lineIndex) => {
            const match = line.match(directiveRegex);
            if (match) {
                const startPos = new vscode.Position(lineIndex, match.index! + match[0].indexOf('#+'));
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                decorations.push({
                    range: new vscode.Range(startPos, endPos)
                });
            }
        });

        editor.setDecorations(decorationType, decorations);
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