# 02 Refile Planner

## Agent Brief
- 开始前先阅读：
  - `tasks/refile/PRINCIPLES.md`
  - `tasks/refile/00-context-and-scope.md`
  - `tasks/refile/01-domain-rules.md`
  - 当前任务文件
- 本次只做：
  - 实现纯逻辑 `refilePlanner`
  - 把 subtree 提取、层级重算、编辑计划生成沉淀到可测试模块
  - 为 planner 补足单元测试
- 本次不要做：
  - Quick Pick
  - 命令接线
  - `WorkspaceEdit` 应用层
  - 命令注册
- 完成后汇报：
  - planner 的入口、输入输出是什么
  - 新增了哪些单元测试
  - 哪些验收点已经满足
  - 还有哪些约束留待后续任务处理

## 任务目标
实现 `refile` 的纯逻辑 planner，把 subtree 提取、层级重算和编辑计划生成沉淀到可测试模块。

## 本任务必须遵守
- 先读 `PRINCIPLES.md`
- planner 不直接依赖 `activeTextEditor`
- planner 不直接调用 `showQuickPick`
- planner 不直接操作 VS Code `WorkspaceEdit`

## 建议模块
- `src/services/refile/refilePlanner.ts`
  - 或 `src/parsers/refilePlanner.ts`

## 建议职责
- 找到当前 subtree 范围
- 提取 subtree 原文
- 计算目标插入层级
- 重写 subtree 内所有 headline 的星号层级
- 生成可应用的编辑计划

## 输入建议
- `RefileSource`
- `RefileTarget`
- 当前文档文本或必要的结构化上下文

## 输出建议
- `RefilePlan`
  - 包含删除 source 的编辑意图
  - 包含向 target 插入内容的编辑意图
  - 可区分单文件与未来多文件场景

## 必须优先验证的行为
- 简单 subtree 可以被完整提取
- source 移到目标下后，根标题层级正确变化
- source 的所有子标题保持相对层级不变
- 非法 target 不会生成计划

## 建议测试
1. `应把 subtree 重挂到目标 headline 下并重算层级`
2. `应保持 subtree 内部相对层级不变`
3. `应为单文件 refiling 生成删除与插入计划`
4. `非法目标不应生成 refile plan`

## 验收点
- `refilePlanner` 或等价模块中不出现对 `activeTextEditor`、`showQuickPick`、`WorkspaceEdit` 的直接依赖。
- 给定固定 fixture、`RefileSource` 和合法 `RefileTarget`，planner 能返回完整的 `RefilePlan`，其中同时包含删除 source 和向 target 插入内容的编辑意图。
- 至少有一条测试验证 source 重挂到目标下后，根标题层级正确变化，且 subtree 内所有子标题的相对层级保持不变。
- 至少有一条测试对 `RefilePlan` 的关键字段做精确断言，包括删除范围、插入位置和插入文本。
- 对非法目标至少有一条测试验证 planner 不会产出可执行计划，并返回明确的非法结果。

## 完成标准
- planner 的核心逻辑已有完整单元测试
- planner 的输入输出足够稳定，可供 command layer 调用
- planner 尚未引入任何“当前文档唯一目标”的硬编码假设
