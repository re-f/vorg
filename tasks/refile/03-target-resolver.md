# 03 Target Resolver

## Agent Brief
- 开始前先阅读：
  - `tasks/refile/PRINCIPLES.md`
  - `tasks/refile/00-context-and-scope.md`
  - `tasks/refile/01-domain-rules.md`
  - 当前任务文件
- 本次只做：
  - 实现当前文档内的 target resolver
  - 构建 outline path
  - 过滤非法目标
  - 生成展示数据与业务目标对象
- 本次不要做：
  - `showQuickPick`
  - 命令接线
  - 跨文件索引接入
  - `WorkspaceEdit`
- 完成后汇报：
  - resolver 输出了哪些对象
  - 如何区分业务信息与展示信息
  - 新增了哪些单元测试
  - 从用户视角当前可以测什么、还不能直接测什么
  - 哪些验收点已经满足

## 任务目标
把“可 refile 到哪里”的目标解析从命令层中剥离出来，形成可测试、可扩展的 target resolver。

## 本任务必须遵守
- 先读 `PRINCIPLES.md`
- resolver 负责目标建模，不负责 UI
- Quick Pick 只是展示层，不应成为目标逻辑本身

## 第一阶段范围
- 只扫描当前文档 headline
- 为每个候选目标构建 outline path
- 过滤非法目标
- 生成可供 Quick Pick 展示的数据结构

## 未来扩展方向
- 从“扫描当前文档”扩展为“查询工作区索引”
- 从“单文件目标”扩展为“跨文件目标”
- 复用同一套 `RefileTarget` 结构

## 建议能力
- 扫描当前文档所有 headline
- 构建 outline path
- 过滤 source 本身
- 过滤 source 子树内的后代标题
- 生成 target 与展示项的映射

## 必须优先验证的行为
- 能正确列出当前文档所有合法目标
- 重名标题能通过 outline path 区分
- source 自身和 source 后代不会出现在候选列表中

## 建议测试
1. `应扫描当前文档并返回合法 target 列表`
2. `应为重名 headline 构建 outline path`
3. `应过滤 source 本身`
4. `应过滤 source 子树内部的目标`

## 验收点
- target resolver 独立于命令层存在，核心实现不直接依赖 `showQuickPick` 或 `QuickPickItem`。
- 对固定 org fixture，resolver 返回的候选集合等于“当前文档所有 headline”减去 `source` 与 `source` 子树内全部标题。
- 至少有一条测试覆盖重名 headline，断言其 outline path 或等价展示字段可以稳定区分。
- 至少有一条测试分别验证：`source` 自身不会出现在候选列表中，`source` 的后代标题不会出现在候选列表中。
- resolver 的返回值中，业务目标信息与展示信息能够清晰区分，便于未来替换为工作区索引来源。

## 完成标准
- resolver 已独立于命令层存在
- target 的展示信息与业务信息已分离
- 未来接入工作区索引时，resolver 的外部接口不需要大改
