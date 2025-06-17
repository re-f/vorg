# VOrg - Org-mode Preview for VS Code

VOrg 是一个 VS Code 扩展，提供 Org-mode 文档的实时预览功能，类似于 Markdown Preview。它允许用户在编辑 Org-mode 文档的同时，实时查看渲染后的效果。

## 功能特点

- 实时预览 Org-mode 文档
- 支持 Org-mode 语法高亮
- 提供类似 Markdown Preview 的预览体验
- 支持实时更新
- 支持滚动同步
- 支持主题适配

## 使用方法

1. 打开 Org-mode 文件
2. 使用以下方式之一打开预览：
   - 点击编辑器右上角的预览图标
   - 使用命令面板执行 `VOrg: Open Preview`
   - 使用快捷键 `Ctrl+Shift+V`（Windows/Linux）或 `Cmd+Shift+V`（Mac）

## 支持的功能

- 标题层级（使用 * 标记）
- 列表（有序和无序）
- 链接
- 代码块
- 表格
- 引用
- 任务列表
- 时间戳
- 标签

## 注意事项

- 预览会实时更新，无需手动刷新
- 支持 VS Code 的主题，预览样式会自动适应
- 可以同时打开多个预览窗口
- 支持预览窗口的缩放和布局调整

## 安装

1. 打开 VS Code
2. 按下 `Ctrl+Shift+X`（Windows/Linux）或 `Cmd+Shift+X`（Mac）打开扩展面板
3. 搜索 "VOrg"
4. 点击安装

## 开发

### 构建

```bash
npm install
npm run compile
```

### 运行

1. 打开项目
2. 按下 F5 启动调试
3. 在新窗口中打开一个 .org 文件
4. 使用命令面板执行 "VOrg: Open Preview"

## 许可证

MIT 