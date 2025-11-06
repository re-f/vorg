# VOrg 快捷键设置

本插件的快捷键设置参考了 Emacs Org-mode 的标准快捷键，旨在为熟悉 Emacs 的用户提供一致的使用体验。

## 快速参考表

| 功能 | 快捷键 | 对应 Emacs |
|------|---------|-----------|
| 切换TODO状态 | `Ctrl+C Ctrl+T` | `C-c C-t` |
| 插入链接 | `Ctrl+C Ctrl+L` | `C-c C-l` |
| 跟随链接 | `Ctrl+C Ctrl+O` | `C-c C-o` |
| 打开预览 | `Ctrl+C Ctrl+E` | `C-c C-e` |
| 添加注释 | `Ctrl+C Ctrl+;` | `C-c C-;` |
| 升级子树 | `Ctrl+C Ctrl+Shift+,` | `C-c C-<` |
| 降级子树 | `Ctrl+C Ctrl+Shift+.` | `C-c C->` |
| Meta Return | `Alt+Enter` | `M-RET` |
| Ctrl Return | `Ctrl+Enter` | `C-RET` |
| Smart Return | `Ctrl+Alt+Enter` | `C-M-RET` |

## 基本快捷键（类似 Emacs Org-mode）

### TODO 项目管理
- `Ctrl+C Ctrl+T` - 切换TODO状态 (类似 `C-c C-t`)
- `Shift+Alt+Enter` - 插入新的TODO标题

### 链接操作
- `Ctrl+C Ctrl+L` - 插入链接 (类似 `C-c C-l`)
- `Ctrl+C Ctrl+O` - 跟随链接 (类似 `C-c C-o`)

### 预览功能
- `Ctrl+C Ctrl+E` - 打开预览 (类似 `C-c C-e`)
- `Ctrl+C Ctrl+K` - 在侧边打开预览

### 编辑和导航
- `Alt+Enter` - Meta Return（在当前元素外部插入同级元素）
- `Ctrl+Enter` - Ctrl Return（在光标处分割当前元素）
- `Ctrl+Alt+Enter` - Smart Return（在子树末尾插入）
- `Tab` - 智能Tab（折叠/展开、缩进）
- `Shift+Tab` - 智能Shift+Tab（反向缩进、全局折叠）

### 标题操作
- `Ctrl+C Ctrl+Shift+,` - 升级子树 (类似 `C-c C-<`，减少标题级别)
- `Ctrl+C Ctrl+Shift+.` - 降级子树 (类似 `C-c C->`，增加标题级别)

### 其他实用快捷键
- `Ctrl+C Ctrl+;` - 添加注释 (类似 `C-c C-;`)
- `Ctrl+C Ctrl+Tab` - 折叠当前节点
- `Ctrl+C Ctrl+Shift+Tab` - 展开当前节点
- `Ctrl+C Ctrl+X Ctrl+B` - 切换侧边栏显示

## 与 Emacs Org-mode 的对应关系

| Emacs Org-mode | VOrg VSCode 扩展 | 功能说明 |
|----------------|------------------|----------|
| `C-c C-t` | `Ctrl+C Ctrl+T` | 切换TODO状态 |
| `C-c C-l` | `Ctrl+C Ctrl+L` | 插入链接 |
| `C-c C-o` | `Ctrl+C Ctrl+O` | 跟随链接 |
| `C-c C-e` | `Ctrl+C Ctrl+E` | 导出/预览 |
| `C-c C-;` | `Ctrl+C Ctrl+;` | 添加注释 |
| `C-c C-<` | `Ctrl+C Ctrl+Shift+,` | 升级子树 |
| `C-c C->` | `Ctrl+C Ctrl+Shift+.` | 降级子树 |
| `M-RET` | `Alt+Enter` | Meta Return |
| `C-RET` | `Ctrl+Enter` | Ctrl Return |
| `C-M-RET` | `Ctrl+Alt+Enter` | Smart Return |
| `TAB` | `Tab` | 智能Tab |
| `S-TAB` | `Shift+Tab` | 智能Shift+Tab |

## 说明

1. **双键组合**: 类似 Emacs，许多快捷键使用 `Ctrl+C` 作为前缀，然后跟随第二个键组合。
2. **跨平台统一**: 在所有平台（包括 Mac）上都使用 `Ctrl` 键，避免与系统快捷键冲突。
3. **上下文敏感**: 所有快捷键只在 `.org` 文件中激活。
4. **渐进学习**: 熟悉 Emacs 用户可以直接使用，新用户也可以逐步学习。

## 为什么 Mac 上也使用 Ctrl 键？

在 Mac 系统上，我们选择使用 `Ctrl` 而不是 `Cmd` 键作为前缀，原因如下：

1. **避免冲突**: `Cmd+C` 和 `Cmd+V` 是 macOS 的系统级快捷键（复制和粘贴），不能被覆盖
2. **保持一致**: 与 Emacs 中的 `C-c` 前缀保持完全一致
3. **跨平台**: 在所有平台上使用相同的快捷键，降低学习成本

## 自定义快捷键

如需修改快捷键，可以通过 VSCode 的键盘快捷键设置进行自定义：
1. 打开 VSCode 设置
2. 搜索 "键盘快捷键"
3. 找到对应的 `vorg.*` 命令进行修改 