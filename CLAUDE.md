# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

VOrg 是一个 VS Code 扩展，为现代 IDE（VS Code、Cursor）带来 Org-mode 支持。提供实时预览、智能编辑命令、链接导航和 TODO 管理。文件与 Emacs Org-mode 完全兼容。

## 构建与测试命令

```bash
pnpm install          # 安装依赖
pnpm run compile      # 编译 TypeScript + webpack
pnpm run watch        # 监听模式（开发）
pnpm run lint         # ESLint 检查
pnpm run test         # 集成测试（需先编译）
pnpm run test:unit    # 仅运行单元测试（145+ 测试用例）
pnpm run pretest      # lint + compile-tests
pnpm run docs         # 使用 typedoc 生成 API 文档
```

在 VS Code 中按 F5 启动扩展开发主机。

## 架构

### 入口
- `src/extension.ts` - 扩展激活入口，注册所有 provider 和命令。保持精简，逻辑委托给各模块。

### 关键技术
- **uniorg / uniorg-parse / uniorg-rehype** - Org-mode AST 解析和 HTML 转换
- **sql.js** - 编译为 WebAssembly 的 SQLite，用于工作区索引
- **s-expression** - VOrgQL 查询语言解析
- **pinyin-pro** - 中文拼音搜索
- **TextMate Grammars** - `syntaxes/org.tmLanguage.json`

### 数据流
1. 文件变更 → `WorkspaceWatcher` → `IncrementalUpdateService`
2. `UniorgAstExtractor` 解析 org 文件 → AST
3. `WorkspaceIndexer` 提取标题、链接、属性 → SQLite (`.vorg.db`)
4. 查询通过 `VOrgQLParser` → SQL → `HeadingRepository`/`LinkRepository`

## 配置

`package.json` 中 TODO 关键字格式：
- `|` 分隔未完成状态和已完成状态
- `@` 记录时间戳，`!` 记录状态变更时的备注
- 示例：`"TODO(t) NEXT(n) WAITING(w) | DONE(d@) CANCELLED(c@)"`

## 文件组织

- `test-data/` - 用于手动测试的示例 org 文件
- `syntaxes/` - TextMate 语法定义
- `docs/guide/` - 用户文档
- `docs/dev/` - 架构和调试指南
- `docs/ref/` - 快捷键和 VOrgQL 参考
