import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { OrgHeading, OrgLink } from './types';
import { getPinyinString } from '../utils/pinyinUtils';
import { HeadingParser } from '../parsers/headingParser';

/**
 * UniorgAstExtractor
 * 
 * 从 uniorg AST 提取数据库所需的信息
 * 负责遍历 AST 并提取 headings, links, 和文件元数据
 * 
 * AST 结构说明:
 * - headline: todoKeyword, rawValue, priority, tags, children (text nodes)
 * - property-drawer: 在 section children 中,与 headline 同级
 * - node-property: key, value
 * - link: linkType, path, rawLink, children (text nodes)
 */
export class UniorgAstExtractor {
    /**
     * 从 AST 提取所有 headings
     * 
     * 注意: property drawer 在 AST 中是 headline 的兄弟节点,
     * 所以我们需要在遍历时收集它们
     */
    extractHeadings(ast: any, fileUri: string, content: string, doneKeywords?: string[]): OrgHeading[] {
        const headings: OrgHeading[] = [];
        const mapper = new OffsetMapper(content);

        const traverse = (node: any, parentId?: string) => {
            let currentHeadingId = parentId;

            // 如果节点是 section 且包含 headline,则它对应一个 heading
            if (node.type === 'section') {
                const headline = node.children?.find((c: any) => c.type === 'headline');

                if (headline) {
                    // 查找 property drawer
                    const drawer = node.children?.find((c: any) => c.type === 'property-drawer');
                    const properties = drawer ? this.extractPropertiesFromDrawer(drawer) : {};

                    // 创建 heading
                    const heading = this.createHeadingFromNode(
                        headline,
                        node.contentsBegin || headline.contentsBegin || 0,
                        properties,
                        fileUri,
                        mapper,
                        parentId,
                        doneKeywords
                    );

                    // 修正 endLine: 使用 section 的结束位置
                    if (node.position && node.position.end && typeof node.position.end.line === 'number') {
                        heading.endLine = node.position.end.line - 1;
                    } else if (node.contentsEnd) {
                        heading.endLine = mapper.getLine(node.contentsEnd);
                    }

                    headings.push(heading);
                    currentHeadingId = heading.id; // 更新当前父 ID
                }
            }

            // 递归遍历子节点 (查找嵌套的 section)
            if (node.children) {
                for (const child of node.children) {
                    // 只需递归遍历 section 和 org-data
                    if (child.type === 'section' || child.type === 'org-data') {
                        traverse(child, currentHeadingId);
                    }
                }
            }
        };

        // 从根节点开始遍历
        // 如果根节点是 org-data,直接遍历其 children
        if (ast.type === 'org-data') {
            if (ast.children) {
                for (const child of ast.children) {
                    traverse(child, undefined);
                }
            }
        } else {
            traverse(ast, undefined);
        }

        return headings;
    }

    /**
     * 从 AST 提取所有 links
     */
    extractLinks(ast: any, fileUri: string, content: string): OrgLink[] {
        const links: OrgLink[] = [];
        const mapper = new OffsetMapper(content);
        let currentHeadingLine: number | undefined;
        let currentHeadingId: string | undefined;

        const traverse = (node: any) => {
            // 跟踪当前所在的 heading
            if (node.type === 'section') {
                const headline = node.children?.find((c: any) => c.type === 'headline');
                if (headline) {
                    currentHeadingLine = mapper.getLine(node.contentsBegin || headline.contentsBegin || 0);

                    // 获取 ID (从 properties)
                    const drawer = node.children?.find((c: any) => c.type === 'property-drawer');
                    if (drawer) {
                        const props = this.extractPropertiesFromDrawer(drawer);
                        currentHeadingId = props.ID;
                    } else {
                        currentHeadingId = undefined;
                    }
                }
            }

            // 提取 link
            if (node.type === 'link') {
                const link = this.extractLinkFromNode(node, fileUri, mapper, currentHeadingLine, currentHeadingId);
                if (link) {
                    links.push(link);
                }
            }

            // 递归遍历子节点
            if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        };

        traverse(ast);
        return links;
    }

    /**
     * 从 AST 提取文件级元数据
     */
    extractFileMetadata(ast: any): {
        title?: string;
        properties: Record<string, string>;
        tags: string[];
    } {
        const metadata: {
            title?: string;
            properties: Record<string, string>;
            tags: string[];
        } = {
            properties: {},
            tags: []
        };

        // 遍历顶层节点查找文件级属性
        if (ast.children) {
            for (const node of ast.children) {
                // #+TITLE keyword 直接在 org-data children 中
                if (node.type === 'keyword') {
                    if (node.key === 'TITLE') {
                        metadata.title = node.value;
                    } else if (node.key === 'FILETAGS') {
                        // 解析 :tag1:tag2: 格式
                        if (node.value) {
                            metadata.tags = node.value.split(':').filter((t: string) => t.trim() !== '');
                        }
                    }
                }

                // 查找 section 节点
                if (node.type === 'section' && node.children) {
                    for (const child of node.children) {
                        // 查找文件级 property drawer
                        if (child.type === 'property-drawer') {
                            metadata.properties = this.extractPropertiesFromDrawer(child);
                        }

                        // 查找第一个 heading 的标签
                        if (child.type === 'headline' && child.level === 1) {
                            if (child.tags && child.tags.length > 0) {
                                metadata.tags = child.tags;
                            }
                            break; // 只取第一个 heading 的标签
                        }
                    }
                }
            }
        }

        return metadata;
    }

    /**
     * 私有: 创建 OrgHeading 对象
     */
    private createHeadingFromNode(
        node: any,
        startOffset: number,
        properties: Record<string, string>,
        fileUri: string,
        mapper: OffsetMapper,
        parentId?: string,
        doneKeywords?: string[]
    ): OrgHeading {
        // Use AST position if available (1-based -> 0-based), fallback to offset mapper
        let startLine: number;
        if (node.position && node.position.start && typeof node.position.start.line === 'number') {
            startLine = node.position.start.line - 1;
        } else {
            startLine = mapper.getLine(startOffset);
        }

        const id = properties.ID || `${fileUri}:${startLine}`;

        // 提取 title (从 rawValue)
        const title = node.rawValue || '';

        // 提取时间戳
        const scheduled = this.extractTimestamp(properties.SCHEDULED);
        const deadline = this.extractTimestamp(properties.DEADLINE);
        const closed = this.extractTimestamp(properties.CLOSED);

        // 提取 TODO category
        const todoCategory = this.getTodoCategory(node.todoKeyword, doneKeywords);

        // 计算拼音（用于拼音搜索）
        const tags = [...new Set((node.tags as string[]) || [])];
        const todoKeyword = node.todoKeyword || undefined;
        const displayName = HeadingParser.buildDisplayName(title, todoKeyword, tags);
        const pinyinTitle = getPinyinString(title);
        const pinyinDisplayName = getPinyinString(displayName);

        // Calculate endLine: prefer using node.position
        let endLine = startLine;
        // Check if node has position.end (unlikely for headline node to cover section, but safe to check)
        // Usually we traverse 'section' for endLine, but here 'node' is 'headline'.
        // So for the *headline* node, endLine IS startLine (usually). 
        // The *section* endLine is handled in extractHeadings calling this.
        // Wait, the previous code used `node.contentsEnd` which for a headline IS valid.

        // Let's use mapper fallback for now inside here, but update 'extractHeadings' to set the correct Section endLine later.
        // Actually, createHeadingFromNode initializes endLine, but extractHeadings overwrites it immediately for sections.
        if (node.position && node.position.end && typeof node.position.end.line === 'number') {
            endLine = node.position.end.line - 1;
        } else {
            endLine = mapper.getLine(node.contentsEnd || node.contentsBegin || 0);
        }

        return {
            id,
            fileUri,
            level: node.level || 1,
            title,
            pinyinTitle,
            pinyinDisplayName,
            todoState: todoKeyword,
            todoCategory,
            priority: node.priority || undefined,
            tags,
            properties,
            scheduled,
            deadline,
            closed,
            timestamps: [],
            startLine: startLine,
            endLine: endLine, // Will be updated by caller if this is a section
            parentId,
            childrenIds: [],
            content: '',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * 私有: 从 link 节点提取数据
     */
    private extractLinkFromNode(
        node: any,
        fileUri: string,
        mapper: OffsetMapper,
        sourceHeadingLine?: number,
        sourceHeadingId?: string
    ): OrgLink | null {
        if (!node.path && !node.rawLink) {
            return null;
        }

        // 确定链接类型
        const linkType = this.determineLinkType(node);

        // 提取链接文本
        const linkText = this.extractTextFromChildren(node.children);

        // 对于 HTTP/HTTPS 链接,使用 rawLink 而不是 path (path 会去掉协议)
        const linkPath = (linkType === 'http' && node.rawLink) ? node.rawLink : node.path;

        // 解析目标
        const target = this.parseLinkTarget(linkPath, linkType);

        return {
            sourceUri: fileUri,
            sourceHeadingLine,
            sourceHeadingId,
            lineNumber: mapper.getLine(node.contentsBegin || 0),
            ...target,
            linkType,
            linkText
        };
    }

    /**
     * 私有: 从 property drawer 提取 properties
     */
    private extractPropertiesFromDrawer(drawer: any): Record<string, string> {
        const properties: Record<string, string> = {};

        if (drawer.children) {
            for (const prop of drawer.children) {
                if (prop.type === 'node-property' && prop.key && prop.value) {
                    properties[prop.key] = prop.value;
                }
            }
        }

        return properties;
    }

    /**
     * 私有: 从子节点提取文本
     */
    private extractTextFromChildren(children: any[]): string | undefined {
        if (!children || children.length === 0) {
            return undefined;
        }

        const text = children
            .map((child: any) => {
                if (child.type === 'text') {
                    return child.value || '';
                }
                return '';
            })
            .join('')
            .trim();

        return text || undefined;
    }

    /**
     * 私有: 提取时间戳
     */
    private extractTimestamp(value?: string): Date | undefined {
        if (!value) {
            return undefined;
        }

        // 解析 Org timestamp: <2024-01-28 Mon> 或 [2024-01-28 Mon]
        const match = value.match(/[<\[](\d{4}-\d{2}-\d{2})/);
        if (match) {
            return new Date(match[1]);
        }

        return undefined;
    }

    /**
     * 私有: 获取 TODO category
     */
    private getTodoCategory(keyword?: string, customDoneKeywords?: string[]): 'todo' | 'done' | undefined {
        if (!keyword) {
            return undefined;
        }

        const doneKeywords = customDoneKeywords || ['DONE', 'CANCELED', 'CANCELLED'];
        if (doneKeywords.map(k => k.toUpperCase()).includes(keyword.toUpperCase())) {
            return 'done';
        }

        return 'todo';
    }

    /**
     * 私有: 确定链接类型
     */
    private determineLinkType(node: any): 'file' | 'id' | 'http' {
        const linkType = node.linkType;

        if (linkType === 'id') {
            return 'id';
        }
        if (linkType === 'file') {
            return 'file';
        }
        if (linkType === 'http' || linkType === 'https') {
            return 'http';
        }

        // 默认为 file 链接
        return 'file';
    }

    /**
     * 私有: 解析链接目标
     */
    private parseLinkTarget(path: string, linkType: string): {
        targetUri?: string;
        targetHeadingId?: string;
        targetId?: string;
    } {
        if (linkType === 'id') {
            return { targetId: path };
        }

        if (linkType === 'file') {
            // file:path::*heading 或 file:path::#custom-id
            const parts = path.split('::');
            const targetUri = parts[0];

            if (parts.length > 1) {
                const anchor = parts[1];
                if (anchor.startsWith('*')) {
                    // heading 链接
                    return { targetUri, targetHeadingId: anchor.substring(1) };
                } else if (anchor.startsWith('#')) {
                    // custom ID 链接
                    return { targetUri, targetId: anchor.substring(1) };
                }
            }

            return { targetUri };
        }

        // http 链接
        return { targetUri: path };
    }
}

/**
 * 辅助类：将字符偏移量转换为 0 索引的行号
 */
class OffsetMapper {
    private lineStarts: number[] = [];

    constructor(content: string) {
        this.lineStarts.push(0);
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\n') {
                this.lineStarts.push(i + 1);
            }
        }
    }

    /**
     * 获取指定偏移量对应的 0 索引行号
     */
    getLine(offset: number): number {
        // 使用二分查找找到对应的行
        let low = 0;
        let high = this.lineStarts.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.lineStarts[mid] === offset) {
                return mid;
            } else if (this.lineStarts[mid] < offset) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        // 返回 high，因为 high 是最后一个小于等于 offset 的行起点的索引
        return high;
    }
}
