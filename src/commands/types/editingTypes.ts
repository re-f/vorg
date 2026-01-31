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
  level: number;              // 标题层级
  stars: string;              // 星号
  todoKeyword: string | null; // TODO 关键字（TODO、DONE 等）
  priority: string | null;    // 优先级 [#A], [#B], [#C]
  title: string;              // 完整的标题文本（包含优先级和标签）
  tags?: string[];            // 标签数组
  text?: string;              // 纯文本（不包含 TODO 关键字、优先级和标签）
}

