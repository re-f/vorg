# 1.2.0 版本变更

## 新增功能

- **强调格式切换 (org-emphasize)**：
  - 在选中文本或光标处切换粗体、斜体、下划线、等宽、删除线等 Org 强调格式。
  - **使用方法**：`Ctrl+C Ctrl+X Ctrl+F`（Mac/Windows/Linux 通用）。
- **隐藏强调标记**：
  - 新增 `vorg.hideEmphasisMarkers` 配置，可隐藏 `*` `/` `_` 等标记字符，只保留强调样式；光标移入标记范围时临时显示以便编辑。

## 改进优化

- **链接插入统一**：
  - 输入 `[[` 补全与 `Ctrl+C Ctrl+L` → Heading 均生成跨文件稳定的 `[[id:UUID][标题]]`。
  - 目标标题尚无 ID 时，自动在目标标题下写入 `:ID:` 属性。
- **链接导航统一**：
  - `Ctrl+C Ctrl+O`、Ctrl+Click / F12 使用同一套链接解析。
  - 支持纯标题、`*标题`、`file:path::*标题` 与 `file:path::#id` 锚点跳转。

## Bug 修复

- **嵌套有序列表编号**：修复 Alt/Ctrl+Enter 插入列表项时嵌套有序列表编号错误的问题。

---

更多详细信息请查看 [CHANGELOG.md](CHANGELOG.md)
