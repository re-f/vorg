import * as vscode from 'vscode';
import { getConfigService } from './services/configService';
import { TodoKeywordConfig } from './utils/constants';
import { EmphasisType, findEmphasisMatches } from './utils/emphasisPatterns';

/**
 * 语法高亮器类
 * 提供 Org-mode 语法的高级渲染功能，自动跟随 VS Code 主题
 */
export class SyntaxHighlighter {
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

    constructor() {
        this.initializeDecorationTypes();
    }

    /**
     * 获取当前主题的颜色
     */
    private getThemeColors(): { [key: string]: { color: string; background: string } } {
        const currentTheme = vscode.window.activeColorTheme.kind;

        switch (currentTheme) {
            case vscode.ColorThemeKind.Dark:
            case vscode.ColorThemeKind.HighContrast:
                return {
                    // 深色主题颜色
                    heading: { color: '#D4D4D4', background: 'transparent' },
                    todo: { color: '#569CD6', background: 'rgba(86, 156, 214, 0.15)' },  // 蓝色关键字
                    done: { color: '#608B4E', background: 'rgba(96, 139, 78, 0.15)' },   // 绿色
                    tag: { color: '#C586C0', background: 'rgba(197, 134, 192, 0.15)' },    // 紫色
                    link: { color: '#4FC1FF', background: 'rgba(79, 193, 255, 0.15)' },    // 亮蓝色
                    timestamp: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.15)' }, // 橙色
                    property: { color: '#9CDCFE', background: 'rgba(156, 220, 254, 0.15)' },  // 浅蓝色
                    keyword: { color: '#6A9955', background: 'transparent' },    // 低调的注释绿色
                    comment: { color: '#6A9955', background: 'transparent' },                   // 绿色注释
                    bold: { color: '#FFFFFF', background: 'rgba(255, 255, 255, 0.1)' },       // 白色加粗
                    italic: { color: '#D4D4D4', background: 'transparent' },                   // 斜体
                    underline: { color: '#D4D4D4', background: 'transparent' },                // 下划线
                    strikethrough: { color: '#9B9B9B', background: 'transparent' },            // 删除线
                    verbatim: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.1)' },     // 逐字（橙色系）
                    code: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.1)' },        // 代码（等宽字体样式）
                    priority: { color: '#FF6B6B', background: 'rgba(255, 107, 107, 0.15)' },  // 红色优先级
                };
            case vscode.ColorThemeKind.Light:
            case vscode.ColorThemeKind.HighContrastLight:
                return {
                    // 浅色主题颜色
                    heading: { color: '#000000', background: 'transparent' },
                    todo: { color: '#0000FF', background: 'rgba(0, 0, 255, 0.15)' },        // 蓝色关键字
                    done: { color: '#008000', background: 'rgba(0, 128, 0, 0.15)' },        // 绿色
                    tag: { color: '#800080', background: 'rgba(128, 0, 128, 0.15)' },       // 紫色
                    link: { color: '#0066CC', background: 'rgba(0, 102, 204, 0.15)' },      // 蓝色链接
                    timestamp: { color: '#A31515', background: 'rgba(163, 21, 21, 0.15)' }, // 红色时间戳
                    property: { color: '#0451A5', background: 'rgba(4, 81, 165, 0.15)' },   // 深蓝色属性
                    keyword: { color: '#708090', background: 'transparent' },     // 低调的灰蓝色
                    comment: { color: '#008000', background: 'transparent' },                // 绿色注释
                    bold: { color: '#000000', background: 'rgba(0, 0, 0, 0.1)' },           // 黑色加粗
                    italic: { color: '#000000', background: 'transparent' },                 // 斜体
                    underline: { color: '#000000', background: 'transparent' },               // 下划线
                    strikethrough: { color: '#707070', background: 'transparent' },           // 删除线
                    verbatim: { color: '#A31515', background: 'rgba(163, 21, 21, 0.08)' },     // 逐字
                    code: { color: '#A31515', background: 'rgba(163, 21, 21, 0.08)' },        // 代码
                    priority: { color: '#D32F2F', background: 'rgba(211, 47, 47, 0.15)' },  // 红色优先级
                };
            default:
                return {
                    // 默认颜色
                    heading: { color: '#D4D4D4', background: 'transparent' },
                    todo: { color: '#569CD6', background: 'rgba(86, 156, 214, 0.15)' },
                    done: { color: '#608B4E', background: 'rgba(96, 139, 78, 0.15)' },
                    tag: { color: '#C586C0', background: 'rgba(197, 134, 192, 0.15)' },
                    link: { color: '#4FC1FF', background: 'rgba(79, 193, 255, 0.15)' },
                    timestamp: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.15)' },
                    property: { color: '#9CDCFE', background: 'rgba(156, 220, 254, 0.15)' },
                    keyword: { color: '#6A9955', background: 'transparent' },
                    comment: { color: '#6A9955', background: 'transparent' },
                    bold: { color: '#FFFFFF', background: 'rgba(255, 255, 255, 0.1)' },
                    italic: { color: '#D4D4D4', background: 'transparent' },
                    underline: { color: '#D4D4D4', background: 'transparent' },
                    strikethrough: { color: '#9B9B9B', background: 'transparent' },
                    verbatim: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.1)' },
                    code: { color: '#CE9178', background: 'rgba(206, 145, 120, 0.1)' },
                    priority: { color: '#FF6B6B', background: 'rgba(255, 107, 107, 0.15)' },
                };
        }
    }

    /**
     * 初始化装饰器类型
     */
    private initializeDecorationTypes(): void {
        const colors = this.getThemeColors();

        // 清理现有的装饰器类型
        this.decorationTypes.forEach(decorationType => decorationType.dispose());
        this.decorationTypes.clear();

        // TODO 状态高亮
        this.decorationTypes.set('todo', vscode.window.createTextEditorDecorationType({
            color: colors.todo.color,
            fontWeight: 'bold',
            backgroundColor: colors.todo.background,
        }));

        // DONE 状态高亮
        this.decorationTypes.set('done', vscode.window.createTextEditorDecorationType({
            color: colors.done.color,
            fontWeight: 'bold',
            backgroundColor: colors.done.background,
        }));

        // 标签高亮
        this.decorationTypes.set('tag', vscode.window.createTextEditorDecorationType({
            color: colors.tag.color,
            backgroundColor: colors.tag.background,
        }));

        // 链接高亮
        this.decorationTypes.set('link', vscode.window.createTextEditorDecorationType({
            color: colors.link.color,
            textDecoration: 'underline',
            backgroundColor: colors.link.background,
        }));

        // 时间戳高亮
        this.decorationTypes.set('timestamp', vscode.window.createTextEditorDecorationType({
            color: colors.timestamp.color,
            backgroundColor: colors.timestamp.background,
        }));

        // 属性高亮
        this.decorationTypes.set('property', vscode.window.createTextEditorDecorationType({
            color: colors.property.color,
            backgroundColor: colors.property.background,
        }));

        // 关键字高亮
        this.decorationTypes.set('keyword', vscode.window.createTextEditorDecorationType({
            color: colors.keyword.color,
            backgroundColor: colors.keyword.background,
        }));

        // 注释高亮
        this.decorationTypes.set('comment', vscode.window.createTextEditorDecorationType({
            color: colors.comment.color,
            fontStyle: 'italic',
        }));

        // 加粗文本
        this.decorationTypes.set('bold', vscode.window.createTextEditorDecorationType({
            color: colors.bold.color,
            fontWeight: 'bold',
            backgroundColor: colors.bold.background,
        }));

        // 斜体文本
        this.decorationTypes.set('italic', vscode.window.createTextEditorDecorationType({
            color: colors.italic.color,
            fontStyle: 'italic',
        }));

        // 下划线文本
        this.decorationTypes.set('underline', vscode.window.createTextEditorDecorationType({
            color: colors.underline.color,
            textDecoration: 'underline',
        }));

        // 删除线文本
        this.decorationTypes.set('strikethrough', vscode.window.createTextEditorDecorationType({
            color: colors.strikethrough.color,
            textDecoration: 'line-through',
        }));

        // 逐字文本（verbatim，原样导出，不做 Org 语法处理）
        this.decorationTypes.set('verbatim', vscode.window.createTextEditorDecorationType({
            color: colors.verbatim.color,
            backgroundColor: colors.verbatim.background,
        }));

        // 代码文本（code，原样导出，不做 Org 语法处理）
        this.decorationTypes.set('code', vscode.window.createTextEditorDecorationType({
            color: colors.code.color,
            backgroundColor: colors.code.background,
        }));

        // 强调标记分隔符（用于 org-hide-emphasis-markers：隐藏 * / _ = ~ + 等标记字符本身）
        // VS Code 没有原生的"隐藏字符"装饰属性，这里借助 textDecoration 可拼接任意 CSS 声明的特性，
        // 追加 display: none 达到隐藏效果（社区插件常用技巧）。
        this.decorationTypes.set('emphasisMarker', vscode.window.createTextEditorDecorationType({
            textDecoration: 'none; display: none;',
        }));

        // 优先级标记
        this.decorationTypes.set('priority', vscode.window.createTextEditorDecorationType({
            color: colors.priority.color,
            fontWeight: 'bold',
            backgroundColor: colors.priority.background,
        }));
    }

    /**
     * 刷新语法高亮
     */
    public refreshHighlighting(): void {
        this.initializeDecorationTypes();

        // 重新应用高亮到所有可见的org编辑器
        vscode.window.visibleTextEditors
            .filter(editor => editor.document.languageId === 'org')
            .forEach(editor => this.applyHighlighting(editor));
    }

    /**
     * 应用语法高亮
     */
    public applyHighlighting(editor: vscode.TextEditor): void {
        if (editor.document.languageId !== 'org') {
            return;
        }

        const text = editor.document.getText();
        const lines = text.split('\n');

        // 清除现有装饰
        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
        });

        // 应用各种高亮
        this.applyTodoHighlighting(editor, lines);
        this.applyTagHighlighting(editor, lines);
        this.applyLinkHighlighting(editor, lines);
        this.applyTimestampHighlighting(editor, lines);
        this.applyPropertyHighlighting(editor, lines);
        this.applyKeywordHighlighting(editor, lines);
        this.applyCommentHighlighting(editor, lines);
        this.applyPriorityHighlighting(editor, lines);
        this.applyEmphasisMarkerHighlighting(editor, lines);
    }

    /**
     * 应用 TODO 状态高亮
     */
    private applyTodoHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const todoRanges: vscode.Range[] = [];
        const doneRanges: vscode.Range[] = [];

        const config = getConfigService();
        const todoKeywords = config.getTodoKeywords();
        const doneKeywords = config.getDoneKeywords();

        const todoRegex = new RegExp(`\\b(${todoKeywords.map((k: TodoKeywordConfig) => k.keyword).join('|')})\\b`, 'g');
        const doneRegex = new RegExp(`\\b(${doneKeywords.map((k: TodoKeywordConfig) => k.keyword).join('|')})\\b`, 'g');

        lines.forEach((line, lineIndex) => {
            // 获取当前行中所有链接的位置范围，用于排除链接内的TODO/DONE匹配
            const linkRanges: { start: number; end: number }[] = [];

            // 查找所有链接 [[...]] 或 [[...][...]]
            const allLinkMatches = Array.from(line.matchAll(/\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g));
            for (const match of allLinkMatches) {
                linkRanges.push({
                    start: match.index!,
                    end: match.index! + match[0].length
                });
            }

            // 检查位置是否在链接内
            const isInLink = (position: number): boolean => {
                return linkRanges.some(range => position >= range.start && position < range.end);
            };

            // 匹配TODO状态，排除链接内的匹配
            let todoMatch;
            while ((todoMatch = todoRegex.exec(line)) !== null) {
                if (!isInLink(todoMatch.index!)) {
                    const startPos = new vscode.Position(lineIndex, todoMatch.index!);
                    const endPos = new vscode.Position(lineIndex, todoMatch.index! + todoMatch[0].length);
                    todoRanges.push(new vscode.Range(startPos, endPos));
                }
            }

            // 匹配DONE状态，排除链接内的匹配
            let doneMatch;
            while ((doneMatch = doneRegex.exec(line)) !== null) {
                if (!isInLink(doneMatch.index!)) {
                    const startPos = new vscode.Position(lineIndex, doneMatch.index!);
                    const endPos = new vscode.Position(lineIndex, doneMatch.index! + doneMatch[0].length);
                    doneRanges.push(new vscode.Range(startPos, endPos));
                }
            }
        });

        // 应用装饰
        const todoType = this.decorationTypes.get('todo')!;
        const doneType = this.decorationTypes.get('done')!;

        editor.setDecorations(todoType, todoRanges);
        editor.setDecorations(doneType, doneRanges);
    }

    /**
     * 应用标签高亮
     */
    private applyTagHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const tagRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 匹配标签格式 :tag1:tag2:
            const tagMatches = line.matchAll(/:[\w]+:/g);
            for (const match of tagMatches) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                tagRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        const tagType = this.decorationTypes.get('tag')!;
        editor.setDecorations(tagType, tagRanges);
    }

    /**
     * 应用时间戳高亮
     */
    private applyTimestampHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const timestampRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 匹配时间戳格式 [2024-01-01 Mon] 和 <2024-01-01 Mon>
            const timestampMatches = line.matchAll(/[<\[](\d{4}-\d{2}-\d{2}[^>\]]*)[>\]]/g);
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
     */
    private applyLinkHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const linkRanges: vscode.Range[] = [];

        lines.forEach((line, lineIndex) => {
            // 匹配所有链接格式：[[url][description]] 或 [[url]]
            const allLinkMatches = Array.from(line.matchAll(/\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g));

            for (const match of allLinkMatches) {
                // 高亮整个链接
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                linkRanges.push(new vscode.Range(startPos, endPos));
            }
        });

        // 应用链接装饰
        const linkType = this.decorationTypes.get('link')!;
        editor.setDecorations(linkType, linkRanges);
    }

    /**
     * 应用属性高亮
     */
    private applyPropertyHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const decorationType = this.decorationTypes.get('property');
        if (!decorationType) {
            return;
        }

        const decorations: vscode.DecorationOptions[] = [];
        const propertyRegex = /^\s*:([A-Z_]+):\s*(.*)$/;

        lines.forEach((line, lineIndex) => {
            const match = line.match(propertyRegex);
            if (match) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                decorations.push({
                    range: new vscode.Range(startPos, endPos)
                });
            }
        });

        editor.setDecorations(decorationType, decorations);
    }

    /**
     * 应用关键字高亮
     */
    private applyKeywordHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const decorationType = this.decorationTypes.get('keyword');
        if (!decorationType) {
            return;
        }

        const decorations: vscode.DecorationOptions[] = [];
        const keywordRegex = /^\s*#\+(\w+):/;

        lines.forEach((line, lineIndex) => {
            const match = line.match(keywordRegex);
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
     * 应用注释高亮
     */
    private applyCommentHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const decorationType = this.decorationTypes.get('comment');
        if (!decorationType) {
            return;
        }

        const decorations: vscode.DecorationOptions[] = [];
        const commentRegex = /^\s*#.*$/;

        lines.forEach((line, lineIndex) => {
            const match = line.match(commentRegex);
            if (match) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                decorations.push({
                    range: new vscode.Range(startPos, endPos)
                });
            }
        });

        editor.setDecorations(decorationType, decorations);
    }

    /**
     * 应用优先级标记高亮
     */
    private applyPriorityHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const decorationType = this.decorationTypes.get('priority');
        if (!decorationType) {
            return;
        }

        const decorations: vscode.DecorationOptions[] = [];
        const priorityRegex = /\[#[ABC]\]/g;

        lines.forEach((line, lineIndex) => {
            let match;
            while ((match = priorityRegex.exec(line)) !== null) {
                const startPos = new vscode.Position(lineIndex, match.index!);
                const endPos = new vscode.Position(lineIndex, match.index! + match[0].length);
                decorations.push({
                    range: new vscode.Range(startPos, endPos)
                });
            }
        });

        editor.setDecorations(decorationType, decorations);
    }

    /**
     * 应用强调标记高亮/隐藏
     *
     * 对应 Emacs org-hide-emphasis-markers：当配置开启时，隐藏 * / _ = ~ + 标记字符本身，
     * 并对标记包裹的内容应用对应的视觉样式（粗体/斜体/下划线/删除线/等宽），
     * 否则跳过额外装饰渲染（继续依赖 TextMate 的 markup.*.org scope 着色）。
     *
     * 光标（选区 active 位置）落在某个标记范围内时，该标记的分隔符会临时保持可见，
     * 以便用户能正常编辑标记字符（对齐 Emacs 行为：光标移入时取消隐藏）。
     */
    private applyEmphasisMarkerHighlighting(editor: vscode.TextEditor, lines: string[]): void {
        const markerType = this.decorationTypes.get('emphasisMarker');
        const styleTypes: Record<EmphasisType, vscode.TextEditorDecorationType | undefined> = {
            bold: this.decorationTypes.get('bold'),
            italic: this.decorationTypes.get('italic'),
            underline: this.decorationTypes.get('underline'),
            strikethrough: this.decorationTypes.get('strikethrough'),
            verbatim: this.decorationTypes.get('verbatim'),
            code: this.decorationTypes.get('code'),
        };

        if (!markerType) {
            return;
        }

        const config = getConfigService();
        const hideMarkers = config.getHideEmphasisMarkers();

        if (!hideMarkers) {
            // 不隐藏标记时不做额外装饰渲染：TextMate 的 markup.*.org scope 已经提供了基本样式
            editor.setDecorations(markerType, []);
            (Object.keys(styleTypes) as EmphasisType[]).forEach(type => {
                const decorationType = styleTypes[type];
                if (decorationType) {
                    editor.setDecorations(decorationType, []);
                }
            });
            return;
        }

        const markerRanges: vscode.Range[] = [];
        const styleRanges: Record<EmphasisType, vscode.Range[]> = {
            bold: [],
            italic: [],
            underline: [],
            strikethrough: [],
            verbatim: [],
            code: [],
        };

        const cursorLine = editor.selection.active.line;
        const cursorChar = editor.selection.active.character;

        lines.forEach((line, lineIndex) => {
            const matches = findEmphasisMatches(line);
            for (const match of matches) {
                styleRanges[match.type].push(new vscode.Range(
                    new vscode.Position(lineIndex, match.contentStart),
                    new vscode.Position(lineIndex, match.contentEnd)
                ));

                const cursorInsideMatch = lineIndex === cursorLine
                    && cursorChar >= match.start
                    && cursorChar <= match.end;

                if (!cursorInsideMatch) {
                    markerRanges.push(new vscode.Range(
                        new vscode.Position(lineIndex, match.start),
                        new vscode.Position(lineIndex, match.start + 1)
                    ));
                    markerRanges.push(new vscode.Range(
                        new vscode.Position(lineIndex, match.end - 1),
                        new vscode.Position(lineIndex, match.end)
                    ));
                }
            }
        });

        editor.setDecorations(markerType, markerRanges);
        (Object.keys(styleRanges) as EmphasisType[]).forEach(type => {
            const decorationType = styleTypes[type];
            if (decorationType) {
                editor.setDecorations(decorationType, styleRanges[type]);
            }
        });
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