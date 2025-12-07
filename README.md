# VOrg - Org-mode Preview for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Downloads](https://img.shields.io/vscode-marketplace/d/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)
[![Rating](https://img.shields.io/vscode-marketplace/r/vorg.vorg)](https://marketplace.visualstudio.com/items?itemName=vorg.vorg)

**Language**: [中文](README-CN.md) | [English](README.md)

VOrg is a simple VS Code extension developed to provide basic Org-mode functionality in VS Code. It doesn't aim to completely replicate the Emacs Org-mode experience, so many features are not implemented in this component. The main advantage over Emacs Org-mode is the preview experience.

## ✨ Core Features

### 🔄 Real-time Preview
- **Real-time Preview**: View rendered effects while editing
- **Scroll Synchronization**: Automatic scroll synchronization between editor and preview window

### 🎨 Syntax Highlighting
VOrg provides complete Org-mode syntax highlighting support, including headings, TODO states, text formatting, lists, code blocks, tables, links, math formulas, timestamps, and more. For detailed information, please refer to [Syntax Highlighting Documentation](docs/SYNTAX_HIGHLIGHTING.md).

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

### 🔗 Auto Completion
- **ID Link Completion**: Type `[[` or `[[id:` to trigger auto-completion, showing all available headings from workspace org files. Supports fuzzy search filtering.

### ⚡ Org-like Editing Features
**Context-aware editing similar to Emacs org-meta-return:**
- Automatically recognizes current context (headings, lists, tables, Property drawers, etc.)
- Intelligently inserts new elements (headings, list items, table rows, Property items, etc.)
- Maintains correct hierarchy and formatting

**TAB Smart Folding (similar to Emacs org-mode TAB behavior):**
- On headings: Toggle fold/expand state
- On list items: Toggle fold state or increase indentation
- On code block headings: Toggle code block fold/expand state
- On Property drawers: Toggle Property drawer fold/expand state
- In tables: Move to next cell
- In code blocks: Normal code indentation

**Property Management:**
- Intelligently set/update heading properties
- Automatically create Property drawers (with unique ID)
- Property drawer folding support

## 🚀 Quick Start

### Basic Usage

| Feature | Shortcut | Command Palette | Description |
|---------|----------|-----------------|-------------|
| **Open Preview** | `Ctrl+C Ctrl+E` | `VOrg: Open Preview` | Similar to Emacs `C-c C-e`, click preview icon in editor top-right |
| **Side Preview** | `Ctrl+C Ctrl+K` | `VOrg: Open Preview to the Side` | Open preview window in sidebar |
| **TODO State Toggle** | `Ctrl+C Ctrl+T` | `VOrg: Set TODO State` | Similar to Emacs `C-c C-t` |
| **Insert TODO Heading** | `Shift+Alt+Enter` | `VOrg: Insert TODO Heading` | Quickly insert new TODO heading |
| **Set Property** | `Ctrl+C Ctrl+X P` | `VOrg: Set Property` | Similar to Emacs `C-c C-x p`, set/update heading properties |
| **Follow Link** | `Ctrl+C Ctrl+O` | `VOrg: Follow Link` | Similar to Emacs `C-c C-o`, or use `Ctrl+Click` (Windows/Linux) / `Cmd+Click` (Mac) |
| **Insert Link** | `Ctrl+C Ctrl+L` | `VOrg: Insert Link` | Similar to Emacs `C-c C-l` |
| **Smart Insert New Element** | `Alt+Enter` | `VOrg: Insert New Item` | Similar to Emacs `M-RET`, context-aware editing |
| **Insert Sibling at End** | `Ctrl+Alt+Enter` | `VOrg: Insert New Item at End` | Similar to Emacs `C-M-RET` |
| **Smart TAB Folding** | `Tab`/`Shift+Tab` | - | Mainly for visibility control (fold/expand toggle) |
| **Fold Heading** | `Ctrl+C Ctrl+Tab` | `Editor: Fold` | Fold current heading |
| **Unfold Heading** | `Ctrl+C Ctrl+Shift+Tab` | `Editor: Unfold` | Unfold current heading |
| **Toggle Sidebar** | `Ctrl+C Ctrl+X Ctrl+B` | `Toggle Sidebar` | Toggle sidebar display |
| **Add Comment** | `Ctrl+C Ctrl+;` | `Add Line Comment` | Add line comment |
| **Promote Subtree** | `Ctrl+C Ctrl+Shift+,` | `VOrg: Promote Subtree` | Similar to Emacs `C-c C-<`, decrease heading level |
| **Demote Subtree** | `Ctrl+C Ctrl+Shift+.` | `VOrg: Demote Subtree` | Similar to Emacs `C-c C->`, increase heading level |
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

### CodeLens Action Buttons

Control whether to show action buttons (like Promote, Demote on heading lines) in the editor:

```json
{
  "vorg.showCodeLens": true
}
```

- `true` (default): Show action buttons
- `false`: Hide action buttons

When enabled, action buttons will appear above each heading line for quick access to operations.

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

- 🐛 **Issue Reporting**: [Create GitHub Issue](https://github.com/re-f/vorg/issues)
- 💡 **Feature Suggestions**: [Join GitHub Discussions](https://github.com/re-f/vorg/discussions)


## 📝 Changelog

### v0.0.3 (Latest)
- ✨ **Added Property Management**: Complete `org-set-property` functionality implementation

### v0.0.2
- ✨ Basic Org-mode functionality implementation
- 🔄 Real-time preview and scroll synchronization
- 📋 Document outline and smart navigation
- ⚡ Smart editing and folding features

## 🔮 Roadmap

- [X] Add headline navigation functionality
- [ ] Add chart support (Mermaid)
- [ ] Support refile functionality
- [ ] Support headline tree operations
  - [X]  org-pro/demote-subtree
  - [ ]  cut-subtree
  - [ ]  org-metadown/up
- [ ] TODO-related display
- [ ] Support plugins or custom code
- [X] Hints: e.g., on headlines, show hints for promote or demote
- [X] Implement Ctrl-c Ctrl-c functionality
- [ ] Support SQL queries
- [ ] Bug: In tables, using meta-return and ctrl-return currently doesn't behave correctly
- [X] Bug: In vorg preview, checkbox lists don't have a dot in front, causing style mismatch
- [ ] Structure split: vorg-core responsible for org format parsing, vorg-publish 

---

**VOrg - Making Org-mode editing more modern and efficient!** 🚀

*If this extension helps you, please give us a ⭐️ rating!*
