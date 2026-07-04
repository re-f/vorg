/**
 * Org-mode 强调/等宽标记（Emphasis and Monospace）共享定义
 *
 * 对应 https://orgmode.org/manual/Emphasis-and-Monospace.html 中的六种内联标记：
 * *bold*、/italic/、_underlined_、=verbatim=、~code~、+strike-through+
 *
 * 这里的正则规则与 syntaxes/org.tmLanguage.json 中的 `markup` patterns 保持一致
 * （标记内容首尾不能是空白，且标记字符前后不能紧邻普通单词字符），
 * 供 `SyntaxHighlighter`（编辑器内装饰）与 `EmphasisCommands`（插入/切换标记命令）共用。
 */

export type EmphasisType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'verbatim'
  | 'code'
  | 'strikethrough';

export interface EmphasisMarkerDef {
  type: EmphasisType;
  /** 标记字符，如 `*`、`/` */
  char: string;
  /** 用于 QuickPick 展示的标签 */
  label: string;
}

/**
 * 六种标记的定义，顺序与 TextMate 语法文件中的 `markup` patterns 一致，
 * 也决定了重叠匹配时的优先级（先出现的优先）。
 */
export const EMPHASIS_MARKERS: EmphasisMarkerDef[] = [
  { type: 'bold', char: '*', label: '粗体 (Bold) *text*' },
  { type: 'italic', char: '/', label: '斜体 (Italic) /text/' },
  { type: 'underline', char: '_', label: '下划线 (Underline) _text_' },
  { type: 'strikethrough', char: '+', label: '删除线 (Strike-through) +text+' },
  { type: 'verbatim', char: '=', label: '逐字 (Verbatim) =text=' },
  { type: 'code', char: '~', label: '代码 (Code) ~text~' },
];

export interface EmphasisMatch {
  type: EmphasisType;
  marker: string;
  /** 整个标记（含分隔符）在行内的起始字符索引 */
  start: number;
  /** 整个标记（含分隔符）在行内的结束字符索引（不含） */
  end: number;
  /** 标记内容的起始字符索引（不含开头分隔符） */
  contentStart: number;
  /** 标记内容的结束字符索引（不含结尾分隔符） */
  contentEnd: number;
  /** 标记包裹的内容文本 */
  content: string;
}

function escapeRegExpChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 为指定标记字符构建匹配正则，等价于 org.tmLanguage.json 中对应的 `markup.*.org` pattern：
 * - 标记字符前后不能紧邻单词字符（避免 `foo*bar*baz` 之类误匹配）
 * - 标记内容首尾不能是空白字符
 */
export function buildEmphasisRegex(char: string, flags: string = 'g'): RegExp {
  const c = escapeRegExpChar(char);
  return new RegExp(`(?<!\\w)${c}([^${c}\\s](?:[^${c}]*[^${c}\\s])?)${c}(?!\\w)`, flags);
}

/**
 * 在一行文本中查找所有强调标记（六种类型全部尝试），并按起始位置排序、去除重叠匹配。
 * 重叠时保留起始位置更靠前、且在 EMPHASIS_MARKERS 中优先级更高（先出现）的匹配。
 */
export function findEmphasisMatches(line: string): EmphasisMatch[] {
  const raw: EmphasisMatch[] = [];

  for (const def of EMPHASIS_MARKERS) {
    const regex = buildEmphasisRegex(def.char);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      raw.push({
        type: def.type,
        marker: def.char,
        start: match.index,
        end: match.index + match[0].length,
        contentStart: match.index + 1,
        contentEnd: match.index + match[0].length - 1,
        content: match[1],
      });
    }
  }

  raw.sort((a, b) => a.start - b.start);

  const result: EmphasisMatch[] = [];
  let lastEnd = -1;
  for (const match of raw) {
    if (match.start >= lastEnd) {
      result.push(match);
      lastEnd = match.end;
    }
  }
  return result;
}

/**
 * 拆分文本首尾的空白部分，返回 { leading, trimmed, trailing }。
 * 用于包裹标记前，把首尾空白挪到标记外面（因为 Org 强调标记内容首尾不能是空白）。
 */
export function trimForWrap(text: string): { leading: string; trimmed: string; trailing: string } {
  const leadingMatch = text.match(/^\s*/);
  const trailingMatch = text.match(/\s*$/);
  const leading = leadingMatch ? leadingMatch[0] : '';
  const trailing = trailingMatch && trailingMatch[0].length > 0
    ? text.slice(text.length - trailingMatch[0].length)
    : '';
  const trimmed = text.slice(leading.length, text.length - trailing.length);
  return { leading, trimmed, trailing };
}

/**
 * 用指定标记字符包裹文本
 */
export function wrapWithMarker(text: string, marker: string): string {
  return `${marker}${text}${marker}`;
}

/**
 * 判断文本是否已经被指定标记字符完整包裹（且符合边界规则，可安全去除）
 */
export function isFullyWrapped(text: string, marker: string): boolean {
  if (text.length < 3) {
    return false;
  }
  if (text[0] !== marker || text[text.length - 1] !== marker) {
    return false;
  }
  const content = text.slice(1, -1);
  if (content.length === 0) {
    return false;
  }
  if (/^\s/.test(content) || /\s$/.test(content)) {
    return false;
  }
  if (content.includes(marker)) {
    // 内容中还包含相同标记字符，去除边界标记后语义会有歧义，不做自动去除
    return false;
  }
  return true;
}

/**
 * 去除文本首尾的标记字符（调用前应先用 isFullyWrapped 校验）
 */
export function unwrap(text: string): string {
  return text.slice(1, -1);
}

export interface ApplyEmphasisResult {
  /** 应用/去除标记后的完整文本（含之前挪出去的首尾空白） */
  text: string;
  /** 本次操作是去除已有标记（true）还是新增标记（false） */
  toggledOff: boolean;
}

/**
 * 对选中文本应用（或去除）指定标记，等价于 org-emphasize 对选区的处理：
 * - 若选中文本已完整被该标记包裹，则去除标记
 * - 否则用该标记包裹文本（会先把首尾空白挪到标记外面）
 * - 若选中文本全是空白，无法包裹，返回 null
 */
export function applyEmphasis(selectedText: string, marker: string): ApplyEmphasisResult | null {
  const { leading, trimmed, trailing } = trimForWrap(selectedText);
  if (trimmed.length === 0) {
    return null;
  }

  if (isFullyWrapped(trimmed, marker)) {
    return { text: leading + unwrap(trimmed) + trailing, toggledOff: true };
  }

  return { text: leading + wrapWithMarker(trimmed, marker) + trailing, toggledOff: false };
}

/**
 * 根据标记类型获取对应的装饰器/decoration 分类名，供 SyntaxHighlighter 使用
 */
export function getEmphasisMarkerDef(type: EmphasisType): EmphasisMarkerDef {
  const def = EMPHASIS_MARKERS.find(d => d.type === type);
  if (!def) {
    throw new Error(`Unknown emphasis type: ${type}`);
  }
  return def;
}
