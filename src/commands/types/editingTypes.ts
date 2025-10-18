/**
 * 上下文信息接口
 */
export interface ContextInfo {
  type: 'heading' | 'list-item' | 'checkbox' | 'table' | 'code-block' | 'text' | 'code-block-header' | 'property-drawer' | 'property-drawer-header' | 'property-drawer-end' | 'property-item';
  level?: number;
  todoState?: string | null;
  content?: string;
  indent?: number;
  marker?: string;
  checkboxState?: string | null;
  propertyKey?: string;
  propertyValue?: string;
}

/**
 * 标题信息接口
 */
export interface HeadingInfo {
  level: number;
  stars: string;
  todoState: string | null;
  title: string;
}

