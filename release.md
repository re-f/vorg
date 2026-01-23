# 0.0.8 版本变更

## 新增功能

- **智能编辑增强 (Alt+Enter & Ctrl+Enter)**：重构了智能编辑逻辑，使其行为与 Emacs Org-mode 保持一致。
  - `Alt+Enter` (Meta Return)：在当前位置插入新项，智能处理 checkbox 状态，支持非标题行快速转标题。
  - `Ctrl+Enter` (Ctrl Return)：在当前子树/列表末尾插入新项，或智能分割行并插入标题。
- **中文标题拼音搜索支持**：支持在工作区符号搜索和自动补全中使用拼音（首字母或全拼）查找中文标题。

## 改进优化

- **解析器优化**：优化了 `ContextAnalyzer` 对复杂列表和标题结构的解析，提升了编辑操作的准确性。

---

更多详细信息请查看 [CHANGELOG.md](CHANGELOG.md)
