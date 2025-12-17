import { pinyin } from 'pinyin-pro';

/**
 * 拼音工具函数
 * 
 * 用于在索引时计算并缓存拼音信息，支持拼音搜索功能
 */

/**
 * 检查文本是否包含中文字符
 */
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 获取文本的拼音字符串（用于缓存和索引）
 * 
 * 返回格式：全拼 + 空格 + 首字母
 * 例如："测试" -> "ceshi cs"
 * 
 * 重要：只提取中文字符的拼音，忽略数字、标点等非中文字符
 * 
 * @param text - 输入文本
 * @returns 拼音字符串（全拼和首字母，用空格分隔），如果不包含中文则返回空字符串
 */
export function getPinyinString(text: string): string {
  if (!hasChinese(text)) {
    return '';
  }
  
  // 只提取中文字符
  const chineseOnly = text.replace(/[^\u4e00-\u9fa5]/g, '');
  
  if (!chineseOnly) {
    return '';
  }
  
  // 获取全拼（小写，去除空格）
  const fullPinyin = pinyin(chineseOnly, { toneType: 'none' })
    .toLowerCase()
    .replace(/\s+/g, '');
  
  // 获取首字母（小写，去除空格）
  const initials = pinyin(chineseOnly, { toneType: 'none', pattern: 'first' })
    .toLowerCase()
    .replace(/\s+/g, '');
  
  return `${fullPinyin} ${initials}`.trim();
}

