import { OrgHeading } from '../database/types';
import { HeadingRepository } from '../database/headingRepository';
import { DatabaseConnection } from '../database/connection';
import { VOrgQLParser } from './vorgQLParser';
import { VOrgQLTranslator } from './vorgQLTranslator';

/**
 * Org 查询标准接口
 */
export interface OrgHeadingQuery {
    todo?: string | string[];
    priority?: string | string[];
    tags?: string | string[];
    level?: number | { min?: number, max?: number };
    fileUri?: string;
    searchTerm?: string;
    sortBy?: 'todo' | 'priority' | 'deadline' | 'mtime' | 'level';
    order?: 'asc' | 'desc';
    limit?: number;
}

/**
 * 现代化查询服务
 * 
 * 负责解析查询 DSL 并调度 Repository 执行高效的 SQL 查询。
 * 目前主要支持 JSON 格式的查询描述。
 */
export class QueryService {
    /**
     * 执行查询并返回 Heading 结果列表
     * 
     * @param query - 查询条件（可以是 JSON 字符串或对象）
     */
    /**
     * 同步执行查询并返回 Heading 结果列表
     * 
     * @param query - 查询条件（可以是 JSON 字符串、对象或快捷查询字符串）
     */
    public static executeSync(query: string | OrgHeadingQuery): OrgHeading[] {
        let criteria: OrgHeadingQuery;

        if (typeof query === 'string') {
            const trimmed = query.trim();
            if (trimmed.startsWith('(')) {
                // VOrg-QL S-Expression 模式
                return this.executeQL(trimmed);
            }
            if (trimmed.startsWith('{')) {
                try {
                    criteria = JSON.parse(trimmed);
                } catch (e) {
                    criteria = this.parseQueryString(trimmed);
                }
            } else {
                criteria = this.parseQueryString(trimmed);
            }
        } else {
            criteria = query;
        }

        const db = DatabaseConnection.getInstance().getDatabase();
        if (!db) {
            return [];
        }
        const repo = new HeadingRepository(db);

        return this.findHeadings(repo, criteria);
    }

    /**
     * 将快捷查询字符串解析为结构化对象
     * 示例: "t:NEXT p:A #work 搜索词"
     */
    public static parseQueryString(input: string): OrgHeadingQuery {
        const criteria: OrgHeadingQuery = {};
        const parts = input.split(/\s+/);
        const searchTerms: string[] = [];

        for (const part of parts) {
            if (part.startsWith('t:') || part.startsWith('todo:')) {
                criteria.todo = part.split(':')[1].toUpperCase();
            } else if (part.startsWith('p:') || part.startsWith('priority:')) {
                criteria.priority = part.split(':')[1].toUpperCase();
            } else if (part.startsWith('#')) {
                const tag = part.substring(1);
                if (!criteria.tags) { criteria.tags = []; }
                (criteria.tags as string[]).push(tag);
            } else {
                searchTerms.push(part);
            }
        }

        if (searchTerms.length > 0) {
            criteria.searchTerm = searchTerms.join(' ');
        }

        return criteria;
    }

    /**
     * 执行 S-Expression 查询
     */
    private static executeQL(input: string): OrgHeading[] {
        try {
            const ast = VOrgQLParser.parse(input);
            const translator = new VOrgQLTranslator();
            const { where, params } = translator.translate(ast);

            const db = DatabaseConnection.getInstance().getDatabase();
            if (!db) return [];
            const repo = new HeadingRepository(db);

            return repo.findByQL(where, params);
        } catch (error) {
            console.error('VOrg-QL Execution Error:', error);
            return [];
        }
    }

    /**
     * 根据条件构建并执行 SQL 查询
     */
    private static findHeadings(repo: HeadingRepository, query: OrgHeadingQuery): OrgHeading[] {
        return repo.findByCriteria(query);
    }
}
