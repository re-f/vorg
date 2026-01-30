/**
 * VOrg 扩展主入口文件
 * 
 * 负责激活扩展和注册所有功能模块：
 * - 符号索引服务（OrgSymbolIndexService）
 * - 大纲和工作区符号提供器
 * - 链接、折叠、CodeLens 提供器
 * - 预览管理器、语法高亮器
 * - 各种命令（编辑、预览、链接、调试）
 * - 补全提供器（ID 链接自动补全）
 * 
 * 设计原则：
 * - 保持简洁，主要逻辑委托给各个模块
 * - 单一职责：每个模块只负责特定的功能领域
 * - 模块化：功能按照逻辑关系分组，便于维护和扩展
 * 
 * @module extension
 */

import * as vscode from 'vscode';
import { OrgOutlineProvider } from './outline/orgOutlineProvider';
import { OrgWorkspaceSymbolProvider } from './outline/orgWorkspaceSymbolProvider';
import { OrgLinkProvider } from './links/orgLinkProvider';
import { OrgFoldingProvider } from './folding/orgFoldingProvider';
import { PreviewManager } from './preview/previewManager';
import { SyntaxHighlighter } from './syntaxHighlighter';
import { ConfigService } from './services/configService';
import { Logger } from './utils/logger';
import { PreviewCommands } from './commands/previewCommands';
import { LinkCommands } from './commands/linkCommands';
import { EditingCommands } from './commands/editingCommands';
import { DebugCommands } from './commands/debugCommands';
import { HeadingCodeLensProvider } from './codelens/headingCodeLensProvider';
import { OrgSymbolIndexService } from './services/orgSymbolIndexService';
import { OrgCompletionProvider } from './completion/orgCompletionProvider';
import { PropertyParser } from './parsers/propertyParser';
import { PropertyService } from './services/propertyService';

/**
 * 补全 ID 处理辅助函数
 * 这些函数只在 extension.ts 内部使用，不导出
 */

/**
 * 获取或生成标题的 ID
 * 
 * @param targetDocument - 目标文档
 * @param symbolLine - 标题所在行号
 * @param providedId - 已提供的 ID（可选）
 * @returns ID 和是否需要插入的标志
 */
async function getOrGenerateIdForCompletion(
  targetDocument: vscode.TextDocument,
  symbolLine: number,
  providedId?: string
): Promise<{ id: string; needsInsert: boolean }> {
  const result = PropertyParser.getOrGenerateIdForHeading(targetDocument, symbolLine);

  // 如果提供了真实 ID，检查是否与文档中的 ID 一致
  // 如果不一致，使用文档中的 ID（静默处理，不需要日志）

  return result;
}

/**
 * 修复链接中的闭合括号
 * 
 * VS Code 可能会自动添加 `]]`，导致出现 `]]]]` 或缺少 `]]` 的情况。
 * 此函数确保链接格式正确：`[[id:UUID][标题]]`
 * 
 * @param text - 包含链接的文本
 * @returns 修复后的文本
 */
function fixClosingBrackets(text: string): string {
  const idLinkStart = text.indexOf('[[id:');
  if (idLinkStart === -1) {
    return text;
  }

  // 查找第一个 ]] 的位置
  const firstDoubleBracket = text.indexOf(']]', idLinkStart);
  if (firstDoubleBracket === -1) {
    // 没有找到 ]]，需要添加 ]]
    return text + ']]';
  }

  // 检查第一个 ]] 之后是否还有多余的 ]
  let bracketCount = 2; // 第一个 ]] 有 2 个 ]
  let pos = firstDoubleBracket + 2;
  while (pos < text.length && text[pos] === ']') {
    bracketCount++;
    pos++;
  }

  if (bracketCount > 2) {
    // 有多余的 ]，移除多余的，只保留 ]]
    const beforeBrackets = text.substring(0, firstDoubleBracket + 2);
    const afterBrackets = text.substring(pos);
    return beforeBrackets + afterBrackets;
  } else if (bracketCount < 2) {
    // 缺少 ]，添加 ]
    const fixed = text.substring(0, firstDoubleBracket + bracketCount) + ']' + text.substring(firstDoubleBracket + bracketCount);
    return fixed;
  }

  return text;
}

/**
 * 替换当前行中的 ID
 * 
 * @param currentText - 当前行的文本
 * @param idToUse - 要使用的 ID
 * @returns 替换后的文本，如果未找到 ID 模式则返回原文本
 */
function replaceIdInText(currentText: string, idToUse: string): string {
  // 匹配模式：[[id:UUID][标题]]
  const idPattern = /(\[\[id:)([^\]]+)(\]\[)/;
  const match = currentText.match(idPattern);

  if (!match) {
    Logger.warn(`[CompletionProvider] 未找到 ID 模式，当前文本: "${currentText}"`);
    return currentText;
  }

  // 替换 ID 部分
  let newText = currentText.replace(idPattern, `$1${idToUse}$3`);

  // 修复闭合括号
  newText = fixClosingBrackets(newText);

  return newText;
}

/**
 * 将光标移动到链接的 `]]` 后面
 * 
 * @param editor - 活动编辑器
 * @param lineNumber - 行号
 */
function moveCursorAfterLink(editor: vscode.TextEditor, lineNumber: number): void {
  const lineText = editor.document.lineAt(lineNumber).text;
  const lastBracketIndex = lineText.lastIndexOf(']]');

  if (lastBracketIndex !== -1) {
    const newCursorPosition = new vscode.Position(
      lineNumber,
      lastBracketIndex + 2 // ]] 的长度是 2
    );
    editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
  }
}

/**
 * 插入 ID 到目标文档并保存
 * 
 * 这是补全功能相关的操作，负责：
 * 1. 使用 PropertyParser 准备编辑操作（只处理 orgmode 元素）
 * 2. 应用编辑并保存文件（VS Code 相关操作）
 * 
 * @param symbolUri - 目标文档 URI
 * @param targetDocument - 目标文档
 * @param symbolLine - 标题所在行号
 * @param idToUse - 要插入的 ID
 */
async function insertIdToTargetDocument(
  symbolUri: vscode.Uri,
  targetDocument: vscode.TextDocument,
  symbolLine: number,
  idToUse: string
): Promise<void> {
  // 使用 PropertyService 准备编辑操作
  const workspaceEdit = PropertyService.prepareIdInsertionEdit(
    symbolUri,
    targetDocument,
    symbolLine,
    idToUse
  );

  // 应用编辑（不会切换文档）
  const success = await vscode.workspace.applyEdit(workspaceEdit);
  if (!success) {
    Logger.error(`[CompletionProvider] 应用编辑失败`);
    return;
  }

  // 保存目标文件（VS Code 相关操作）
  const targetEditor = vscode.window.visibleTextEditors.find(
    editor => editor.document.uri.toString() === symbolUri.toString()
  );

  if (targetEditor) {
    // 如果目标文件已经在编辑器中打开，保存它
    await targetEditor.document.save();
  } else {
    // 如果目标文件没有打开，重新打开并保存
    const doc = await vscode.workspace.openTextDocument(symbolUri);
    await doc.save();
  }
}

/**
 * 激活扩展
 * 
 * 当 VS Code 加载扩展时调用此函数，注册所有功能提供器和命令。
 * 
 * @param context - VS Code 扩展上下文，用于注册订阅和命令
 */
export function activate(context: vscode.ExtensionContext) {
  // 初始化日志系统
  Logger.initialize(context);
  Logger.info('VOrg extension is now active!');

  // 初始化配置服务
  const configService = ConfigService.fromVSCodeWorkspace();
  ConfigService.setInstance(configService);

  // 监听配置变化并更新配置服务
  context.subscriptions.push(
    ConfigService.watchConfiguration((newConfig) => {
      ConfigService.setInstance(newConfig);
      Logger.info('配置已更新');
    })
  );

  // 初始化符号索引服务（共享缓存，供多个功能使用）
  const symbolIndexService = OrgSymbolIndexService.getInstance();
  context.subscriptions.push(symbolIndexService);

  // 初始化语法高亮器
  const syntaxHighlighter = new SyntaxHighlighter();

  // 注册大纲提供者（单个文档的符号导航）
  const outlineProvider = new OrgOutlineProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider('org', outlineProvider)
  );

  // 注册工作区符号提供者（整个工作区的符号搜索）
  const workspaceSymbolProvider = new OrgWorkspaceSymbolProvider();
  context.subscriptions.push(
    vscode.languages.registerWorkspaceSymbolProvider(workspaceSymbolProvider)
  );

  // 注册链接提供者
  const linkProvider = new OrgLinkProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider('org', linkProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider('org', linkProvider)
  );

  // 注册折叠提供者
  const foldingProvider = new OrgFoldingProvider();
  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider('org', foldingProvider)
  );

  // 注册 CodeLens 提供者（标题行的 Promote/Demote 按钮）
  const codeLensProvider = new HeadingCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'org', scheme: 'file' },
      codeLensProvider
    ),
    codeLensProvider
  );

  // 注册自动补全提供者（ID 链接补全）
  // 设置触发字符 '['，在输入 [[ 后直接触发补全
  // 内部逻辑会判断是否是 id: 链接，只对 id: 链接提供补全
  const completionProvider = new OrgCompletionProvider();
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('org', completionProvider, '[')
  );

  // 注册 ID 生成并插入命令（在用户选择补全项时调用）
  // 此时才读取文件检查 ID，如果不存在则生成并插入
  context.subscriptions.push(
    vscode.commands.registerCommand('vorg.generateAndInsertIdForCompletion', async (
      symbolUri: vscode.Uri,
      symbolLine: number,
      startPos?: vscode.Position,
      endPos?: vscode.Position,
      headlineText?: string,
      providedId?: string
    ) => {
      try {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          Logger.warn('[CompletionProvider] 没有活动的编辑器');
          return;
        }

        const currentDocument = activeEditor.document;
        const currentPosition = activeEditor.selection.active;
        const currentLine = currentDocument.lineAt(currentPosition.line);
        const currentText = currentLine.text;

        // 打开目标文档，获取或生成 ID
        const targetDocument = await vscode.workspace.openTextDocument(symbolUri);
        const { id: idToUse, needsInsert } = await getOrGenerateIdForCompletion(
          targetDocument,
          symbolLine,
          providedId
        );

        // 检查目标文档是否是当前文档
        const isSameDocument = currentDocument.uri.toString() === symbolUri.toString();

        // 如果需要插入 ID，先准备编辑操作（在编辑当前行之前）
        let idInsertEdit: vscode.WorkspaceEdit | undefined;
        if (needsInsert) {
          idInsertEdit = PropertyService.prepareIdInsertionEdit(
            symbolUri,
            targetDocument,
            symbolLine,
            idToUse
          );
        }

        // 替换当前行中的 ID（可能是占位符或已提供的 ID）
        const newText = replaceIdInText(currentText, idToUse);

        // 如果目标文档是当前文档，需要合并编辑操作
        if (isSameDocument && needsInsert && idInsertEdit) {
          // 将当前行的替换操作添加到同一个 WorkspaceEdit 中
          const currentLineRange = new vscode.Range(
            new vscode.Position(currentPosition.line, 0),
            new vscode.Position(currentPosition.line, currentLine.text.length)
          );
          idInsertEdit.replace(currentDocument.uri, currentLineRange, newText);

          // 应用合并后的编辑
          const success = await vscode.workspace.applyEdit(idInsertEdit);
          if (!success) {
            Logger.error(`[CompletionProvider] 应用编辑失败`);
            return;
          }

          // 将光标移动到 ]] 后面
          moveCursorAfterLink(activeEditor, currentPosition.line);

          // 保存文档
          await currentDocument.save();
        } else {
          // 如果文本有变化，应用替换
          if (newText !== currentText) {
            const range = new vscode.Range(
              new vscode.Position(currentPosition.line, 0),
              new vscode.Position(currentPosition.line, currentLine.text.length)
            );

            await activeEditor.edit(editBuilder => {
              editBuilder.replace(range, newText);
            });

            // 将光标移动到 ]] 后面
            moveCursorAfterLink(activeEditor, currentPosition.line);
          }

          // 如果需要插入 ID，插入到目标文档并保存（目标文档不是当前文档）
          if (needsInsert) {
            await insertIdToTargetDocument(
              symbolUri,
              targetDocument,
              symbolLine,
              idToUse
            );
          }
        }
      } catch (error) {
        Logger.error('检查并插入 ID 失败', error);
      }
    })
  );

  // 注册 ID 插入命令（用于跨文档的 ID 插入，保留以兼容旧代码）
  context.subscriptions.push(
    vscode.commands.registerCommand('vorg.insertIdForCompletion', async (uri: vscode.Uri, line: number, id: string) => {
      try {
        const document = await vscode.workspace.openTextDocument(uri);

        // 使用 WorkspaceEdit 来避免切换文档
        const workspaceEdit = new vscode.WorkspaceEdit();

        // 查找 Property 抽屉
        const drawer = PropertyParser.findPropertyDrawer(document, line);

        if (!drawer) {
          // 如果没有 Property 抽屉，创建一个
          const headingLineObj = document.lineAt(line);
          const headingIndent = PropertyParser.parseIndent(headingLineObj.text);
          const propertyIndent = headingIndent + '  ';

          const drawerText = PropertyParser.buildPropertyDrawer(
            [{ key: 'ID', value: id }],
            propertyIndent
          );

          const insertPosition = new vscode.Position(line + 1, 0);
          workspaceEdit.insert(uri, insertPosition, drawerText);
        } else {
          // 检查是否已有 ID 属性
          const idLine = PropertyParser.findPropertyInDrawer(document, drawer, 'ID');
          if (idLine !== null) {
            // 更新现有 ID
            const lineObj = document.lineAt(idLine);
            const property = PropertyParser.parseProperty(lineObj.text);
            if (property) {
              const indent = property.indent;
              const newLine = PropertyParser.buildPropertyLine('ID', id, indent);
              workspaceEdit.replace(uri, lineObj.range, newLine);
            }
          } else {
            // 在 :END: 前插入 ID 属性
            const endLine = document.lineAt(drawer.endLine);
            const indent = PropertyParser.getPropertyIndent(document, drawer);
            const idPropertyLine = PropertyParser.buildPropertyLine('ID', id, indent);

            workspaceEdit.insert(uri, endLine.range.start, idPropertyLine + '\n');
          }
        }

        // 应用编辑（不会切换文档）
        await vscode.workspace.applyEdit(workspaceEdit);
      } catch (error) {
        Logger.error('插入 ID 失败', error);
      }
    })
  );

  // 面包屑功能由 VS Code 基于 DocumentSymbolProvider 自动提供
  // 通过 OrgOutlineProvider 已经实现了正确的符号层次结构
  // 确保在 VS Code 设置中启用了面包屑功能：
  // "breadcrumbs.enabled": true

  // 注册预览管理器
  const previewManager = new PreviewManager(context);

  // 注册各种命令
  const previewCommands = new PreviewCommands(context);
  previewCommands.registerCommands(context);
  previewCommands.registerEventListeners(context); // 注册预览事件监听器
  LinkCommands.registerCommands(context);
  EditingCommands.registerCommands(context);
  DebugCommands.registerCommands(context);

  // 监听文档变化，应用语法高亮
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'org') {
        syntaxHighlighter.refreshHighlighting();
        syntaxHighlighter.applyHighlighting(editor);
      }
    })
  );

  // 监听文档内容变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'org') {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
          syntaxHighlighter.applyHighlighting(editor);
        }
      }
    })
  );

  // 监听主题变化
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      syntaxHighlighter.refreshHighlighting();
    })
  );

  // 应用到当前活动的编辑器
  if (vscode.window.activeTextEditor?.document.languageId === 'org') {
    syntaxHighlighter.applyHighlighting(vscode.window.activeTextEditor);
  }
}

/**
 * 停用扩展
 * 
 * 当 VS Code 卸载扩展时调用此函数，执行清理操作。
 */
export function deactivate() {
  Logger.info('VOrg extension is deactivated');
} 