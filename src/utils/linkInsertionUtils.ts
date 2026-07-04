import { LinkParser } from '../parsers/linkParser';
import { IndexedHeadingSymbol } from '../services/orgSymbolIndexService';

/**
 * 按查询文本过滤标题候选（支持标题文本与拼音）
 */
export function filterSymbolsByQuery(
  symbols: IndexedHeadingSymbol[],
  query: string
): IndexedHeadingSymbol[] {
  if (!query) {
    return symbols;
  }

  const queryLower = query.toLowerCase();
  return symbols.filter(symbol => {
    const symbolText = symbol.text.toLowerCase();
    const symbolDisplayName = symbol.displayName.toLowerCase();

    if (symbolText.includes(queryLower) || symbolDisplayName.includes(queryLower)) {
      return true;
    }

    const pinyinText = symbol.pinyinText || '';
    const pinyinDisplayName = symbol.pinyinDisplayName || '';
    if (pinyinText || pinyinDisplayName) {
      const symbolPinyinText = pinyinText.toLowerCase();
      const symbolPinyinDisplayName = pinyinDisplayName.toLowerCase();
      if (symbolPinyinText.includes(queryLower) || symbolPinyinDisplayName.includes(queryLower)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * 构建标准 id: 标题链接文本
 */
export function buildIdLinkText(id: string, title: string, description?: string): string {
  const target = `id:${id}`;
  const linkDescription = description !== undefined && description !== '' ? description : title;
  return LinkParser.buildBracketLink(target, linkDescription);
}

/**
 * 将标题候选转换为 QuickPick 展示项（不含 VS Code 类型依赖）
 */
export function toHeadingQuickPickItems(symbols: IndexedHeadingSymbol[]) {
  return symbols.map(symbol => ({
    label: symbol.displayName,
    description: symbol.relativePath,
    detail: `${symbol.relativePath} (Level ${symbol.level})`,
    symbol
  }));
}
