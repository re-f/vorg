import * as vscode from 'vscode';
import { parseTodoKeywords, getTodoKeywordRegexString, TodoKeywordConfig, DEFAULT_TODO_KEYWORDS } from './constants';

/**
 * TODO 关键字管理器
 * 
 * @deprecated 此类已废弃，建议使用 ConfigService 代替
 * 
 * 旧版本：使用单例模式，直接从 vscode.workspace 读取配置
 * 新版本：保留为纯工具类，提供静态方法
 * 
 * 迁移指南：
 * ```typescript
 * // 旧代码
 * const manager = TodoKeywordManager.getInstance();
 * const keywords = manager.getAllKeywords();
 * 
 * // 新代码
 * import { getConfigService } from '../extension';
 * const config = getConfigService();
 * const keywords = config.getAllKeywords();
 * ```
 */
export class TodoKeywordManager {
    private static instance: TodoKeywordManager;
    private todoKeywords: TodoKeywordConfig[] = [];
    private doneKeywords: TodoKeywordConfig[] = [];
    private allKeywords: TodoKeywordConfig[] = [];
    private regexString: string = '';

    private constructor() {
        this.loadConfiguration();

        // 监听配置变化
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('vorg.todoKeywords')) {
                this.loadConfiguration();
            }
        });
    }

    /**
     * 获取单例实例
     * @deprecated 建议使用 ConfigService
     */
    public static getInstance(): TodoKeywordManager {
        if (!TodoKeywordManager.instance) {
            TodoKeywordManager.instance = new TodoKeywordManager();
        }
        return TodoKeywordManager.instance;
    }

    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('vorg');
        const todoKeywordsConfig = config.get<string>('todoKeywords', DEFAULT_TODO_KEYWORDS);

        const parsed = parseTodoKeywords(todoKeywordsConfig);
        this.todoKeywords = parsed.todoKeywords;
        this.doneKeywords = parsed.doneKeywords;
        this.allKeywords = parsed.allKeywords;
        this.regexString = getTodoKeywordRegexString(this.allKeywords);
    }

    public getTodoKeywords(): TodoKeywordConfig[] {
        return this.todoKeywords;
    }

    public getDoneKeywords(): TodoKeywordConfig[] {
        return this.doneKeywords;
    }

    public getAllKeywords(): TodoKeywordConfig[] {
        return this.allKeywords;
    }

    public getRegexString(): string {
        return this.regexString;
    }

    public isValidKeyword(keyword: string): boolean {
        return this.allKeywords.some(k => k.keyword === keyword);
    }

    public getKeywordConfig(keyword: string): TodoKeywordConfig | undefined {
        return this.allKeywords.find(k => k.keyword === keyword);
    }

    public getDefaultTodoKeyword(): string {
        const config = vscode.workspace.getConfiguration('vorg');
        const defaultKeyword = config.get<string>('defaultTodoKeyword', 'TODO');

        // 确保默认关键字在配置中存在
        if (this.isValidKeyword(defaultKeyword)) {
            return defaultKeyword;
        }

        // 如果配置的默认关键字不存在，返回第一个TODO关键字
        return this.todoKeywords.length > 0 ? this.todoKeywords[0].keyword : 'TODO';
    }

    public isDoneKeyword(keyword: string): boolean {
        return this.doneKeywords.some(k => k.keyword === keyword);
    }

    public isTodoKeyword(keyword: string): boolean {
        return this.todoKeywords.some(k => k.keyword === keyword);
    }

    /**
     * 获取用于正则匹配的完整模式
     * 包含词边界和捕获组
     */
    public getMatchPattern(): RegExp {
        return new RegExp(`\\b(${this.regexString})\\b`);
    }

    // === 新增：纯工具方法（不依赖实例状态）===

    /**
     * 解析 TODO 关键字字符串
     * @param todoKeywordsStr - TODO 关键字配置字符串
     */
    static parse(todoKeywordsStr: string = DEFAULT_TODO_KEYWORDS) {
        return parseTodoKeywords(todoKeywordsStr);
    }

    /**
     * 获取正则表达式字符串
     * @param keywords - 关键字配置数组
     */
    static getRegexString(keywords: TodoKeywordConfig[]): string {
        return getTodoKeywordRegexString(keywords);
    }

    /**
     * 获取匹配模式
     * @param keywords - 关键字配置数组
     */
    static getMatchPattern(keywords: TodoKeywordConfig[]): RegExp {
        const regexString = getTodoKeywordRegexString(keywords);
        return new RegExp(`\\b(${regexString})\\b`);
    }

    /**
     * 检查是否是有效的关键字
     */
    static isValidKeyword(keyword: string, allKeywords: TodoKeywordConfig[]): boolean {
        return allKeywords.some(k => k.keyword === keyword);
    }

    /**
     * 检查是否是 DONE 关键字
     */
    static isDoneKeyword(keyword: string, doneKeywords: TodoKeywordConfig[]): boolean {
        return doneKeywords.some(k => k.keyword === keyword);
    }

    /**
     * 检查是否是 TODO 关键字
     */
    static isTodoKeyword(keyword: string, todoKeywords: TodoKeywordConfig[]): boolean {
        return todoKeywords.some(k => k.keyword === keyword);
    }

    /**
     * 获取关键字配置
     */
    static getKeywordConfig(keyword: string, allKeywords: TodoKeywordConfig[]): TodoKeywordConfig | undefined {
        return allKeywords.find(k => k.keyword === keyword);
    }
}