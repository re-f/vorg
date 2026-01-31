/**
 * 链接信息接口
 */
export interface LinkInfo {
  type: 'bracket' | 'http' | 'file';
  target: string;
  description?: string;
  startCol: number;
  endCol: number;
}

/**
 * 链接解析器
 * 纯解析逻辑，负责解析 Org-mode 链接格式
 */
export class LinkParser {
  /**
   * 解析行中的所有链接
   */
  static parseLinks(lineText: string): LinkInfo[] {
    const links: LinkInfo[] = [];

    // 解析方括号链接 [[link][description]] 或 [[link]]
    const bracketLinks = this.parseBracketLinks(lineText);
    links.push(...bracketLinks);

    // 解析 HTTP 链接（但排除方括号内的）
    const httpLinks = this.parseHttpLinks(lineText);
    // 过滤掉与方括号链接重叠的 HTTP 链接
    const filteredHttpLinks = httpLinks.filter(httpLink => {
      return !bracketLinks.some(bracketLink =>
        httpLink.startCol >= bracketLink.startCol &&
        httpLink.endCol <= bracketLink.endCol
      );
    });
    links.push(...filteredHttpLinks);

    // 解析文件链接
    const fileLinks = this.parseFileLinks(lineText);
    links.push(...fileLinks);

    // 按位置排序
    links.sort((a, b) => a.startCol - b.startCol);

    return links;
  }

  /**
   * 解析方括号链接 [[link][description]] 或 [[link]]
   */
  static parseBracketLinks(lineText: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    const bracketRegex = /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g;
    let match;

    while ((match = bracketRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = startCol + match[0].length;
      const target = match[1];
      const description = match[2];

      links.push({
        type: 'bracket',
        target,
        description,
        startCol,
        endCol
      });
    }

    return links;
  }

  /**
   * 解析 HTTP/HTTPS 链接
   */
  static parseHttpLinks(lineText: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    const httpRegex = /(https?:\/\/[^\s\]]+)/g;
    let match;

    while ((match = httpRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = startCol + match[0].length;
      const target = match[1];

      links.push({
        type: 'http',
        target,
        startCol,
        endCol
      });
    }

    return links;
  }

  /**
   * 解析文件链接
   */
  static parseFileLinks(lineText: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    const fileRegex = /file:([^\s\]]+)/g;
    let match;

    while ((match = fileRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = startCol + match[0].length;
      const target = match[1];

      links.push({
        type: 'file',
        target,
        startCol,
        endCol
      });
    }

    return links;
  }

  /**
   * 检查位置是否在链接内
   */
  static isPositionInLink(lineText: string, position: number): LinkInfo | null {
    const links = this.parseLinks(lineText);

    for (const link of links) {
      if (position >= link.startCol && position <= link.endCol) {
        return link;
      }
    }

    return null;
  }

  /**
   * 构建方括号链接文本
   */
  static buildBracketLink(target: string, description?: string): string {
    if (description) {
      return `[[${target}][${description}]]`;
    }
    return `[[${target}]]`;
  }

  /**
   * 解析链接目标，提取类型和路径
   */
  static parseLinkTarget(target: string): {
    type: 'file' | 'id' | 'headline' | 'http' | 'other';
    path?: string;
    file?: string;
    headline?: string;
    id?: string;
  } {
    // HTTP 链接
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return { type: 'http', path: target };
    }

    // file: 链接
    if (target.startsWith('file:')) {
      return { type: 'file', path: target.substring(5) };
    }

    // ID 链接 #id
    if (target.startsWith('#')) {
      return { type: 'id', id: target.substring(1) };
    }

    // 文件链接，可能带标题 file.org::*Headline 或 file.org::#id
    if (target.includes('::')) {
      const [file, anchor] = target.split('::', 2);

      if (anchor.startsWith('*')) {
        // 标题链接
        return {
          type: 'headline',
          file,
          headline: anchor.substring(1)
        };
      } else if (anchor.startsWith('#')) {
        // ID 链接
        return {
          type: 'id',
          file,
          id: anchor.substring(1)
        };
      } else {
        // 其他锚点
        return {
          type: 'headline',
          file,
          headline: anchor
        };
      }
    }

    // 纯标题链接 *Headline
    if (target.startsWith('*')) {
      return {
        type: 'headline',
        headline: target.substring(1)
      };
    }

    // 文件链接
    if (target.includes('.org') || target.includes('.org_archive') || target.includes('/')) {
      return { type: 'file', path: target };
    }

    // 其他类型
    return { type: 'other', path: target };
  }
}

