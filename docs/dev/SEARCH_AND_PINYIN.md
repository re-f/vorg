# VOrg 搜索与拼音开发约束

本文档只记录后续实现搜索功能时可复用、应长期成立的信息。

一次性背景、问题发现过程、修复经过、为什么做这次改动等内容，应该写在 commit / PR 中，而不是保留在这里。

## 1. 核心原则

VOrg 中的拼音应被视为“匹配数据”，不是“显示数据”。

实现搜索功能时，优先遵守以下原则：

1. 展示文本与匹配文本分离
2. 拼音只进入匹配字段，不进入最终显示字段
3. UI 层不承担搜索逻辑，搜索逻辑集中到可测试的 service
4. 先判断宿主 API 能否分离“显示”和“匹配”，再决定方案

## 2. 搜索能力分类

### 2.1 可自定义匹配字段的入口

这类入口适合支持拼音搜索且不污染显示：

- 自定义 QuickPick
- `CompletionItem.filterText`
- 数据库 / Repository / QueryService 检索
- 自定义 TreeView / 搜索面板

### 2.2 不可自定义匹配字段的入口

这类入口通常无法优雅支持“拼音可搜 + 中文显示”：

- `DocumentSymbol`
- `WorkspaceSymbol`

如果宿主 API 最终只基于显示字段做过滤，就不要把拼音硬塞回显示字段。

## 3. VS Code API 约束

### 3.1 `DocumentSymbol`

`DocumentSymbol` 没有独立的匹配字段，主要可用字段包括：

- `name`
- `detail`
- `range`
- `selectionRange`
- `children`

结论：

- 如果依赖原生 Outline / Document Symbol 搜索，拼音匹配通常只能通过 `name` 间接实现
- 一旦把拼音塞进 `name`，UI 污染风险很高

### 3.2 `WorkspaceSymbol`

`WorkspaceSymbolProvider` / `SymbolInformation` 同样没有类似 `filterText` 的独立匹配字段。

结论：

- 原生工作区符号搜索不适合作为“无显示污染的拼音搜索入口”
- 如果需要优雅的拼音搜索，优先提供自定义入口

### 3.3 `QuickPick`

`createQuickPick()` 会对传入项目再次执行自身过滤。

如果已经在业务层完成自定义搜索，再把结果喂给 QuickPick，仍可能被它的默认过滤隐藏掉。

因此，自定义 QuickPick 搜索必须满足：

- 业务层先自行算出候选结果
- 展示项使用 `alwaysShow: true`
- 不能假设“结果在 `items` 里”就一定会显示出来

### 3.4 `CompletionItem`

补全是少数天然支持“显示/匹配分离”的入口，因为它有：

- `label`
- `filterText`

因此补全场景下可以安全地：

- `label` 只显示真实标题
- `filterText` 包含拼音

不要把这个经验直接套用到 Symbol API。

## 4. 当前搜索实现分层

### 4.1 当前文件标题搜索

当前文件标题搜索应优先基于实时文档内容构建，而不是依赖索引。

适用原因：

- 当前文件内容可能尚未落盘
- 用户通常期望当前文件搜索是即时的
- 不应要求数据库索引已完成

当前实现位置：

- `src/commands/symbolQuickPickCommands.ts`
- `src/services/symbolQuickPickService.ts`

### 4.2 工作区标题搜索

工作区标题搜索应优先复用索引数据。

适用原因：

- 工作区级扫描成本高
- 索引中已包含拼音字段
- 适合做跨文件搜索和排序

当前实现位置：

- `src/commands/symbolQuickPickCommands.ts`
- `src/services/symbolQuickPickService.ts`
- `src/services/orgSymbolIndexService.ts`

### 4.3 原生 Symbol Provider

原生 Symbol Provider 只负责返回干净的显示文本。

当前相关位置：

- `src/outline/orgOutlineProvider.ts`
- `src/outline/orgWorkspaceSymbolProvider.ts`

约束：

- 不要把拼音再塞进 `name`

## 5. 匹配数据的组成建议

做标题搜索时，匹配文本通常可以由以下数据组成：

- 标题纯文本
- 带 TODO / tags 的显示名
- outline path
- 文件相对路径
- 拼音全拼
- 拼音首字母

是否全部加入，取决于功能目标。

建议：

- 当前文件搜索至少包含标题、显示名、outline path、拼音
- 工作区搜索至少包含标题、显示名、路径、outline path、拼音

## 6. 文档中不应记录的内容

以下内容不应长期保留在本文档中：

- 某次修复是怎么发现的
- 哪个截图暴露了问题
- 本次实现替换了什么旧代码
- 某次提交里具体改了哪些文件
- 某次对话中的推理过程

这些内容应进入：

- commit message
- PR description
- issue / RFC / design discussion

本文档只保留“以后类似功能仍应遵守的规则”。

## 7. 后续开发规则

### 7.1 设计前先问四个问题

新增搜索入口前，先确认：

1. 宿主 API 是否支持独立匹配字段？
2. 显示字段会不会直接被 UI 渲染？
3. 是否需要支持拼音？
4. 是否必须依赖原生入口？

如果 1 的答案是否定，且 2 的答案是肯定，就不要把拼音放进显示字段。

### 7.2 不要做的事

- 不要把拼音拼进 `DocumentSymbol.name`
- 不要把拼音拼进 `SymbolInformation.name`
- 不要把“搜索逻辑”散落在 UI 命令里
- 不要假设 QuickPick 不会二次过滤
- 不要把一次性问题背景写进长期文档

### 7.3 推荐做法

- 把搜索条目构建与过滤逻辑放进 service
- UI 层只负责交互、映射与跳转
- 为匹配文本单独定义字段，例如 `searchText`
- 能用索引数据时优先复用索引中的拼音字段
- 当前文件场景优先使用实时解析

## 8. 测试要求

修改搜索相关功能时，至少覆盖以下测试层次。

### 8.1 单元测试

适合验证：

- 条目构建是否正确
- 拼音过滤是否正确
- 展示文本是否干净
- QuickPick 展示项是否带 `alwaysShow`

当前相关文件：

- `src/test/unit/symbolQuickPickService.test.ts`

### 8.2 集成测试

适合验证：

- 命令层是否正确调用搜索 service
- QuickPick 输入变化后，命中项是否仍可见
- 接受当前项后，是否跳转到正确位置

当前相关文件：

- `src/test/suite/symbolQuickPickCommands.test.ts`

### 8.3 最低回归命令

修改搜索逻辑后，至少执行：

```bash
pnpm run compile-tests
pnpm run test:unit
```

如果改到了命令层、QuickPick、原生 Symbol provider 或快捷键行为，建议继续执行扩展宿主测试。

## 9. 未来扩展方向

如果未来还需要更强的拼音搜索能力，优先考虑：

- 强化自定义 QuickPick
- 增加专用搜索面板
- 增加自定义 TreeView
- 在数据库 / 查询层继续扩展可匹配字段

除非 VS Code API 本身提供新的匹配字段，否则不建议重新把拼音塞回原生 Symbol 的显示字段。
