import * as vscode from 'vscode';
import { parseTodoKeywords, getTodoKeywordRegexString, TodoKeywordConfig, DEFAULT_TODO_KEYWORDS } from './constants';

/**
 * TODO 关键字管理器
 * 
 * 管理 TODO 关键字配置和状态转换，使用单例模式确保全局唯一实例。
 * 
 * 功能包括：
 * - 加载和解析 TODO 关键字配置
 * - 监听配置变化并自动更新
 * - 提供关键字查询和验证方法
 * - 生成用于正则匹配的模式
 * 
 * 配置格式示例：
 * "TODO NEXT WAITING | DONE CANCELLED"
 * "PreSale InDelivery HANGUP(@/!) End(@/!) | Terminated(@/!) DONE(@/!)"
 * 
 * @class TodoKeywordManager
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
} 