# VOrg - Use Org-mode in Modern IDEs

[![Version](https://img.shields.io/vscode-marketplace/v/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Downloads](https://img.shields.io/vscode-marketplace/d/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Rating](https://img.shields.io/vscode-marketplace/r/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)

**Language**: [English](README.md) | [中文](README-CN.md)

VOrg is an Org-mode implementation built for the VS Code ecosystem. Rather than attempting to fully replicate Emacs Org-mode, VOrg makes pragmatic trade-offs in a modern IDE environment: sacrificing redundant extensibility in exchange for a native IDE completion experience, a lower learning curve, and integration with AI coding assistants.

---

## ❓ FAQ

**Q1: Why do we need VOrg in the VS Code ecosystem?**
The popularity of modern IDEs like Cursor and VS Code has improved coding efficiency. VOrg's original intention is to allow veteran Org-mode users to continue using the familiar plain-text philosophy to record tasks and organize logic without leaving these modern toolchains.

**Q2: What is the scope and boundary of VOrg's support?**
VOrg focuses on satisfying the daily editing and management needs of 95% of scenarios, rather than completely reproducing all modules of Emacs.
- **Core Syntax**: Deep support for headings, lists, tables, Property Drawers, timestamps, etc.
- **Editing Commands**: Implemented core interaction habits like `M-RET` and `TAB` cycling.
- **Non-goals**: Does not support code block execution (Babel) and Elisp extensions at present.

**Q3: Can files flow freely between Emacs and VOrg?**
**Yes.** VOrg strictly adheres to the standard Org-mode syntax specifications. Files created or edited by VOrg are still standard Org documents in Emacs, and vice versa.

**Q4: Compared to traditional Org-mode, what modern enhancements does VOrg bring?**
In a VS Code-like environment, VOrg provides several completion and search features that better fit IDE habits:
1. **Smart Search Aggregation**: Built-in global search dashboard, supporting Pinyin initial filtering for headings.
2. **High-Performance Real-Time Preview**: Real-time sync rendering, supporting code highlighting.
3. **Direct Image Insertion (WIP)**: Supports dragging or pasting images into the editing area, automatically managing local resource links.

---

## ⚡ Three Core Capabilities

### 1. Deep Compatibility & Instant Feedback
VOrg ensures that `.org` document structures are completely preserved in both the editor and previewer:
- **Parsing Engine**: Based on `uniorg`, respecting Org-mode indentation, Property Drawers, and complex table alignment rules.
- **Preview Experience**: Provides a lighter and more modern rendering presentation than traditional methods.

### 2. Modernized Completion & Retrieval
VOrg introduces interaction paradigms that better fit modern developers:
- **Cross-File ID Completion**: Type `[[` or `[[id:` to search headings workspace-wide and insert stable `[[id:UUID][title]]` links; missing `:ID:` properties are assigned automatically.
- **Unified Link Insertion**: `Ctrl+C Ctrl+L` → Heading uses the same cross-file id-link flow as `[[` completion.
- **Unified Link Navigation**: `Ctrl+C Ctrl+O`, Ctrl+Click, and F12 follow the same resolver, including `file:path::*title` and `file:path::#id` anchors.
- **VOrgQL Custom Views**: A declarative query block inspired by `org-ql`, allowing users to dynamically aggregate cross-file to-do tasks within documents.

### 3. Use Org-mode in Modern IDEs
In Cursor or VS Code, AI tools can understand the structured documents organized by VOrg:
- **Structured Dialogue**: Let AI assist in reconstructing outlines based on the Org document hierarchy, or generate structured subtasks.
- **IDE Native Integration**: Deeply adapted to the sidebar outline, file system, Pinyin initial search, and VS Code's integrated shortcut system.

---

## ✨ Core Features

- **Complete Syntax Support**: Headings, lists, tables, code blocks, Property Drawers, timestamps, etc. [View detailed syntax support](docs/guide/SYNTAX.md)
- **Context-Aware Operations (`M-RET` / `C-RET`)**: Smartly insert sibling headings, split lists, handle checkboxes, or insert new table rows.
- **TAB Cycling Folding (`org-cycle`)**: Full realization of visibility switching among `FOLDED` -> `CHILDREN` -> `SUBTREE`.
- **Task State Tracking**: Automatically records timestamps and notes when toggling TODO states (supports `@` and `!` markers).

---

## ⌨️ Shortcuts at a Glance

| Feature | Shortcut | Emacs Command |
|------|--------|----------------|
| **Open Preview** | `Ctrl+C Ctrl+E` | `org-export-dispatch` (preview) |
| **Smart New Item** | `Alt+Enter` | `org-meta-return` |
| **Split / End Insert** | `Ctrl+Enter` | `org-ctrl-return` |
| **Toggle TODO State** | `Ctrl+C Ctrl+T` | `org-todo` |
| **Set Property** | `Ctrl+C Ctrl+X P` | `org-set-property` |
| **Promote/Demote Subtree** | `Ctrl+C Ctrl+Shift+,/.` | `org-promote/demote-subtree` |
| **Follow Link** | `Ctrl+C Ctrl+O` | `org-open-at-point` |
| **Set Tags** | `Ctrl+C Ctrl+Q` | `org-set-tags-command` |
| **Schedule / Deadline** | `Ctrl+C Ctrl+S/D` | `org-scheduled / org-deadline` |
| **Smart TAB Folding** | `Tab` / `Shift+Tab` | `org-cycle / org-shifttab` |

> See the full list in [docs/ref/KEYBINDINGS.md](docs/ref/KEYBINDINGS.md)  
> **Troubleshooting?** Check the [Debugging Guide](docs/dev/DEBUG.md)


## 📁 Storage & Privacy
VOrg generates a `.vorg.db` file in your workspace root for high-speed indexing. This file only stores headings, tags, and metadata. It will not upload any data, and it is recommended to add it to `.gitignore`.

## 🤝 Community
If you have any suggestions or problems, welcome to visit:
- 🐛 **Bugs**: [GitHub Issues](https://github.com/re-f/vorg/issues) 
- 💡 **Ideas**: [GitHub Discussions](https://github.com/re-f/vorg/discussions)

---

**VOrg - Continuing Org-mode productivity in modern development environments!** 🚀
