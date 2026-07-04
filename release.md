# 1.2.1 版本变更 / Release 1.2.1

## 改进优化 / Improvements

- **中英双语更新日志**：
  - `CHANGELOG.md`、`release.md` 与扩展内更新日志面板改为中英对照呈现。
- **Bilingual release notes**:
  - `CHANGELOG.md`, `release.md`, and the in-app changelog panel now show Chinese and English side by side.
- **内嵌更新日志精简**：
  - 更新日志面板条目压缩至规范长度，并补充英文说明。
- **Concise in-app changelog**:
  - Panel entries are shortened and include English descriptions.

---

## 1.2.0 功能摘要 / 1.2.0 Highlights

### 新增功能 / New Features

- **强调格式切换 (org-emphasize)** / **Emphasis toggling**:
  - 使用方法 / Shortcut: `Ctrl+C Ctrl+X Ctrl+F`
- **隐藏强调标记** / **Hide emphasis markers**:
  - 配置项 / Setting: `vorg.hideEmphasisMarkers`

### 改进优化 / Improvements

- **链接插入统一** / **Unified link insertion**:
  - `[[` 补全与 `Ctrl+C Ctrl+L` → Heading 均生成 `[[id:UUID][标题]]`。
  - `[[` completion and `Ctrl+C Ctrl+L` → Heading both insert `[[id:UUID][title]]`.
- **链接导航统一** / **Unified link navigation**:
  - `Ctrl+C Ctrl+O`、Ctrl+Click / F12 支持标题与 `file::` 锚点跳转。
  - `Ctrl+C Ctrl+O`, Ctrl+Click, and F12 support title and `file::` anchor links.

### Bug 修复 / Bug Fixes

- **嵌套有序列表编号** / **Nested ordered list numbering**

---

更多详细信息请查看 [CHANGELOG.md](CHANGELOG.md)  
See [CHANGELOG.md](CHANGELOG.md) for full details.
