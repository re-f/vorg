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
**高度还原 Emacs Org-mode 的上下文感知编辑 (Alt+Enter & Ctrl+Enter)：**
- 自动识别当前上下文（标题、列表、表格、Property 抽屉等）
- `Alt+Enter` (Meta Return)：在当前行下方插入同级项，支持 checkbox 智能切换，支持非标题行快速转标题
- `Ctrl+Enter` (Ctrl Return)：在当前子树/列表末尾插入新项，或智能分割行并插入标题
- 保持正确的层级、缩进和格式

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
| **智能插入新项** | `Alt+Enter` | `VOrg: Insert New Item` | 对应 Emacs `M-RET`，智能插入标题、列表项或 checkbox |
| **末尾插入或分割** | `Ctrl+Enter` | `VOrg: Ctrl Return (Split)` | 对应 Emacs `C-RET`，在子树末尾插入或智能分割标题 |
| **子树末尾插入** | `Ctrl+Alt+Enter` | `VOrg: Insert New Item at End` | 对应 Emacs `C-M-RET` |
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
- `.org` 和 `.org_archive` - Org-mode 文档文件

## 🔍 工作区索引
为了提供高性能的工作区符号搜索 (`Cmd+T`) 和标签检索，VOrg 会在工作区根目录创建一个名为 `.vorg.db` 的 SQLite 数据库文件。
- **用途**: 存储标题索引、标签和元数据，以实现极速搜索。
- **维护**: 如需重置索引，只需删除此文件并重新加载窗口。
- **Git**: 建议将 `.vorg.db` 添加到 `.gitignore` 文件中，以避免将本地索引提交到代码仓库。

## 📊 嵌入式查询块 (Embedded Query Blocks)
VOrg 支持动态查询块，允许您直接在文档预览中聚合显示整个工作区的标题。

### 语法
使用 `#+BEGIN_QUERY` 块并填入 JSON 格式的查询对象：

```org
#+BEGIN_QUERY
{
  "todo": ["NEXT", "TODO"],
  "priority": "A",
  "tags": ["work"],
  "limit": 5,
  "sortBy": "mtime",
  "order": "desc"
}
#+END_QUERY
```

### 查询参数
- `todo`: 按 TODO 状态过滤（字符串或数组）。
- `priority`: 按优先级过滤（如 "A", "B"）。
- `tags`: 按标签过滤（字符串或数组，匹配任意一个）。
- `searchTerm`: 在标题中搜索（支持 Pinyin 拼音首字母）。
- `limit`: 显示结果的最大数量。
- `sortBy`: 排序字段 (`priority`, `todo`, `deadline`, `mtime`, `level`)。
- `order`: 排序顺序 (`asc` 或 `desc`)。

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