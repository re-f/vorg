import * as vscode from 'vscode';
import { PropertyParser, PropertyDrawerInfo } from '../parsers/propertyParser';

/**
 * 属性操作服务 (VS Code 相关)
 */
export class PropertyService {
    /**
     * 准备插入 ID 到 Property 抽屉的编辑操作
     * 
     * @param uri - 文档 URI
     * @param document - 文档对象
     * @param headingLine - 标题所在行号
     * @param id - 要插入的 ID
     * @returns WorkspaceEdit 对象，包含插入 ID 的编辑操作
     */
    static prepareIdInsertionEdit(
        uri: vscode.Uri,
        document: vscode.TextDocument,
        headingLine: number,
        id: string
    ): vscode.WorkspaceEdit {
        const workspaceEdit = new vscode.WorkspaceEdit();

        // 查找 Property 抽屉
        const drawer = PropertyParser.findPropertyDrawer(document, headingLine);

        if (!drawer) {
            // 如果没有 Property 抽屉，创建一个
            const headingLineObj = document.lineAt(headingLine);
            const headingIndent = PropertyParser.parseIndent(headingLineObj.text);
            const propertyIndent = headingIndent + '  ';

            const drawerText = PropertyParser.buildPropertyDrawer(
                [{ key: 'ID', value: id }],
                propertyIndent
            );

            const insertPosition = new vscode.Position(headingLine + 1, 0);
            workspaceEdit.insert(uri, insertPosition, drawerText);
        } else {
            // 在 :END: 前插入 ID 属性
            const endLineLine = document.lineAt(drawer.endLine);
            const indent = PropertyParser.getPropertyIndent(document, drawer);
            const idPropertyLine = PropertyParser.buildPropertyLine('ID', id, indent);

            workspaceEdit.insert(uri, endLineLine.range.start, idPropertyLine + '\n');
        }

        return workspaceEdit;
    }
}
