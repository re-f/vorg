# VOrg - 在现代 IDE 中使用 Org-mode

[![Version](https://img.shields.io/vscode-marketplace/v/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Downloads](https://img.shields.io/vscode-marketplace/d/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Rating](https://img.shields.io/vscode-marketplace/r/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)

**Language / 语言**: [English](README.md) | [中文](README-CN.md)

VOrg 是一个为 VS Code 生态打造的 Org-mode 实现。VOrg 并非试图完全复刻 Emacs Org-mode，而是在现代 IDE 环境下做出务实取舍：牺牲冗余的扩展性，换取 IDE 原生的补全体验、更低的学习曲线以及与 AI 编程助手的集成。

---

## ❓ 常见疑惑 (FAQ)

**Q1: 为什么在 VS Code 生态中需要 VOrg？**
Cursor、VS Code 等现代 IDE 的普及提升了编码效率。VOrg 的初衷是让 Org-mode 的老用户在不离开这些现代工具链的前提下，依然能用熟悉的纯文本哲学来记录任务、组织逻辑。

**Q2: VOrg 的支持程度与边界在哪里？**
VOrg 专注于满足 95% 场景的日常编辑与管理需求，而不是完全复刻 Emacs 的所有模块。
- **核心语法**：深度支持标题、列表、表格、Property Drawers、时间戳等。
- **编辑命令**：实现了 `M-RET`、`TAB` 循环等核心交互习惯。
- **非目标**：暂不支持代码块执行（Babel）及 Elisp 扩展。

**Q3: 文件能在 Emacs 间自由流转吗？**
**可以。** VOrg 严格遵守 Org-mode 标准语法规范。VOrg 创建或编辑的文件在 Emacs 中依然是标准的 Org 文档，反之亦然。

**Q4: 相比传统 Org-mode，VOrg 带来了哪些现代化增强？**
在 VS Code-like 环境中，VOrg 提供了几项更符合 IDE 习惯的补全与搜索功能：
1. **智能搜索聚合**：内置全局搜索看板，支持拼音首字母过滤标题。
2. **高性能实时预览**：实时同步渲染，支持代码高亮。
3. **直接插入图片 (实现中)**：支持拖拽或粘贴图片到编辑区，自动管理本地资源链接。

---

## ⚡ 三大核心能力

### 1. 深度兼容与即时反馈
VOrg 确保 `.org` 文档结构在编辑器和预览器中都得到完整保留：
- **解析引擎**：基于 `uniorg`，尊重 Org-mode 缩进、Property Drawers 及复杂的表格对齐规则。
- **预览体验**：提供比传统方式更轻量、更加现代化的渲染呈现。

### 2. 补全与检索的现代化增强
VOrg 引入了更符合现代开发者的交互方式：
- **跨文件 ID 补全**：输入 `[[id:` 即可快速检索全工作区的标题 ID 并自动插入，便捷构建跨文件链接。
- **VOrgQL 定制视图**：受 `org-ql` 启发的声明式查询块，允许用户在文档内动态汇聚跨文件的待办任务。

### 3. 在当前流行 IDE 中使用 Org-mode
在 Cursor 或 VS Code 中，AI 工具可以理解由 VOrg 组织的结构化文档：
- **结构化对话**：让 AI 基于 Org 文档层级辅助重构大纲，或者生成结构化的子任务。
- **IDE 原生整合**：深度适配侧边栏大纲、文件系统、拼音首字母搜索及 VS Code 集成的快捷键体系。

---

## ✨ 核心特性

- **完整的语法支持**：标题、列表、表格、代码块、Property Drawers、时间戳等。[查看语法支持详情](docs/guide/SYNTAX.md)
- **上下文感知操作 (`M-RET` / `C-RET`)**：智能插入同级标题、分割列表、处理复选框或表格新行。
- **TAB 循环折叠 (`org-cycle`)**：完整实现 `FOLDED` -> `CHILDREN` -> `SUBTREE` 的可见性切换。
- **任务状态追踪**：TODO 状态切换时自动记录时间戳和备注（支持 `@` 和 `!` 标记）。

---

## ⌨️ 快捷键速览

| 功能 | 快捷键 | 对应 Emacs 命令 |
|------|--------|----------------|
| **打开预览** | `Ctrl+C Ctrl+E` | `org-export-dispatch` (预览) |
| **智能插入新项** | `Alt+Enter` | `org-meta-return` |
| **末尾插入/分割** | `Ctrl+Enter` | `org-ctrl-return` |
| **TODO 状态切换** | `Ctrl+C Ctrl+T` | `org-todo` |
| **设置属性** | `Ctrl+C Ctrl+X P` | `org-set-property` |
| **升级/降级子树** | `Ctrl+C Ctrl+Shift+,/.` | `org-promote/demote-subtree` |
| **跟随链接** | `Ctrl+C Ctrl+O` | `org-open-at-point` |
| **设置标签** | `Ctrl+C Ctrl+Q` | `org-set-tags-command` |
| **设置计划/截止** | `Ctrl+C Ctrl+S/D` | `org-scheduled / org-deadline` |
| **智能 TAB 折叠** | `Tab` / `Shift+Tab` | `org-cycle / org-shifttab` |

> 完整快捷键列表请参考 [快捷键文档](docs/ref/KEYBINDINGS.md)  
> **遇到问题？** 查看 [调试指南](docs/dev/DEBUG.md)


## 📁 存储与隐私
VOrg 在工作区根目录生成 `.vorg.db` 文件用于高性能索引。该文件仅存储标题、标签及元数据，不会上传任何数据，建议将其加入 `.gitignore`。

## 🤝 参与贡献
如有任何建议或问题，欢迎访问：
- 🐛 [GitHub Issues](https://github.com/re-f/vorg/issues) 
- 💡 [GitHub Discussions](https://github.com/re-f/vorg/discussions)

---

**VOrg - 在现代开发环境中延续 Org-mode 的生产力！** 🚀