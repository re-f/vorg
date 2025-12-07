# 更新日志 / Changelog

## [0.0.7] - 2025-12-07

### ✨ 新增功能

- **ID 链接自动补全功能**：实现 ID 链接的自动补全，提升编辑效率
  - 在输入 `[[` 后自动触发补全
  - 显示所有可用的 ID 链接，包括文件级别的 property ID
  - 支持模糊搜索和快速选择
- **工作区符号搜索功能**：支持在整个工作区中搜索 Org-mode 符号（标题、ID 等）
  - 使用 `Cmd+T` (Mac) 或 `Ctrl+T` (Windows/Linux) 快捷键打开工作区符号搜索
  - 支持模糊搜索，可搜索工作区中所有 .org 文件的标题
  - 显示标题的层级和 TODO 状态
  - 快速跳转到目标标题位置
- **Ctrl+C Ctrl+C 上下文操作功能**：实现类似 Emacs Org-mode 的上下文相关操作
  - 支持 checkbox 状态切换（未完成 ↔ 完成 ↔ 部分完成）
  - 采用可扩展架构，为后续功能（TODO 状态切换、时间戳等）预留空间

### 🔧 改进优化

- **引入符号索引服务和统一日志系统**：
  - 新增符号索引服务，提升符号查找性能
  - 统一日志系统，改善调试和错误追踪

### 🐛 Bug 修复

- **改进 M-RET 对有序列表的支持和自动重新编号功能**：修复有序列表插入新项时的编号问题
- **修复预览滚动问题**：优化预览窗口的滚动同步

---

### ✨ Features

- **ID Link Auto-completion**: Implemented ID link auto-completion to improve editing efficiency
  - Auto-triggered when typing `[[`
  - Display all available ID links, including file-level property IDs
  - Support fuzzy search and quick selection
- **Workspace Symbol Search**: Support searching for Org-mode symbols (headlines, IDs, etc.) across the entire workspace
  - Use `Cmd+T` (Mac) or `Ctrl+T` (Windows/Linux) to open workspace symbol search
  - Support fuzzy search across all .org files in the workspace
  - Display headline levels and TODO states
  - Quick jump to target headline locations
- **Ctrl+C Ctrl+C Context Action**: Implemented context-aware actions similar to Emacs Org-mode
  - Support checkbox state toggling (unchecked ↔ checked ↔ partially checked)
  - Extensible architecture for future features (TODO state switching, timestamps, etc.)

### 🔧 Improvements

- **Symbol Index Service and Unified Logging System**:
  - Added symbol index service to improve symbol lookup performance
  - Unified logging system for better debugging and error tracking

### 🐛 Bug Fixes

- **Improved M-RET Support for Ordered Lists and Auto-renumbering**: Fixed numbering issues when inserting new items in ordered lists
- **Fixed Preview Scroll Issues**: Optimized scroll synchronization in preview window

## [0.0.6]

### ✨ 新增功能

- **HTML 导出功能**：支持将预览内容导出为 HTML 文件
- **标题操作功能和 CodeLens 按钮支持**：
  - 在标题行显示 Promote/Demote 操作按钮
  - 方便快速调整标题层级

### 🐛 Bug 修复

- **修复预览丢失标题问题**：解决预览时标题显示不正确的问题

### ♻️ 代码重构

- **统一链接查找逻辑并支持文件级别 property ID**：
  - 重构链接查找逻辑，提高代码可维护性
  - 支持文件级别的 property ID 链接

---

### ✨ Features

- **HTML Export**: Export preview content as HTML files
- **Headline Operations and CodeLens Button Support**:
  - Display Promote/Demote operation buttons on headline lines
  - Easily adjust headline levels

### 🐛 Bug Fixes

- **Fixed Preview Title Loss Issue**: Resolved incorrect title display in preview

### ♻️ Code Refactoring

- **Unified Link Lookup Logic with File-level Property ID Support**:
  - Refactored link lookup logic to improve code maintainability
  - Support file-level property ID links

## [0.0.5]

### 🐛 Bug 修复

- **修复 headline 行首回车自动缩进问题**：解决在标题行首按回车后自动缩进的问题

### 🔧 改进优化

- **优化文件顶部工具栏**：
  - 删除不必要的按钮
  - 仅在编辑 org 文件时显示相关工具栏按钮

---

### 🐛 Bug Fixes

- **Fixed Auto-indentation Issue on Headline Line Start**: Resolved auto-indentation when pressing Enter at the start of a headline

### 🔧 Improvements

- **Optimized File Top Toolbar**:
  - Removed unnecessary buttons
  - Show relevant toolbar buttons only when editing org files

## [0.0.4]

### 🐛 Bug 修复

- **修复列表复制粘贴缩进问题**：解决复制列表项时缩进不正确的问题
- **修复大文件预览问题**：
  - 优化大 org 文件的预览性能
  - 修复预览位置同步不对齐的问题
  - 统一列表中复选框和普通文本列表的样式
- **修复星号自动闭合问题**：解决插入 `*` 号时自动闭合的问题
- **统一 org-id 链接样式和跳转处理**：
  - ID 链接不再通过 DocumentLinkProvider 创建 URI，避免跳转错误
  - 简化 SyntaxHighlighter 链接高亮逻辑，统一处理所有链接类型
  - 确保 ID 链接、HTTP 链接、文件链接、内部标题链接样式一致

### ✨ 新增功能

- **支持 Meta-Return 和 Ctrl-Return**：
  - `Alt+Enter`：插入新项目（Meta Return）
  - `Ctrl+Alt+Enter`：在末尾插入新项目（Smart Return）
  - `Ctrl+Enter`：分割当前行（Ctrl Return）
- **使用 Webpack 构建**：提升构建性能和代码组织

### ♻️ 代码重构

- **分离 Parser 逻辑**：将解析逻辑从各个 Command 中提取到独立的 Parser 类
- **按功能拆分 editingCommands.ts 模块**：拆分为 8 个独立功能模块

---

### 🐛 Bug Fixes

- **Fixed List Copy-Paste Indentation Issue**: Resolved incorrect indentation when copying list items
- **Fixed Large File Preview Issues**:
  - Optimized preview performance for large org files
  - Fixed preview position synchronization misalignment
  - Unified checkbox and plain text list styles
- **Fixed Asterisk Auto-closing Issue**: Resolved auto-closing when inserting `*`
- **Unified org-id Link Styles and Navigation Handling**:
  - ID links no longer create URIs through DocumentLinkProvider to avoid navigation errors
  - Simplified SyntaxHighlighter link highlighting logic, unified handling of all link types
  - Ensured consistent styles for ID links, HTTP links, file links, and internal headline links

### ✨ Features

- **Support for Meta-Return and Ctrl-Return**:
  - `Alt+Enter`: Insert new item (Meta Return)
  - `Ctrl+Alt+Enter`: Insert new item at end (Smart Return)
  - `Ctrl+Enter`: Split current line (Ctrl Return)
- **Webpack Build**: Improved build performance and code organization

### ♻️ Code Refactoring

- **Separated Parser Logic**: Extracted parsing logic from various Commands into independent Parser class
- **Split editingCommands.ts Module by Function**: Split into 8 independent functional modules

## [0.0.3]

### ✨ 新增功能

- **Property 属性管理**：完整实现 `org-set-property` 功能
  - 自动创建 Property 抽屉（包含唯一 ID）
  - 智能更新现有属性
  - 智能添加新属性
  - 自动缩进对齐
  - 快捷键：`Ctrl+C Ctrl+X P`
- **Property 抽屉折叠支持**
  - 支持 `:PROPERTIES:`/`:END:` 抽屉的折叠和展开
  - 与标题、列表、代码块折叠功能一致
  - 使用 Tab 键智能切换折叠状态

---

### ✨ Features

- **Property Management**: Complete implementation of `org-set-property` functionality
  - Automatically create Property drawer (including unique ID)
  - Intelligently update existing properties
  - Intelligently add new properties
  - Automatic indentation alignment
  - Shortcut: `Ctrl+C Ctrl+X P`
- **Property Drawer Folding Support**
  - Support folding and unfolding of `:PROPERTIES:`/`:END:` drawers
  - Consistent with headline, list, and code block folding functionality
  - Use Tab key to intelligently toggle folding state

## [0.0.2]

### ✨ 新增功能

- **基础 Org-mode 功能实现**
  - 语法高亮支持
  - 大纲视图
  - 智能编辑
  - TODO 状态管理
  - 链接跳转
  - 代码块折叠

### 📦 初始发布

- 完整的 TypeScript 实现
- 基于 uniorg 解析器
- 支持 Org-mode 基本语法

---

### ✨ Features

- **Basic Org-mode Functionality Implementation**
  - Syntax highlighting support
  - Outline view
  - Smart editing
  - TODO status management
  - Link navigation
  - Code block folding

### 📦 Initial Release

- Complete TypeScript implementation
- Based on uniorg parser
- Support for basic Org-mode syntax

## [0.0.1]

### 🎉 首次发布

- VOrg 扩展初始版本
- 基础预览功能
- 简单的 Org-mode 支持

---

### 🎉 First Release

- VOrg extension initial version
- Basic preview functionality
- Simple Org-mode support

---

**格式说明 / Format Legend**

- `✨` 新增功能 / Features
- `🐛` Bug 修复 / Bug Fixes
- `📝` 文档更新 / Documentation Updates
- `🔧` 改进优化 / Improvements
- `⚡` 性能提升 / Performance Improvements
- `🎨` 样式更新 / Style Updates
- `♻️` 代码重构 / Code Refactoring
- `🚀` 发布相关 / Release Related
