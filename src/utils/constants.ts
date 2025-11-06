export const PREVIEW_PANEL_TYPE = 'vorgPreview';
export const SIDE_PANEL_TYPE = 'vorgSidePreview';
export const PREVIEW_TITLE = 'Org Preview';

export const COMMANDS = {
  PREVIEW: 'vorg.preview',
  PREVIEW_TO_SIDE: 'vorg.previewToSide',
  EXPORT_PREVIEW: 'vorg.exportPreview',
  FOLLOW_LINK: 'vorg.followLink',
  INSERT_LINK: 'vorg.insertLink'
} as const;

export const WEBVIEW_MESSAGES = {
  READY: 'ready',
  UPDATE_SCROLL: 'updateScroll',
  EXPORT_HTML: 'exportHtml'
} as const;

export const DEFAULT_PREVIEW_OPTIONS = {
  enableScripts: true,
  retainContextWhenHidden: true
} as const;

// TODO状态相关常量
export const DEFAULT_TODO_KEYWORDS = 'TODO NEXT WAITING | DONE CANCELLED';

export interface TodoKeywordConfig {
  keyword: string;
  needsTimestamp?: boolean;
  needsNote?: boolean;
  isDone: boolean;
}

/**
 * 解析TODO关键字配置字符串
 * 例如: "PreSale InDelivery HANGUP(@/!) End(@/!) | Terminated(@/!) DONE(@/!)"
 */
export function parseTodoKeywords(configString: string): {
  todoKeywords: TodoKeywordConfig[];
  doneKeywords: TodoKeywordConfig[];
  allKeywords: TodoKeywordConfig[];
} {
  if (!configString.trim()) {
    configString = DEFAULT_TODO_KEYWORDS;
  }

  const [todoSection = '', doneSection = ''] = configString.split('|').map(s => s.trim());
  
  const parseSection = (section: string, isDone: boolean): TodoKeywordConfig[] => {
    if (!section) return [];
    
    // 使用正则匹配每个关键字及其配置
    const keywordRegex = /(\w+)(\([^)]*\))?/g;
    const keywords: TodoKeywordConfig[] = [];
    let match;
    
    while ((match = keywordRegex.exec(section)) !== null) {
      const keyword = match[1];
      const config = match[2]; // 包含括号的部分，如 (@/!)
      
      let needsTimestamp = false;
      let needsNote = false;
      
      if (config) {
        // 解析括号内的配置：@(时间戳)、!(备注)
        const configContent = config.slice(1, -1); // 去掉括号
        
        // 检查是否需要时间戳和备注
        needsTimestamp = configContent.includes('@');
        needsNote = configContent.includes('!');
      }
      
      keywords.push({
        keyword,
        needsTimestamp,
        needsNote,
        isDone
      });
    }
    
    return keywords;
  };
  
  const todoKeywords = parseSection(todoSection, false);
  const doneKeywords = parseSection(doneSection, true);
  const allKeywords = [...todoKeywords, ...doneKeywords];
  
  return {
    todoKeywords,
    doneKeywords,
    allKeywords
  };
}

/**
 * 获取所有TODO关键字的正则表达式字符串
 */
export function getTodoKeywordRegexString(keywords: TodoKeywordConfig[]): string {
  if (keywords.length === 0) {
    return 'TODO|DONE|NEXT|WAITING|CANCELLED';
  }
  return keywords.map(k => k.keyword).join('|');
} 