# VOrg - Org-mode Preview for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Downloads](https://img.shields.io/vscode-marketplace/d/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Rating](https://img.shields.io/vscode-marketplace/r/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)

**Language / 语言**: [中文](README.md) | [English](README-EN.md)

VOrg is a simple VS Code extension developed to provide basic Org-mode functionality in VS Code. It doesn't aim to completely replicate the Emacs Org-mode experience, so many features are not implemented in this component. The main advantage over Emacs Org-mode is the preview experience.

## ✨ Core Features

### 🔄 Real-time Preview
- **Real-time Preview**: View rendered effects while editing
- **Scroll Synchronization**: Automatic scroll synchronization between editor and preview window

### 🎨 Syntax Highlighting
VOrg provides complete Org-mode syntax highlighting support, including headings, TODO states, text formatting, lists, code blocks, tables, links, math formulas, timestamps, and more. For detailed syntax highlighting documentation, please refer to [Syntax Highlighting Documentation](docs/SYNTAX_HIGHLIGHTING.md).

### 📋 Smart Navigation
- **Document Outline**: Automatically parses document structure and provides complete Outline navigation
- **Quick Jump**: Use `Ctrl+Shift+O` (Windows/Linux) or `Cmd+Shift+O` (Mac) to quickly jump to headings

### 🔗 Link Navigation
Supports intelligent navigation for multiple link types:
- `[[link][description]]` - Links with descriptions
- `[[link]]` - Simple links
- `file:path/to/file` - File links
- `http://example.com` - Web links
- `[[*heading]]` - Internal links to headings in the same file
- `[[id:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX][description]]` - Global ID navigation (supports cross-file)

### ⚡ Org-like Editing Features
**Context-aware editing similar to Emacs org-meta-return:**
- Automatically recognizes current context (headings, lists, tables, etc.)
- Intelligently inserts new elements (headings, list items, table rows, etc.)
- Maintains correct hierarchy and formatting

**TAB Smart Folding (similar to Emacs org-mode TAB behavior):**
- On headings: Toggle fold/expand state
- On list items: Toggle fold state or increase indentation
- On code block headings: Toggle code block fold/expand state
- In tables: Move to next cell
- In code blocks: Normal code indentation

## 🚀 Quick Start

### Basic Usage

| Feature | Shortcut | Command Palette | Description |
|---------|----------|-----------------|-------------|
| **Open Preview** | `Ctrl+C Ctrl+E` | `VOrg: Open Preview` | Similar to Emacs `C-c C-e`, click preview icon in editor top-right |
| **Side Preview** | `Ctrl+C Ctrl+K` | `VOrg: Open Preview to the Side` | Open preview window in sidebar |
| **TODO State Toggle** | `Ctrl+C Ctrl+T` | `VOrg: Toggle TODO` | Similar to Emacs `C-c C-t` |
| **Insert TODO Heading** | `Shift+Alt+Enter` | `VOrg: Insert TODO Heading` | Quickly insert new TODO heading |
| **Follow Link** | `Ctrl+C Ctrl+O` | `VOrg: Follow Link` | Similar to Emacs `C-c C-o`, or use `Ctrl+Click` (Windows/Linux) / `Cmd+Click` (Mac) |
| **Insert Link** | `Ctrl+C Ctrl+L` | `VOrg: Insert Link` | Similar to Emacs `C-c C-l` |
| **Smart Insert New Element** | `Alt+Enter` | `VOrg: Smart Insert` | Similar to Emacs `M-RET`, context-aware editing |
| **Insert Sibling at End** | `Ctrl+Alt+Enter` | `VOrg: Insert Sibling at End` | Similar to Emacs `C-M-RET` |
| **Smart TAB Folding** | `Tab`/`Shift+Tab` | - | Mainly for visibility control (fold/expand toggle) |
| **Document Outline Jump** | `Ctrl+Shift+O` (Windows/Linux)<br>`Cmd+Shift+O` (Mac) | `Go to Symbol in Workspace` | Quick jump to headings, check "Outline" panel in sidebar |

## 🛠️ Configuration Options

### TODO Keywords Customization

You can customize TODO keywords in VS Code settings:

```json
{
  "vorg.todoKeywords": "TODO(t) NEXT(n) WAITING(w) | DONE(d) CANCELLED(c)",
  "vorg.defaultTodoKeyword": "TODO"
}
```

- Before `|` are incomplete states, after `|` are completed states
- Example: `"PreSale InDelivery HANGUP(@/!) End(@/!) | Terminated(@/!) DONE(@/!)"`

## 📁 Supported File Types

- `.org` - Org-mode document files

## 🆚 Comparison with Other Org Extensions

| Feature | VOrg | Other Org Extensions |
|---------|------|---------------------|
| Real-time Preview | ✅ | ❌ |
| Scroll Synchronization | ✅ | ❌ |
| Document Outline | ✅ | ❌ |
| Link Navigation | ✅ | ⚠️ |
| Org-like Editing | ✅ | ❌ |
| TODO Management | ✅ | ✅ |

## 🐛 Issue Reporting

If you encounter problems or have improvement suggestions:

- 🐛 **Issue Reporting**: [Create GitHub Issue](https://github.com/vorg/vorg/issues)
- 💡 **Feature Suggestions**: [Join GitHub Discussions](https://github.com/vorg/vorg/discussions)

## 🔮 Roadmap

- [ ] Add chart support (Mermaid)
- [ ] Support refile functionality

---

**VOrg - Making Org-mode editing more modern and efficient!** 🚀

*If this extension helps you, please give us a ⭐️ rating!*
