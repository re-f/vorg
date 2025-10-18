# VOrg 代码结构说明

本项目采用模块化的代码组织方式，为后续添加更多 orgmode 功能提供良好的基础架构。

## 目录结构

```
src/
├── extension.ts          # 主扩展入口文件
├── commands/            # 命令相关模块
│   ├── index.ts         # 命令模块导出
│   ├── editingCommands.ts   # 编辑命令协调器
│   ├── previewCommands.ts   # 预览命令处理
│   ├── linkCommands.ts      # 链接命令处理
│   ├── debugCommands.ts     # 调试命令
│   ├── editing/             # 编辑功能子模块
│   │   ├── contextAnalyzer.ts    # 上下文分析
│   │   ├── headingCommands.ts    # 标题操作
│   │   ├── todoStateCommands.ts  # TODO 状态管理
│   │   ├── propertyCommands.ts   # Property 管理
│   │   ├── listCommands.ts       # 列表操作
│   │   ├── tableCommands.ts      # 表格操作
│   │   └── codeBlockCommands.ts  # 代码块操作
│   └── types/                # 命令类型定义
│       └── editingTypes.ts   # 编辑相关类型
├── preview/             # 预览功能模块
│   ├── index.ts         # 预览模块导出
│   ├── previewManager.ts   # 预览窗口管理
│   ├── htmlGenerator.ts    # HTML 生成器
│   └── scrollSync.ts       # 滚动同步功能
├── outline/             # 大纲视图模块
│   └── orgOutlineProvider.ts  # 大纲提供器
├── folding/             # 折叠功能模块
│   └── orgFoldingProvider.ts  # 折叠提供器
├── links/               # 链接功能模块
│   └── orgLinkProvider.ts     # 链接提供器
├── types/               # 全局类型定义
│   └── index.ts         # 接口和类型定义
└── utils/               # 工具模块
    ├── constants.ts     # 常量定义
    └── todoKeywordManager.ts  # TODO 关键字管理
```

## 模块说明

### `extension.ts`
- 扩展的主入口文件
- 负责激活扩展和注册功能
- 保持简洁，主要逻辑委托给各个模块

### `commands/` 目录
- **editingCommands.ts**: 编辑命令协调器，注册所有编辑相关命令
- **previewCommands.ts**: 处理预览相关的命令注册和事件监听
- **linkCommands.ts**: 处理链接跳转和导航相关命令
- **debugCommands.ts**: 调试和开发辅助命令
- **editing/**: 编辑功能模块化实现
  - **contextAnalyzer.ts**: 分析当前编辑位置的上下文环境
  - **headingCommands.ts**: 标题的插入、解析、折叠等操作
  - **todoStateCommands.ts**: TODO 状态的设置和转换日志管理
  - **propertyCommands.ts**: Property 抽屉的创建、查找和更新
  - **listCommands.ts**: 列表和复选框的插入、缩进、折叠操作
  - **tableCommands.ts**: 表格行插入和单元格导航
  - **codeBlockCommands.ts**: 代码块的插入和折叠操作
- **types/editingTypes.ts**: 编辑相关的类型定义

### `preview/` 目录
- **previewManager.ts**: 管理预览窗口的生命周期，包括创建、更新、销毁
- **htmlGenerator.ts**: 负责将 org 内容转换为 HTML，包括样式和脚本
- **scrollSync.ts**: 处理编辑器和预览窗口之间的滚动同步

### `outline/` 目录
- **orgOutlineProvider.ts**: 提供文档大纲和符号导航功能
- 实现 VS Code 的 DocumentSymbolProvider 接口

### `folding/` 目录
- **orgFoldingProvider.ts**: 提供代码折叠功能
- 支持标题、列表、代码块等的智能折叠

### `links/` 目录
- **orgLinkProvider.ts**: 提供链接识别和跳转功能
- 支持文件链接、ID 链接、URL 链接等

### `types/` 目录
- 定义项目中使用的 TypeScript 接口和类型
- 为类型安全提供保障

### `utils/` 目录
- **constants.ts**: 存放项目中使用的常量，如命令名称、面板类型等
- **todoKeywordManager.ts**: 管理 TODO 关键字配置和状态转换

## 设计原则

1. **单一职责**: 每个模块只负责特定的功能领域
2. **模块化**: 功能按照逻辑关系分组，便于维护和扩展
3. **类型安全**: 使用 TypeScript 接口确保类型安全
4. **常量集中**: 将魔法字符串提取为常量，便于维护
5. **可扩展性**: 为后续添加语法高亮、编辑辅助等功能预留架构空间

## 已实现的功能模块

- ✅ `preview/` - 预览功能（HTML 生成、滚动同步）
- ✅ `outline/` - 大纲视图功能
- ✅ `folding/` - 代码折叠功能
- ✅ `links/` - 链接跳转和导航
- ✅ `editing/` - 编辑辅助功能（智能插入、TODO 管理、Property 管理等）

## 后续扩展计划

基于当前架构，可以轻松添加以下功能模块：

- `syntax/` - 自定义语法高亮增强
- `export/` - 导出功能（PDF、Markdown 等）
- `completion/` - 自动补全功能（标签、链接等）
- `snippets/` - 代码片段功能
- `agenda/` - 日程视图功能

每个新功能都可以作为独立模块开发，不会影响现有功能。 