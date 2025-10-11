# VOrg - Org-mode Preview for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Downloads](https://img.shields.io/vscode-marketplace/d/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Rating](https://img.shields.io/vscode-marketplace/r/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)

VOrg 是一个功能强大的 VS Code 扩展，为 Org-mode 文档提供完整的编辑和预览体验，类似于 Markdown Preview Enhanced。它将 Emacs Org-mode 的强大功能带到 VS Code 中，让您可以在现代化的编辑环境中享受 Org-mode 的所有优势。

## ✨ 核心特性

### 🔄 实时预览
- **并排预览**：在编辑的同时实时查看渲染效果
- **滚动同步**：编辑器和预览窗口自动同步滚动
- **主题适配**：自动适应 VS Code 的明暗主题

### 🎨 语法高亮
VOrg 提供完整的 Org-mode 语法高亮支持，包括标题、TODO 状态、文本格式、列表、代码块、表格、链接、数学公式、时间戳等。详细的语法高亮说明请参考 [语法高亮文档](docs/SYNTAX_HIGHLIGHTING.md)。

### 📋 智能导航
- **文档大纲**：自动解析文档结构，提供完整的 Outline 导航
- **快速跳转**：使用 `Ctrl+Shift+O` (Windows/Linux) 或 `Cmd+Shift+O` (Mac) 快速跳转到标题

### 🔗 智能链接跳转
支持多种链接类型的智能跳转：
- `[[link][description]]` - 带描述的链接
- `[[link]]` - 简单链接  
- `file:path/to/file` - 文件链接
- `http://example.com` - 网页链接
- `[[*heading]]` - 内部链接到同文件的标题
- `[[id:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX][description]]` - 全局ID跳转（支持跨文件）

### ⚡ 智能编辑功能
**类似 Emacs org-meta-return 的上下文感知编辑：**
- 自动识别当前上下文（标题、列表、表格等）
- 智能插入新元素（标题、列表项、表格行等）
- 保持正确的层级和格式

**TAB 智能折叠（类似 Emacs org-mode TAB 行为）：**
- 在标题上：切换折叠/展开状态
- 在列表项上：切换折叠状态或增加缩进
- 在代码块标题上：切换代码块的折叠/展开状态
- 在表格中：移动到下一个单元格
- 在代码块内：正常代码缩进

## 🚀 快速开始

### 基本使用

| 功能 | 快捷键 | 命令面板 | 说明 |
|------|--------|----------|------|
| **打开预览** | `Ctrl+C Ctrl+E` | `VOrg: Open Preview` | 类似 Emacs `C-c C-e`，点击编辑器右上角预览图标 |
| **并排预览** | `Ctrl+C Ctrl+K` | `VOrg: Open Preview to the Side` | 在侧边打开预览窗口 |
| **TODO 状态切换** | `Ctrl+C Ctrl+T` | `VOrg: Toggle TODO` | 类似 Emacs `C-c C-t` |
| **插入TODO标题** | `Shift+Alt+Enter` | `VOrg: Insert TODO Heading` | 快速插入新的TODO标题 |
| **跟随链接** | `Ctrl+C Ctrl+O` | `VOrg: Follow Link` | 类似 Emacs `C-c C-o`，或使用 `Ctrl+Click` (Windows/Linux) / `Cmd+Click` (Mac) |
| **插入链接** | `Ctrl+C Ctrl+L` | `VOrg: Insert Link` | 类似 Emacs `C-c C-l` |
| **智能插入新元素** | `Alt+Enter` | `VOrg: Smart Insert` | 类似 Emacs `M-RET`，上下文感知编辑 |
| **子树末尾插入同级元素** | `Ctrl+Alt+Enter` | `VOrg: Insert Sibling at End` | 类似 Emacs `C-M-RET` |
| **智能TAB折叠** | `Tab` | - | 主要用于可见性控制（折叠/展开切换） |
| **智能反向TAB** | `Shift+Tab` | - | 在列表中减少缩进，在表格中反向导航 |
| **文档大纲跳转** | `Ctrl+Shift+O` (Windows/Linux)<br>`Cmd+Shift+O` (Mac) | `Go to Symbol in Workspace` | 快速跳转到标题，查看侧边栏 "Outline" 面板 |


## 🛠️ 配置选项

### TODO 关键字自定义

您可以在 VS Code 设置中自定义 TODO 关键字：

```json
{
  "vorg.todoKeywords": "TODO(t) NEXT(n) WAITING(w) | DONE(d) CANCELLED(c)",
  "vorg.defaultTodoKeyword": "TODO"
}
```

- `|` 前为未完成状态，`|` 后为已完成状态
- 示例：`"PreSale InDelivery HANGUP(@/!) End(@/!) | Terminated(@/!) DONE(@/!)"`

## 📁 支持的文件类型

- `.org` - Org-mode 文档文件

## 🆚 与其他 Org 扩展的对比

| 功能 | VOrg | 其他 Org 扩展 |
|------|------|---------------|
| 实时预览 | ✅ | ❌ |
| 滚动同步 | ✅ | ❌ |
| 文档大纲 | ✅ | ❌ |
| 链接跳转 | ✅ | ⚠️ |
| 智能编辑 | ✅ | ❌ |
| TODO 管理 | ✅ | ✅ |

## 🐛 问题反馈

如果您在使用过程中遇到问题或有改进建议：

- 🐛 **问题反馈**：[创建 GitHub Issue](https://github.com/vorg/vorg/issues)
- 💡 **功能建议**：[参与 GitHub Discussions](https://github.com/vorg/vorg/discussions)


## 🔮 路线图

- [ ] 添加图表支持（Mermaid）
- [ ] 支持 refile 功能
- [ ] 简单的 headline 搜索功能
- [ ] 缓存工作区中 org 文件元数据



---

**VOrg - 让 Org-mode 编辑更加现代化和高效！** 🚀

*如果这个扩展对您有帮助，请给我们一个⭐️评分！* 