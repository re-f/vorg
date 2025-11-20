import * as vscode from 'vscode';

/**
 * 标题符号工具类
 * 
 * 提供 VS Code 符号相关的工具方法。
 * 用于将 org-mode 标题映射到 VS Code 符号系统。
 * 
 * @class HeadingSymbolUtils
 */
export class HeadingSymbolUtils {
  /**
   * 根据标题层级确定 VS Code 符号类型
   * 
   * 不同层级的标题映射到不同的符号类型，以便在大纲视图中显示不同的图标。
   * 映射方案：
   * - Level 1: Namespace (命名空间，最高层级容器)
   * - Level 2: Class (类，次级容器)
   * - Level 3: Interface (接口，第三级)
   * - Level 4: Function (函数，第四级)
   * - Level 5: Field (字段，第五级)
   * - Level 6+: Property (属性，更深层级)
   * 
   * @param level - 标题层级（1-9）
   * @returns VS Code 符号类型
   */
  static getSymbolKind(level: number): vscode.SymbolKind {
    if (level === 1) return vscode.SymbolKind.Namespace;
    if (level === 2) return vscode.SymbolKind.Class;
    if (level === 3) return vscode.SymbolKind.Interface;
    if (level === 4) return vscode.SymbolKind.Function;
    if (level === 5) return vscode.SymbolKind.Field;
    return vscode.SymbolKind.Property;
  }
}

