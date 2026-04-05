# 04 Command Layer

## Agent Brief
- 开始前先阅读：
  - `tasks/refile/PRINCIPLES.md`
  - `tasks/refile/00-context-and-scope.md`
  - `tasks/refile/02-refile-planner.md`
  - `tasks/refile/03-target-resolver.md`
  - 当前任务文件
- 本次只做：
  - 实现 `refile` 命令层 orchestration
  - 串联 resolver、Quick Pick、planner、applier
  - 处理取消、无目标、非法位置等 UX 分支
- 本次不要做：
  - 把核心文本逻辑塞回命令函数
  - 命令注册到 `package.json`
  - 跨文件实现
  - `copy` / `reverse` 变体
- 完成后汇报：
  - 命令层如何编排调用链
  - 哪些失败路径已经处理
  - 新增了哪些测试
  - 哪些验收点已经满足

## 任务目标
实现 `refile` 命令层，把交互、上下文获取和编辑执行串起来，但不把核心规则塞回命令函数。

## 本任务必须遵守
- 先读 `PRINCIPLES.md`
- 命令层只负责 orchestration
- 命令层不直接承担 subtree 提取、层级重算、编辑计划生成

## 建议模块
- `src/commands/editing/refileCommands.ts`

## 建议职责
- 获取当前 editor 和当前 headline
- 调用 target resolver 获取候选目标
- 通过 `showQuickPick` 让用户选目标
- 调用 planner 生成 `RefilePlan`
- 调用 applier 应用编辑
- 处理取消、无目标、非法位置等情况

## 第一阶段范围
- 当前文档内 refile
- 单文件 edit
- 目标通过 Quick Pick 选择

## 需要处理的 UX 情况
- 没有活动编辑器
- 当前文件不是 org 文档
- 光标不在 headline 上
- 没有可选目标
- 用户取消 Quick Pick
- planner 返回非法目标或空计划

## 建议测试重点
- 能从当前光标位置触发 refile
- 能通过 Quick Pick 选择目标
- 取消操作时不修改文档
- 非法位置时给出合理提示或安全返回

## 验收点
- 命令执行路径遵循“获取 headline -> resolver -> Quick Pick -> planner -> applier”的编排顺序，且各环节只在上一步成功后才继续。
- 在无活动编辑器、非 org 文档、光标不在 headline、无候选目标、用户取消 Quick Pick、planner 返回非法结果等场景下，applier 不会被调用。
- 至少有一条测试验证成功路径中 applier 接收到的 `RefilePlan` 与 planner 返回值一致，命令层本身不做 subtree 文本拼接或层级重算。
- 至少有一条测试验证取消或失败路径下文档内容保持不变，不出现部分移动或残留 subtree。
- 命令层对提示信息、取消操作和空候选等 UX 分支有明确处理，不把核心规则重新塞回命令函数。

## 完成标准
- 命令层已经通过 resolver、planner、applier 组合完成流程
- 没有把核心文本规则重新塞回命令函数
- 后续接入跨文件 resolver / applier 时，命令层只需要小改
