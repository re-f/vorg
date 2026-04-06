# 09 Multi File Apply

## Agent Brief
- 首先阅读：`tasks/refile/PRINCIPLES.md`
- 然后阅读：`tasks/refile/00-context-and-scope.md`
- 最后阅读：本文件
- 本任务可以做什么：
  - 实现消费 `RefilePlan` 的多文件 applier
  - 在写入前重新打开真实文档并做关键校验
  - 生成并应用多文件 `WorkspaceEdit`
- 本任务不能做什么：
  - 不在 applier 中重新实现 planner 规则
  - 不顺带修改 target resolver 的业务策略
  - 不在这里扩展 `copy / reverse / keep`
- 完成后汇报什么：
  - 多文件 applier 如何校验真实文档
  - 哪些失败路径会安全中止
  - 用户现在可以验证哪些跨文件写入结果

## 任务目标
实现真正的多文件 edit applier，把跨文件 `RefilePlan` 转换成安全的 `WorkspaceEdit`。

## 必需行为
- 根据 plan 打开 source/target 文档
- 在写入前验证：
  - source 范围仍然匹配预期 subtree
  - target 位置仍对应预期 headline
- 生成并应用多文件 `WorkspaceEdit`
- 校验失败时安全失败，不做部分写入

## 建议的测试
- `应将跨文件 plan 转换为多文件 WorkspaceEdit`
- `source 文档校验失败时应中止`
- `target 文档校验失败时应中止`
- `单文件 plan 仍可通过同一 applier 正常应用`

## 验收标准
- applier 已能处理多文件 plan
- applier 与 planner 职责清晰分离
- 失败场景不会留下半完成状态

## 完成标准
- 多文件写入路径可运行
- 关键失败路径有测试覆盖
- 没有把索引结果直接当作无需校验的真值
