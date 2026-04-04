# 更新日志 / Changelog

## [1.0.0] - 2026-04-04

### ✨ 新增功能

- **VOrg-QL 透视视图 (Perspectives)**：引入了基于 S-Expression 的查询引擎和侧边栏透视视图。
  - **功能描述**：现在可以通过侧边栏的 "Perspectives" 视图快速切换不同的任务视图（如高优先级任务、按文件分组等）。支持实时预览查询结果，并能直接跳转到对应标题。
  - **使用方法**：点击侧边栏的 VOrg 图标，在 "Perspectives" 面板中查看预设视图。点击面板顶部的 "Search/Filter" 按钮可输入自定义 VOrgQL 查询语句（如 `(and (todo "NEXT") (priority "A"))`），点击 "Save Current View" 可以保存当前查询为新的透视视图。
- **全量工作区索引与检索**：实现了基于 SQLite 的本地数据库索引，支持大体量 Org 知识库的快速检索。
  - **功能描述**：插件启动时会自动扫描并索引当前工作区内的所有 `.org` 和 `.org_archive` 文件。
  - **使用方法**：索引过程在后台自动完成。索引完成后，工作区符号搜索（`Cmd+T` / `Ctrl+T`）提升了响应速度，且支持拼音匹配。
- **任务管理增强与 Emacs 标准对齐**：优化了状态切换记录和日期格式。
  - **功能描述**：
    - 在完成任务（切换到 DONE）时，现在会默认记录 `CLOSED` 时间戳，缩进和格式完全对齐 Emacs 标准（如 `CLOSED: [2026-02-02 Mon 19:13]`）。
    - 归一化优先级存储：内部统一使用字母 A/B/C 存储，提升查询效率，同时自动处理 `[#A]` 的显示与写入。
  - **使用方法**：使用 `Ctrl+C Ctrl+T` 切换 TODO 状态，或使用 `Shift+Up/Down` 在标题行快速循环切换优先级。
- **标题标签交互优化**：支持点击标签进行补全与过滤。
  - **使用方法**：在标题末尾输入 `:` 自动触发标签补全。
- **Mermaid 图表预览**：预览与导出 HTML 时支持 Mermaid（流程图、时序图、甘特图等），并随编辑器主题切换明暗样式。

### 🔧 改进优化

- **配置化查询上限**：新增 `vorg.queryLimit` 设置，用户可根据电脑性能调整 VOrgQL 的最大结果返回数量（默认 5000）。
- **拼音检索算法升级**：支持拼音首字母和全拼混合检索，更符合中文用户输入习惯。
- **存储架构优化**：数据库文件 `.vorg.db` 现在存储在工作区根目录下，便于维护和特殊场景下的手动查询。

### 🐛 Bug 修复

- **标签去重机制**：修复了在提取和存储标签时可能出现的重复条目导致的数据库索引冲突。
- **跳转精度修复**：通过 `OffsetMapper` 修正了在复杂文档结构（如包含大段内容或属性抽屉时）点击搜索结果跳转行号不准的问题。
- **中文标签解析**：完善了对包含中文字符的标签（如 `:工作:`）的解析逻辑。

---

### ✨ Features

- **VOrg-QL Perspectives**: Introduced an S-Expression based query engine and a sidebar Perspective view.
  - **Description**: Switch between different task views (e.g., High Priority, Group by File) via the "Perspectives" view in the sidebar. Supports real-time preview and direct navigation.
  - **Usage**: Click the VOrg icon in the activity bar. Use the "Search/Filter" icon to enter custom VOrgQL queries (e.g., `(todo "TODO")`). Use "Save Current View" to persist your custom filters.
- **Full Workspace Indexing**: SQLite-backed local indexing for retrieval of large Org knowledge bases.
  - **Usage**: Automatically indexes all `.org` and `.org_archive` files on startup. Accelerates workspace symbol search (`Cmd+T` / `Ctrl+T`).
- **Enhanced Task Management (Emacs Standard)**: Optimized state transition logging and date formatting.
  - **Description**: 
    - `CLOSED` timestamps are now automatically recorded for DONE states, matching Emacs format (e.g., `CLOSED: [2026-02-02 Mon 19:13]`).
    - Normalized priority storage using A/B/C for efficiency while maintaining `[#A]` syntax in files.
  - **Usage**: Use `Ctrl+C Ctrl+T` for state transitions and `Shift+Up/Down` for priority cycling.
- **Tag Interactions**: Support for tag completion and click-to-filter.
  - **Usage**: Type `:` at the end of a headline to trigger tag completion.
- **Mermaid diagrams**: Render Mermaid blocks in preview and exported HTML (flowcharts, sequence diagrams, Gantt, etc.), with light/dark styling aligned to the editor theme.

### 🔧 Improvements

- **Configurable Query Limits**: New `vorg.queryLimit` setting to adjust the maximum number of results (default: 5000).
- **Advanced Pinyin Retrieval**: Support for mixed shorthand and full pinyin search.
- **Improved Storage Architecture**: The `.vorg.db` file is now stored in the workspace root by default for easier maintenance.

### 🐛 Bug Fixes

- **Tag De-duplication**: Fixed database index conflicts caused by duplicate tag entries.
- **Navigation Precision**: Fixed inaccurate line jumps in complex documents using the new `OffsetMapper`.
- **Chinese Tag Parsing**: Improved parsing logic for tags containing Chinese characters.

## [0.0.8] - 2026-01-23

### ✨ 新增功能

- **编辑命令增强 (Alt+Enter & Ctrl+Enter)**：重构了编辑逻辑，使其行为与 Emacs Org-mode 保持一致
  - `Alt+Enter` (Meta Return)：在当前位置插入新项，处理 checkbox 状态，并在非标题/列表位置支持将当前行转换为标题
  - `Ctrl+Enter` (Ctrl Return)：在当前子树/列表后插入新标题或列表项，或在文本中分割并插入新标题
  - 优化了 `ContextAnalyzer` 对复杂结构的解析，提升了编辑体验的连贯性
- **中文标题拼音搜索支持**：支持在工作区符号搜索和自动补全中使用拼音查找中文标题
  - 使用 `Cmd+T` (Mac) 或 `Ctrl+T` (Windows/Linux) 打开工作区符号搜索，输入拼音首字母或全拼即可找到对应的中文标题
  - 提升了对包含大量中文内容的 Org 文件的检索效率 

---

### ✨ Features

- **Editing Enhancements (Alt+Enter & Ctrl+Enter)**: Refactored editing logic to match Emacs Org-mode behavior
  - `Alt+Enter` (Meta Return): Insert new item at current position, handle checkbox states, and support converting current line to headline in non-headline/list areas
  - `Ctrl+Enter` (Ctrl Return): Insert new headline/list item after current subtree/list, or split text and insert new headline
  - Optimized `ContextAnalyzer` for complex structures, improving overall editing consistency
- **Pinyin Search for Chinese Headlines**: Support finding Chinese headlines using Pinyin in workspace symbol search and auto-completion
  - Open workspace symbol search with `Cmd+T` (Mac) or `Ctrl+T` (Windows) and type Pinyin initials or full Pinyin to find corresponding Chinese headlines
  - Improved retrieval efficiency for Org files containing extensive Chinese content

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
  - 更新现有属性
  - 添加新属性
  - 自动缩进对齐
  - 快捷键：`Ctrl+C Ctrl+X P`
- **Property 抽屉折叠支持**
  - 支持 `:PROPERTIES:`/`:END:` 抽屉的折叠和展开
  - 与标题、列表、代码块折叠功能一致
  - 使用 Tab 键切换折叠状态

---

### ✨ Features

- **Property Management**: Complete implementation of `org-set-property` functionality
  - Automatically create Property drawer (including unique ID)
  - Update existing properties
  - Add new properties
  - Automatic indentation alignment
  - Shortcut: `Ctrl+C Ctrl+X P`
- **Property Drawer Folding Support**
  - Support folding and unfolding of `:PROPERTIES:`/`:END:` drawers
  - Consistent with headline, list, and code block folding functionality
  - Use Tab key to toggle folding state

## [0.0.2]

### ✨ 新增功能

- **基础 Org-mode 功能实现**
  - 语法高亮支持
  - 大纲视图
  - 快捷编辑
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
  - Quick editing
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
