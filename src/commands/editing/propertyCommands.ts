import * as vscode from 'vscode';
import { HeadingCommands } from './headingCommands';

/**
 * Property管理命令
 */
export class PropertyCommands {
  /**
   * 设置Property（模拟org-set-property行为）
   * 在当前标题下设置或更新属性
   */
  static async orgSetProperty(editor: vscode.TextEditor) {
    const position = editor.selection.active;
    const document = editor.document;
    
    // 查找当前位置所属的标题
    const headingLineInfo = HeadingCommands.findCurrentHeading(document, position);
    if (!headingLineInfo) {
      vscode.window.showInformationMessage('请将光标放在标题或其内容区域内');
      return;
    }

    const { line } = headingLineInfo;
    const headingLineNumber = line.lineNumber;

    // 提示用户输入属性名
    const propertyKey = await vscode.window.showInputBox({
      prompt: '请输入属性名',
      placeHolder: '例如：CATEGORY, PRIORITY, CREATED 等'
    });

    if (!propertyKey) {
      return;
    }

    const propertyKeyUpper = propertyKey.toUpperCase();

    // 提示用户输入属性值
    const propertyValue = await vscode.window.showInputBox({
      prompt: `请输入属性 "${propertyKeyUpper}" 的值`,
      placeHolder: '例如：work, high, [2023-10-20] 等'
    });

    if (propertyValue === undefined) {  // 允许空值
      return;
    }

    // 检查标题下是否已经存在Property抽屉
    const drawerInfo = PropertyCommands.findPropertyDrawer(document, headingLineNumber);
    
    if (drawerInfo) {
      // 已存在property抽屉，检查属性是否存在
      const existingPropertyLine = PropertyCommands.findPropertyInDrawer(document, drawerInfo, propertyKeyUpper);
      
      if (existingPropertyLine !== null) {
        // 属性已存在，更新其值
        const line = document.lineAt(existingPropertyLine);
        const lineText = line.text;
        const propertyMatch = lineText.match(/^(\s*:\w+:)\s*(.*)$/);
        
        if (propertyMatch) {
          const indent = lineText.match(/^(\s*)/)?.[1] || '  ';
          const newLineText = `${indent}:${propertyKeyUpper}: ${propertyValue}`;
          
          await editor.edit(editBuilder => {
            editBuilder.replace(line.range, newLineText);
          });
          
          vscode.window.showInformationMessage(`已更新属性 ${propertyKeyUpper}`);
        }
      } else {
        // 属性不存在，在:END:之前添加新属性
        // 首先找到现有属性的缩进作为参考
        let referenceIndent = '  '; // 默认缩进
        for (let i = drawerInfo.startLine + 1; i < drawerInfo.endLine; i++) {
          const line = document.lineAt(i);
          const lineText = line.text;
          const propertyMatch = lineText.match(/^(\s*):\w+:/);
          if (propertyMatch) {
            referenceIndent = propertyMatch[1];
            break;
          }
        }
        
        const insertLine = drawerInfo.endLine;
        const insertPosition = new vscode.Position(insertLine, 0);
        
        await editor.edit(editBuilder => {
          editBuilder.insert(insertPosition, `${referenceIndent}:${propertyKeyUpper}: ${propertyValue}\n`);
        });
        
        vscode.window.showInformationMessage(`已添加属性 ${propertyKeyUpper}`);
      }
    } else {
      // 不存在property抽屉，创建新的
      const insertPosition = new vscode.Position(headingLineNumber + 1, 0);
      
      // 生成唯一的 ID
      const uniqueId = PropertyCommands.generateUniqueId();
      
      // 创建包含 ID 和用户输入属性的 Property 抽屉
      const propertyDrawer = `  :PROPERTIES:
  :ID: ${uniqueId}
  :${propertyKeyUpper}: ${propertyValue}
  :END:
`;

      await editor.edit(editBuilder => {
        editBuilder.insert(insertPosition, propertyDrawer);
      });
      
      vscode.window.showInformationMessage(`已创建Property抽屉并添加属性 ${propertyKeyUpper}`);
    }
  }

  /**
   * 插入property项
   */
  static insertPropertyItem(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor
  ) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineEnd = line.range.end;
    const lineText = line.text;
    
    // 检测当前行的缩进
    const indentMatch = lineText.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '  ';
    
    editBuilder.insert(lineEnd, `\n${indent}:`);
  }

  /**
   * 查找指定标题下的Property抽屉
   * 返回抽屉的起始行和结束行，如果不存在则返回null
   */
  static findPropertyDrawer(
    document: vscode.TextDocument,
    headingLineNumber: number
  ): { startLine: number; endLine: number } | null {
    let startLine: number | null = null;
    let endLine: number | null = null;
    
    // 查看标题下的几行，查找 :PROPERTIES: 和 :END: 标记
    for (let i = headingLineNumber + 1; i < Math.min(headingLineNumber + 50, document.lineCount); i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 如果遇到了另一个标题，停止查找
      if (lineText.match(/^\*+\s+/)) {
        break;
      }
      
      // 如果找到了 :PROPERTIES: 标记
      if (lineText === ':PROPERTIES:') {
        startLine = i;
        continue;
      }
      
      // 如果找到了 :END: 标记
      if (lineText === ':END:' && startLine !== null) {
        endLine = i;
        break;
      }
    }
    
    if (startLine !== null && endLine !== null) {
      return { startLine, endLine };
    }
    
    return null;
  }

  /**
   * 在Property抽屉中查找指定的属性
   * 返回属性所在的行号，如果不存在则返回null
   */
  static findPropertyInDrawer(
    document: vscode.TextDocument,
    drawerInfo: { startLine: number; endLine: number },
    propertyKey: string
  ): number | null {
    const propertyKeyUpper = propertyKey.toUpperCase();
    
    for (let i = drawerInfo.startLine + 1; i < drawerInfo.endLine; i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 匹配属性行 :KEY: value
      const match = lineText.match(/^:(\w+):/);
      if (match && match[1].toUpperCase() === propertyKeyUpper) {
        return i;
      }
    }
    
    return null;
  }

  /**
   * 检查指定标题下是否已经存在Property抽屉（兼容性方法）
   */
  static hasPropertyDrawer(document: vscode.TextDocument, headingLineNumber: number): boolean {
    return PropertyCommands.findPropertyDrawer(document, headingLineNumber) !== null;
  }

  /**
   * 生成唯一的 ID（UUID v4 格式）
   */
  static generateUniqueId(): string {
    // 生成符合 UUID v4 格式的随机 ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

