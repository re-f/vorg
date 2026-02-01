// 移除顶层 vscode 导入，改为在需要时动态加载，以支持单元测试
// import * as vscode from 'vscode';
import { parseTodoKeywords, DEFAULT_TODO_KEYWORDS, TodoKeywordConfig, DEFAULT_QUERY_LIMIT } from '../utils/constants';

/**
 * 配置服务
 * 
 * 负责从 VS Code workspace 读取配置，并提供给各个模块使用。
 * 这个类封装了所有与 vscode.workspace 的交互，使得其他模块不需要直接依赖 VS Code API。
 * 
 * @example
 * // 在 extension.ts 中创建全局实例
 * const configService = ConfigService.fromVSCodeWorkspace();
 * 
 * // 在 Command 或 Provider 中使用
 * const keywords = configService.getAllKeywordStrings();
 * 
 * // 在测试中使用
 * const testConfig = new ConfigService('TODO DONE', 'TODO');
 */
export class ConfigService {
    private static instance: ConfigService;
    private todoKeywords: TodoKeywordConfig[] = [];
    private doneKeywords: TodoKeywordConfig[] = [];
    private allKeywords: TodoKeywordConfig[] = [];
    private defaultTodoKeyword: string = 'TODO';
    private queryLimit: number = DEFAULT_QUERY_LIMIT;

    /**
     * 获取全局配置服务实例
     */
    static getInstance(): ConfigService {
        return this.instance;
    }

    /**
     * 设置全局配置服务实例
     */
    static setInstance(instance: ConfigService): void {
        this.instance = instance;
    }

    /**
     * 构造函数
     * @param todoKeywordsStr - TODO 关键字配置字符串
     * @param defaultKeyword - 默认 TODO 关键字
     */
    constructor(todoKeywordsStr?: string, defaultKeyword?: string, queryLimit?: number) {
        this.loadConfiguration(todoKeywordsStr, defaultKeyword, queryLimit);
    }

    /**
     * 加载配置
     */
    private loadConfiguration(todoKeywordsStr?: string, defaultKeyword?: string, queryLimit?: number): void {
        const keywordsStr = todoKeywordsStr || DEFAULT_TODO_KEYWORDS;
        const parsed = parseTodoKeywords(keywordsStr);

        this.todoKeywords = parsed.todoKeywords;
        this.doneKeywords = parsed.doneKeywords;
        this.allKeywords = parsed.allKeywords;

        // 验证默认关键字是否有效
        const keyword = defaultKeyword || 'TODO';
        if (this.allKeywords.some(k => k.keyword === keyword)) {
            this.defaultTodoKeyword = keyword;
        } else if (this.todoKeywords.length > 0) {
            this.defaultTodoKeyword = this.todoKeywords[0].keyword;
        } else {
            this.defaultTodoKeyword = 'TODO';
        }

        this.queryLimit = queryLimit || DEFAULT_QUERY_LIMIT;
    }

    // === Getters ===

    /**
     * 获取所有 TODO 关键字（未完成状态）
     */
    getTodoKeywords(): TodoKeywordConfig[] {
        return this.todoKeywords;
    }

    /**
     * 获取所有 DONE 关键字（已完成状态）
     */
    getDoneKeywords(): TodoKeywordConfig[] {
        return this.doneKeywords;
    }

    /**
     * 获取所有关键字
     */
    getAllKeywords(): TodoKeywordConfig[] {
        return this.allKeywords;
    }

    /**
     * 获取默认 TODO 关键字
     */
    getDefaultTodoKeyword(): string {
        return this.defaultTodoKeyword;
    }

    /**
     * 获取查询结果数量限制
     */
    getQueryLimit(): number {
        return this.queryLimit;
    }

    /**
     * 获取所有关键字的字符串数组（用于 Parser）
     */
    getAllKeywordStrings(): string[] {
        return this.allKeywords.map(k => k.keyword);
    }

    /**
     * 检查是否是有效的关键字
     */
    isValidKeyword(keyword: string): boolean {
        return this.allKeywords.some(k => k.keyword === keyword);
    }

    /**
     * 检查是否是 DONE 关键字
     */
    isDoneKeyword(keyword: string): boolean {
        return this.doneKeywords.some(k => k.keyword === keyword);
    }

    /**
     * 检查是否是 TODO 关键字
     */
    isTodoKeyword(keyword: string): boolean {
        return this.todoKeywords.some(k => k.keyword === keyword);
    }

    /**
     * 获取关键字配置
     */
    getKeywordConfig(keyword: string): TodoKeywordConfig | undefined {
        return this.allKeywords.find(k => k.keyword === keyword);
    }

    // === 静态工厂方法 ===

    /**
     * 从 VS Code workspace 创建配置服务
     */
    static fromVSCodeWorkspace(): ConfigService {
        const vscode = require('vscode');
        const config = vscode.workspace.getConfiguration('vorg');
        const todoKeywordsStr = config.get('todoKeywords', DEFAULT_TODO_KEYWORDS);
        const defaultKeyword = config.get('defaultTodoKeyword', 'TODO');
        const queryLimit = config.get('queryLimit', DEFAULT_QUERY_LIMIT);
        return new ConfigService(todoKeywordsStr, defaultKeyword, queryLimit);
    }

    /**
     * 创建默认配置服务（用于测试）
     */
    static default(): ConfigService {
        return new ConfigService();
    }

    /**
     * 监听配置变化
     * 
     * @param callback - 配置变化时的回调函数
     * @returns Disposable 对象，用于取消监听
     */
    static watchConfiguration(callback: (config: ConfigService) => void): any {
        const vscode = require('vscode');
        return vscode.workspace.onDidChangeConfiguration((e: any) => {
            if (e.affectsConfiguration('vorg.todoKeywords') ||
                e.affectsConfiguration('vorg.defaultTodoKeyword') ||
                e.affectsConfiguration('vorg.queryLimit')) {
                callback(ConfigService.fromVSCodeWorkspace());
            }
        });
    }
}

/**
 * 获取全局配置服务实例
 * 供其他模块（Command、Provider 等）使用
 */
export function getConfigService(): ConfigService {
    return ConfigService.getInstance();
}

