import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import {
  EMPHASIS_MARKERS,
  EmphasisMarkerDef,
  applyEmphasis,
} from '../../utils/emphasisPatterns';

/**
 * 强调标记命令处理类
 *
 * 对应 Emacs org-mode 的 `org-emphasize` (C-c C-x C-f)：
 * 对选中文本插入或切换 Org 六种内联强调标记（*bold*、/italic/、_underline_、
 * =verbatim=、~code~、+strike-through+）。
 */
export class EmphasisCommands {

  /**
   * 注册强调标记相关命令
   */
  static registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand('vorg.emphasize', (marker?: string) => this.emphasize(marker))
    );
  }

  /**
   * 对当前选区（或光标处）插入/切换强调标记
   *
   * @param marker - 标记字符（如 `*`）。未提供时弹出 QuickPick 让用户选择。
   */
  private static async emphasize(marker?: string): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'org') {
        return;
      }

      const markerDef = marker
        ? EMPHASIS_MARKERS.find(m => m.char === marker)
        : await this.pickMarker();

      if (!markerDef) {
        return; // 用户取消选择，或传入了无效的 marker
      }

      const selection = editor.selection;

      if (selection.isEmpty) {
        await this.insertEmptyMarkerPair(editor, selection.active, markerDef);
        return;
      }

      await this.toggleEmphasisOnSelection(editor, selection, markerDef);
    } catch (error) {
      Logger.error('Error in emphasize', error);
    }
  }

  /**
   * 弹出 QuickPick 让用户选择要应用的标记类型
   */
  private static async pickMarker(): Promise<EmphasisMarkerDef | undefined> {
    const items = EMPHASIS_MARKERS.map(def => ({
      label: def.label,
      description: def.char,
      def,
    }));

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: '选择要应用/切换的强调标记（Emphasis）类型',
      title: 'VOrg: Emphasize',
    });

    return picked?.def;
  }

  /**
   * 选区非空时：包裹或去除标记
   */
  private static async toggleEmphasisOnSelection(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    markerDef: EmphasisMarkerDef
  ): Promise<void> {
    const document = editor.document;
    const selectedText = document.getText(selection);

    const result = applyEmphasis(selectedText, markerDef.char);
    if (!result) {
      vscode.window.showWarningMessage('VOrg: 选中内容全部为空白，无法应用强调标记。');
      return;
    }

    const success = await editor.edit(editBuilder => {
      editBuilder.replace(selection, result.text);
    });

    if (success) {
      // 重新选中替换后的文本，方便连续操作或立即查看效果
      const newEnd = document.positionAt(document.offsetAt(selection.start) + result.text.length);
      editor.selection = new vscode.Selection(selection.start, newEnd);

      Logger.info(
        result.toggledOff
          ? `Removed ${markerDef.type} emphasis`
          : `Applied ${markerDef.type} emphasis`
      );
    }
  }

  /**
   * 选区为空时：在光标处插入一对标记字符，并将光标定位到中间
   */
  private static async insertEmptyMarkerPair(
    editor: vscode.TextEditor,
    position: vscode.Position,
    markerDef: EmphasisMarkerDef
  ): Promise<void> {
    const pair = `${markerDef.char}${markerDef.char}`;

    const success = await editor.edit(editBuilder => {
      editBuilder.insert(position, pair);
    });

    if (success) {
      const cursorPos = position.translate(0, 1);
      editor.selection = new vscode.Selection(cursorPos, cursorPos);
    }
  }
}
