# VOrg 快捷键设置

本插件的快捷键设置参考了 Emacs Org-mode 的标准快捷键，旨在为熟悉 Emacs 的用户提供一致的使用体验。

## 快速参考表

| 功能 | 快捷键 | 对应 Emacs |
|------|---------|-----------|
| 切换TODO状态 | `Ctrl+C Ctrl+T` | `C-c C-t` |
| 上下文操作 | `Ctrl+C Ctrl+C` | `C-c C-c` |
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

### TODO 与状态管理
- `Ctrl+C Ctrl+T` - 切换 TODO 状态 (类似 `C-c C-t`)
- `Shift+Alt+Enter` - 插入新的 TODO 标题
- `Shift+Up/Down` - 快速循环切换优先级 (A -> B -> C)

### 属性与元数据
- `Ctrl+C Ctrl+X P` - 设置/更新属性 (类似 `C-c C-x p`)
- `Ctrl+C Ctrl+Q` - 设置标签 (类似 `C-c C-q`)
- `Ctrl+C Ctrl+S` - 设置计划日期 (类似 `C-c C-s`)
- `Ctrl+C Ctrl+D` - 设置截止日期 (类似 `C-c C-d`)

### 上下文操作
- `Ctrl+C Ctrl+C` - 执行当前上下文操作 (类似 `C-c C-c`)
  - 在 Checkbox 上：切换完成状态。
  - 在标题/列表上：执行通用逻辑。

### 链接操作
- `Ctrl+C Ctrl+L` - 插入链接 (类似 `C-c C-l`)
- `Ctrl+C Ctrl+O` - 跟随链接 (类似 `C-c C-o`)

### 预览功能
- `Ctrl+C Ctrl+E` - 在侧边打开预览 (对应 Emacs 导出菜单)
- `Ctrl+C Ctrl+K` - 备用侧边预览方案

### 编辑与结构操作
- `Alt+Enter` - Meta Return (当前位置分割并插入同级元素)
- `Ctrl+Enter` - Ctrl Return (在当前子树末尾插入同级，不分割)
- `Ctrl+Alt+Enter` - 智能末尾插入 (类似 `C-M-RET`)
- `Tab` - 智能 Tab (折叠/展开、缩进切换、表格间跳转)
- `Shift+Tab` - 全局折叠循环或反向缩进
- `Ctrl+C Ctrl+Shift+,` - 升级子树 (类似 `C-c C-<`)
- `Ctrl+C Ctrl+Shift+.` - 降级子树 (类似 `C-c C->`)

### 文档视图与折叠
- `Ctrl+C Ctrl+Tab` - 折叠当前标题
- `Ctrl+C Ctrl+Shift+Tab` - 展开当前标题
- `Ctrl+C Ctrl+X Ctrl+B` - 切换 VS Code 侧边栏显示

---

## 与 Emacs Org-mode 的对应关系

| Emacs Org-mode | VOrg (VS Code) | 功能说明 |
|:---|:---|:---|
| `C-c C-t` | `Ctrl+C Ctrl+T` | 切换 TODO 状态 |
| `C-c C-c` | `Ctrl+C Ctrl+C` | 上下文操作 |
| `C-c C-q` | `Ctrl+C Ctrl+Q` | 设置标签 |
| `C-c C-s` | `Ctrl+C Ctrl+S` | 设置计划日期 (Scheduled) |
| `C-c C-d` | `Ctrl+C Ctrl+D` | 设置截止日期 (Deadline) |
| `C-c C-x p` | `Ctrl+C Ctrl+X P` | 设置属性 |
| `C-c C-l` | `Ctrl+C Ctrl+L` | 插入链接 |
| `C-c C-o` | `Ctrl+C Ctrl+O` | 跟随链接 |
| `M-RET` | `Alt+Enter` | 插入同级项 |
| `C-RET` | `Ctrl+Enter` | 末尾插入同级 |
| `C-M-RET` | `Ctrl+Alt+Enter` | 智能末尾插入 |
| `S-UP/DOWN` | `Shift+Up/Down` | 切换优先级 |
| `C-c C-<` | `Ctrl+C Ctrl+Shift+,` | 升级子树 |
| `C-c C->` | `Ctrl+C Ctrl+Shift+.` | 降级子树 |
| `C-c C-;` | `Ctrl+C Ctrl+;` | 行注释 |

## 说明

1. **双键组合**: 类似 Emacs，许多快捷键使用 `Ctrl+C` 作为前缀，然后跟随第二个键组合。
2. **跨平台统一**: 在所有平台（包括 Mac）上都使用 `Ctrl` 键，避免与系统快捷键冲突。
3. **上下文敏感**: 所有快捷键只在 `.org` 文件中激活。
4. **渐进学习**: 熟悉 Emacs 用户可以直接使用，新用户也可以逐步学习。


## 自定义快捷键

如需修改快捷键，可以通过 VSCode 的键盘快捷键设置进行自定义：
1. 打开 VSCode 设置
2. 搜索 "键盘快捷键"
3. 找到对应的 `vorg.*` 命令进行修改 