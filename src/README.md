# VOrg 代码结构说明

本项目采用模块化的代码组织方式，为后续添加更多 orgmode 功能提供良好的基础架构。

## 目录结构

```
src/
├── extension.ts          # 主扩展入口文件
├── commands/            # 命令相关模块
│   ├── index.ts         # 命令模块导出
│   └── previewCommands.ts  # 预览命令处理
├── preview/             # 预览功能模块
│   ├── index.ts         # 预览模块导出
│   ├── previewManager.ts   # 预览窗口管理
│   ├── htmlGenerator.ts    # HTML 生成器
│   └── scrollSync.ts       # 滚动同步功能
├── types/               # 类型定义
│   └── index.ts         # 接口和类型定义
└── utils/               # 工具模块
    └── constants.ts     # 常量定义
```

## 模块说明

### `extension.ts`
- 扩展的主入口文件
- 负责激活扩展和注册功能
- 保持简洁，主要逻辑委托给各个模块

### `commands/` 目录
- **previewCommands.ts**: 处理预览相关的命令注册和事件监听
- 为后续添加其他 orgmode 命令（如插入表格、生成目录等）预留空间

### `preview/` 目录
- **previewManager.ts**: 管理预览窗口的生命周期，包括创建、更新、销毁
- **htmlGenerator.ts**: 负责将 org 内容转换为 HTML，包括样式和脚本
- **scrollSync.ts**: 处理编辑器和预览窗口之间的滚动同步

### `types/` 目录
- 定义项目中使用的 TypeScript 接口和类型
- 为类型安全提供保障

### `utils/` 目录
- **constants.ts**: 存放项目中使用的常量，如命令名称、面板类型等
- 为后续添加更多工具函数预留空间

## 设计原则

1. **单一职责**: 每个模块只负责特定的功能领域
2. **模块化**: 功能按照逻辑关系分组，便于维护和扩展
3. **类型安全**: 使用 TypeScript 接口确保类型安全
4. **常量集中**: 将魔法字符串提取为常量，便于维护
5. **可扩展性**: 为后续添加语法高亮、编辑辅助等功能预留架构空间

## 后续扩展计划

基于当前架构，可以轻松添加以下功能模块：

- `syntax/` - 语法高亮相关功能
- `editing/` - 编辑辅助功能（如自动补全、代码片段等）
- `export/` - 导出功能（HTML、PDF 等）
- `outline/` - 大纲视图功能
- `search/` - 搜索和导航功能

每个新功能都可以作为独立模块开发，不会影响现有的预览功能。 