# VOrg - Org-mode Preview for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Downloads](https://img.shields.io/vscode-marketplace/d/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Rating](https://img.shields.io/vscode-marketplace/r/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)

**Language / 语言**: [中文](README-CN.md) | [English](README.md)

VOrg 是一个简单的 VS Code 扩展，为在 VS Code 中实现基本可用的 Org-mode 功能而开发，并不考虑完全迁移 Emacs 上的 Org-mode 使用体验，因此很多功能并不会在组件中实现。相比于 Emacs 的 Org-mode 能称得上优势的功能就是预览体验。 

## ✨ 核心特性

### 🔄 实时预览
- **实时预览**：在编辑的同时实时查看渲染效果
- **滚动同步**：编辑器和预览窗口自动同步滚动

### 🎨 语法高亮
VOrg 提供完整的 Org-mode 语法高亮支持，包括标题、TODO 状态、文本格式、列表、代码块、表格、链接、数学公式、时间戳等。详细的语法高亮说明请参考 [语法高亮文档](docs/SYNTAX_HIGHLIGHTING.md)。

### 📋 智能导航
- **文档大纲**：自动解析文档结构，提供完整的大纲导航
- **快速跳转**：使用 `Ctrl+Shift+O` (Windows/Linux) 或 `Cmd+Shift+O` (Mac) 快速跳转到标题

### 🔗 链接跳转
支持多种链接类型的智能跳转：
- `[[link][description]]` - 带描述的链接
- `[[link]]` - 简单链接  
- `file:path/to/file` - 文件链接
- `http://example.com` - 网页链接
- `[[*heading]]` - 内部链接到同文件的标题
- `[[id:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX][description]]` - 全局ID跳转（支持跨文件）

### 🔗 自动补全
- **ID 链接补全**：输入 `[[` 或 `[[id:` 触发自动补全，显示工作区中所有 org 文件的标题，支持模糊搜索过滤

### ⚡ org-like 编辑功能
**类似 Emacs org-meta-return 和 ctrl-return的 的上下文感知编辑：**
- 自动识别当前上下文（标题、列表、表格、Property 抽屉等）
- 智能插入新元素（标题、列表项、表格行、Property 项等）
- 保持正确的层级和格式

**TAB 智能折叠（类似 Emacs org-mode TAB 行为）：**
- 在标题上：切换折叠/展开状态
- 在列表项上：切换折叠状态或增加缩进
- 在代码块标题上：切换代码块的折叠/展开状态
- 在 Property 抽屉上：切换 Property 抽屉的折叠/展开状态
- 在表格中：移动到下一个单元格
- 在代码块内：正常代码缩进

**Property 管理：**
- 智能设置/更新标题属性
- 自动创建 Property 抽屉（含唯一 ID）
- Property 抽屉折叠支持

## 🚀 快速开始

### 基本使用

| 功能 | 快捷键 | 命令面板 | 说明 |
|------|--------|----------|------|
| **打开预览** | `Ctrl+C Ctrl+E` | `VOrg: Open Preview` | 类似 Emacs `C-c C-e`，点击编辑器右上角预览图标 |
| **并排预览** | `Ctrl+C Ctrl+K` | `VOrg: Open Preview to the Side` | 在侧边打开预览窗口 |
| **TODO 状态切换** | `Ctrl+C Ctrl+T` | `VOrg: Set TODO State` | 类似 Emacs `C-c C-t` |
| **插入TODO标题** | `Shift+Alt+Enter` | `VOrg: Insert TODO Heading` | 快速插入新的TODO标题 |
| **设置属性** | `Ctrl+C Ctrl+X P` | `VOrg: Set Property` | 类似 Emacs `C-c C-x p`，设置/更新标题属性 |
| **跟随链接** | `Ctrl+C Ctrl+O` | `VOrg: Follow Link` | 类似 Emacs `C-c C-o`，或使用 `Ctrl+Click` (Windows/Linux) / `Cmd+Click` (Mac) |
| **插入链接** | `Ctrl+C Ctrl+L` | `VOrg: Insert Link` | 类似 Emacs `C-c C-l` |
| **智能插入新元素** | `Alt+Enter` | `VOrg: Insert New Item` | 类似 Emacs `M-RET`，上下文感知编辑 |
| **分割当前元素** | `Ctrl+Enter` | `VOrg: Ctrl Return (Split)` | 在光标处分割当前结构 |
| **子树末尾插入同级元素** | `Ctrl+Alt+Enter` | `VOrg: Insert New Item at End` | 类似 Emacs `C-M-RET` |
| **智能TAB折叠** | `Tab`/`Shift+Tab` | - | 主要用于可见性控制（折叠/展开切换） |
| **折叠标题** | `Ctrl+C Ctrl+Tab` | `Editor: Fold` | 折叠当前标题 |
| **展开标题** | `Ctrl+C Ctrl+Shift+Tab` | `Editor: Unfold` | 展开当前标题 |
| **切换侧边栏** | `Ctrl+C Ctrl+X Ctrl+B` | `Toggle Sidebar` | 切换侧边栏显示 |
| **添加注释** | `Ctrl+C Ctrl+;` | `Add Line Comment` | 添加行注释 |
| **升级子树** | `Ctrl+C Ctrl+Shift+,` | `VOrg: Promote Subtree` | 类似 Emacs `C-c C-<`，减少标题级别 |
| **降级子树** | `Ctrl+C Ctrl+Shift+.` | `VOrg: Demote Subtree` | 类似 Emacs `C-c C->`，增加标题级别 |
| **文档大纲跳转** | `Ctrl+Shift+O` (Windows/Linux)<br>`Cmd+Shift+O` (Mac) | `Go to Symbol in Workspace` | 快速跳转到标题，查看侧边栏 "Outline" 面板 |
| **更多快捷键** | - | - | 详见 [快捷键文档](docs/KEYBINDINGS.md) 和 [编辑特性](docs/EDITING_FEATURES.md) |


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

### CodeLens 操作按钮

控制是否在编辑器中显示操作按钮（如标题行的 Promote、Demote 等）：

```json
{
  "vorg.showCodeLens": true
}
```

- `true`（默认）：显示操作按钮
- `false`：隐藏操作按钮

当启用时，每个标题行上方会显示操作按钮，点击即可快速执行相应操作。

## 📁 支持的文件类型

- `.org` - Org-mode 文档文件

## 🆚 与其他 Org 扩展的对比

| 功能 | VOrg | 其他 Org 扩展 |
|------|------|---------------|
| 实时预览 | ✅ | ❌ |
| 滚动同步 | ✅ | ❌ |
| 文档大纲 | ✅ | ❌ |
| 链接跳转 | ✅ | ⚠️ |
| org-like 编辑 | ✅ | ❌ |
| TODO 管理 | ✅ | ✅ |

## 🐛 问题反馈

如果您在使用过程中遇到问题或有改进建议：

- 🐛 **问题反馈**：[创建 GitHub Issue](https://github.com/re-f/vorg/issues)
- 💡 **功能建议**：[参与 GitHub Discussions](https://github.com/re-f/vorg/discussions)


## 📝 更新日志

### v0.0.3 (最新)
- ✨ **新增 Property 属性管理**：完整的 `org-set-property` 功能实现

### v0.0.2
- ✨ 基础 Org-mode 功能实现
- 🔄 实时预览和滚动同步
- 📋 文档大纲和智能导航
- ⚡ 智能编辑和折叠功能

## 🔮 路线图

- [ ] 添加 headline 跳转功能
- [ ] 添加图表支持（Mermaid）
- [ ] 支持 refile 功能
- [ ] 支持 headline 的树操作
  - [X]  org-pro/demote-subtree
  - [ ]  cut-subtree
  - [ ]  org-metadown/up
- [ ] todo 相关展示
- [ ] 支持插件或自定义代码
- [X] 提示： 比如 headline 上，提示 promote或者 demote
- [X] 实现 Ctrl-c Ctrl-c 的功能
- [ ] 支持 sql 查询
- [X] bug:vorg 预览时 checkbox 的 list 前没有一个点,导致样式对不上
- [ ] 结构拆分： vorg-core 负责org 格式解析 vorg-publish 

---

**VOrg - 让 Org-mode 编辑更加现代化和高效！** 🚀


*如果这个扩展对您有帮助，请给我们一个⭐️评分！* 