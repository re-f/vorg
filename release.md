# 1.2.0 版本变更 / Release 1.2.0

## 新增功能 / New Features

- **强调格式切换 (org-emphasize)**：
  - 在选中文本或光标处切换粗体、斜体、下划线、等宽、删除线等 Org 强调格式。
  - **使用方法 / Shortcut**：`Ctrl+C Ctrl+X Ctrl+F`（Mac/Windows/Linux 通用）。
- **Emphasis toggling (org-emphasize)**:
  - Wrap or unwrap bold, italic, underline, verbatim, code, and strike-through at the selection or cursor.
  - **Shortcut**: `Ctrl+C Ctrl+X Ctrl+F` (Mac/Windows/Linux).

- **隐藏强调标记**：
  - 新增 `vorg.hideEmphasisMarkers` 配置，可隐藏 `*` `/` `_` 等标记字符，只保留强调样式；光标移入标记范围时临时显示以便编辑。
- **Hide emphasis markers**:
  - New `vorg.hideEmphasisMarkers` setting hides marker characters while keeping emphasis styling; markers reappear when the cursor enters the range.

## 改进优化 / Improvements

- **链接插入统一**：
  - 输入 `[[` 补全与 `Ctrl+C Ctrl+L` → Heading 均生成跨文件稳定的 `[[id:UUID][标题]]`；目标标题尚无 ID 时，自动写入 `:ID:` 属性。
- **Unified link insertion**:
  - `[[` completion and `Ctrl+C Ctrl+L` → Heading both insert stable cross-file `[[id:UUID][title]]` links and auto-assign `:ID:` when missing.

- **链接导航统一**：
  - `Ctrl+C Ctrl+O`、Ctrl+Click / F12 使用同一套链接解析；支持纯标题、`*标题`、`file:path::*标题` 与 `file:path::#id` 锚点跳转。
- **Unified link navigation**:
  - `Ctrl+C Ctrl+O`, Ctrl+Click, and F12 share one resolver for plain titles, `*title`, and `file:path::*title` / `file:path::#id` anchors.

## Bug 修复 / Bug Fixes

- **嵌套有序列表编号**：修复 Alt/Ctrl+Enter 插入列表项时嵌套有序列表编号错误的问题。
- **Nested ordered list numbering**: Fixed incorrect numbering when inserting items with Alt/Ctrl+Enter in nested ordered lists.

---

更多详细信息请查看 [CHANGELOG.md](CHANGELOG.md)  
See [CHANGELOG.md](CHANGELOG.md) for full details.
