# VOrg 代码结构说明

本项目采用模块化的代码组织方式，为后续添加更多 orgmode 功能提供良好的基础架构。请查看源代码文件顶部的注释获取详细说明信息。
## 查看文档

各模块的详细功能说明请查看源代码文件顶部的 JSDoc 注释：

使用 TypeDoc 生成完整的 HTML 文档：

```bash
# 生成文档
pnpm run docs

# 生成并自动打开文档
pnpm run docs:serve
```

生成的文档会保存在 `docs/api/` 目录中，可以在浏览器中查看完整的 API 文档。
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
│   │   ├── headingCommands.ts    # 标题操作
│   │   ├── todoStateCommands.ts  # TODO 状态管理
│   │   ├── propertyCommands.ts   # Property 管理
│   │   ├── listCommands.ts       # 列表操作
│   │   ├── tableCommands.ts      # 表格操作
│   │   └── codeBlockCommands.ts  # 代码块操作
│   └── types/                # 命令类型定义
│       └── editingTypes.ts   # 编辑相关类型
├── parsers/             # 解析器模块
│   ├── contextAnalyzer.ts   # 上下文分析
│   ├── headingParser.ts     # 标题解析
│   ├── listParser.ts        # 列表解析
│   ├── tableParser.ts       # 表格解析
│   ├── propertyParser.ts    # Property 解析
│   └── linkParser.ts        # 链接解析
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
├── codelens/            # CodeLens 功能
│   └── headingCodeLensProvider.ts  # 标题 CodeLens
├── types/               # 全局类型定义
│   └── index.ts         # 接口和类型定义
└── utils/               # 工具模块
    ├── constants.ts     # 常量定义
    ├── todoKeywordManager.ts  # TODO 关键字管理
    └── linkUtils.ts     # 链接工具函数
```

## 设计原则

1. **单一职责**: 每个模块只负责特定的功能领域
2. **模块化**: 功能按照逻辑关系分组，便于维护和扩展
3. **类型安全**: 使用 TypeScript 接口确保类型安全
4. **常量集中**: 将魔法字符串提取为常量，便于维护
5. **文档内联**: 使用 JSDoc 注释将文档与代码放在一起，便于维护

## 已实现的功能模块

- ✅ `preview/` - 预览功能（HTML 生成、滚动同步）
- ✅ `outline/` - 大纲视图功能
- ✅ `folding/` - 代码折叠功能
- ✅ `links/` - 链接跳转和导航
- ✅ `editing/` - 编辑辅助功能（智能插入、TODO 管理、Property 管理等）
- ✅ `parsers/` - 解析器模块（上下文分析、标题解析等）

## 后续扩展计划

基于当前架构，可以轻松添加以下功能模块：

- `syntax/` - 自定义语法高亮增强
- `export/` - 导出功能（PDF、Markdown 等）
- `completion/` - 自动补全功能（标签、链接等）
- `agenda/` - 日程视图功能

每个新功能都可以作为独立模块开发，不会影响现有功能。

