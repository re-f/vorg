import * as vscode from 'vscode';
import { HeadingCommands } from './headingCommands';
import { PropertyParser } from '../../parsers/propertyParser';

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

    // 检查标题下是否已经存在Property抽屉 - 使用PropertyParser
    const drawerInfo = PropertyParser.findPropertyDrawer(document, headingLineNumber);
    
    if (drawerInfo) {
      // 已存在property抽屉，检查属性是否存在 - 使用PropertyParser
      const existingPropertyLine = PropertyParser.findPropertyInDrawer(document, drawerInfo, propertyKeyUpper);
      
      if (existingPropertyLine !== null) {
        // 属性已存在，更新其值 - 使用PropertyParser
        const line = document.lineAt(existingPropertyLine);
        const propertyInfo = PropertyParser.parseProperty(line.text);
        
        if (propertyInfo) {
          const newLineText = PropertyParser.buildPropertyLine(
            propertyKeyUpper,
            propertyValue,
            propertyInfo.indent
          );
          
          await editor.edit(editBuilder => {
            editBuilder.replace(line.range, newLineText);
          });
          
          vscode.window.showInformationMessage(`已更新属性 ${propertyKeyUpper}`);
        }
      } else {
        // 属性不存在，在:END:之前添加新属性 - 使用PropertyParser
        const referenceIndent = PropertyParser.getPropertyIndent(document, drawerInfo, '  ');
        
        const insertLine = drawerInfo.endLine;
        const insertPosition = new vscode.Position(insertLine, 0);
        const newPropertyLine = PropertyParser.buildPropertyLine(
          propertyKeyUpper,
          propertyValue,
          referenceIndent
        );
        
        await editor.edit(editBuilder => {
          editBuilder.insert(insertPosition, `${newPropertyLine}\n`);
        });
        
        vscode.window.showInformationMessage(`已添加属性 ${propertyKeyUpper}`);
      }
    } else {
      // 不存在property抽屉，创建新的 - 使用PropertyParser
      const insertPosition = new vscode.Position(headingLineNumber + 1, 0);
      
      // 生成唯一的 ID
      const uniqueId = PropertyParser.generateUniqueId();
      
      // 创建包含 ID 和用户输入属性的 Property 抽屉
      const propertyDrawer = PropertyParser.buildPropertyDrawer(
        [
          { key: 'ID', value: uniqueId },
          { key: propertyKeyUpper, value: propertyValue }
        ],
        '  '
      );

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
    
    // 检测当前行的缩进 - 使用PropertyParser
    const indent = PropertyParser.parseIndent(lineText) || '  ';
    
    editBuilder.insert(lineEnd, `\n${indent}:`);
  }

}

