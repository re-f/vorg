import { OrgHeading } from '../database/types';
import { HeadingRepository } from '../database/headingRepository';
import { DatabaseConnection } from '../database/connection';

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
     * @param query - 查询条件（可以是 JSON 字符串或对象）
     */
    public static executeSync(query: string | OrgHeadingQuery): OrgHeading[] {
        let criteria: OrgHeadingQuery;

        if (typeof query === 'string') {
            try {
                criteria = JSON.parse(query);
            } catch (e) {
                criteria = { searchTerm: query };
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
     * 根据条件构建并执行 SQL 查询
     */
    private static findHeadings(repo: HeadingRepository, query: OrgHeadingQuery): OrgHeading[] {
        // 使用 Repository 提供的动态查询方法
        return repo.findByCriteria(query);
    }
}
