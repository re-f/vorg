# 08 Cross File Planning

## Agent Brief
- 首先阅读：`tasks/refile/PRINCIPLES.md`
- 然后阅读：`tasks/refile/00-context-and-scope.md`
- 最后阅读：本文件
- 本任务可以做什么：
  - 扩展 planner，使其支持 source/target 位于不同文件
  - 定义跨文件 `RefilePlan`
  - 保持第一阶段单文件 planner 行为兼容
- 本任务不能做什么：
  - 不直接应用 `WorkspaceEdit`
  - 不在 planner 中读取 Quick Pick 或活动编辑器状态
  - 不在本任务中处理所有索引同步细节
- 完成后汇报什么：
  - planner 新增了哪些跨文件能力
  - 新增了哪些核心单元测试
  - 单文件与跨文件 plan 的差异在哪里

## 任务目标
让 planner 从“单文件编辑计划”升级为“可描述跨文件 refile 的编辑计划”。

## 必需行为
- source 和 target 可以来自不同文档
- `RefilePlan` 能明确表达：
  - 在 source 文档删除 subtree
  - 在 target 文档插入重算层级后的 subtree
- 单文件与多文件路径都通过同一套 planner 抽象输出
- 继续拒绝非法 target

## 建议补强的模型
- `RefilePlan`
  - 显式带上文档标识
  - 显式区分 source edit 与 target edit
- 如有必要，可引入：
  - `PlannedDocumentEdit`
  - `RefileValidationResult`

## 建议的测试
- `应生成跨文件 refile plan`
- `跨文件 plan 应同时包含 source 删除与 target 插入`
- `应保持 subtree 内部相对层级不变`
- `source 与 target 同文件时应继续兼容第一阶段`

## 验收标准
- planner 已不再隐含“source 与 target 一定同文件”
- 单文件与多文件场景都能通过统一输出表达
- 纯逻辑测试仍占主导

## 完成标准
- planner 的跨文件输出稳定可用
- 相关单元测试通过
- applier 可以在不理解业务规则的前提下消费该 plan
