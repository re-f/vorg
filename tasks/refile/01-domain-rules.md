# 01 Domain Rules

## Agent Brief
- 开始前先阅读：
  - `tasks/refile/PRINCIPLES.md`
  - `tasks/refile/00-context-and-scope.md`
  - 当前任务文件
- 本次只做：
  - 定义 `refile` 的领域概念、边界和非法情形
  - 编写不依赖 VS Code API 的单元测试
  - 产出 `RefileSource`、`RefileTarget`、`RefilePlan` 或等价抽象
- 本次不要做：
  - Quick Pick
  - 命令接线
  - `WorkspaceEdit`
  - 跨文件 refile
- 完成后汇报：
  - 新增或修改了哪些文件
  - 新增了哪些单元测试
  - 哪些验收点已经满足
  - 从用户视角当前可以测什么、还不能直接测什么
  - 下一步最自然衔接哪个任务

## 任务目标
先把 `refile` 的输入、输出和边界定义清楚，为后续 planner 和命令层提供稳定语义。

## 本任务必须遵守
- 先读 `PRINCIPLES.md`
- 先写单元测试，不接 VS Code API
- 本任务只定义规则，不负责 UI 和命令接线

## 需要明确的概念
- source
  - 当前 subtree 的来源信息
- target
  - 目标 headline 的位置、层级、outline path
- result
  - 一组将 source 从原位置移除并插入到目标位置的编辑意图

## 需要明确的规则
- 如何识别当前 headline 对应的完整 subtree
- 如何定义目标插入位置
- refile 后 source 根标题应变为哪一级
- subtree 内后代标题如何跟随整体重算层级
- source 是否允许 refile 到目标子树中

## 必须覆盖的 invalid cases
- 目标是 source 本身
- 目标位于 source 子树内部
- 光标不在 headline 上
- 当前文档内没有可用目标

## 本任务建议产出
- `RefileSource` 的最小字段集合
- `RefileTarget` 的最小字段集合
- `RefilePlan` 的最小字段集合
- 一组纯逻辑单元测试，验证领域规则

## 建议的第一批测试
1. `应提取当前 headline 的完整 subtree 范围`
2. `应识别目标为 source 本身时非法`
3. `应识别目标位于 source 子树内部时非法`
4. `应根据目标层级推导 source 新层级`

## 验收点
- 存在仅覆盖 refile 领域逻辑的单元测试，且测试实现不依赖 `vscode` 或其他 VS Code 扩展 API。
- 已定义 `RefileSource`、`RefileTarget`、`RefilePlan` 或等价类型，并且测试中至少有一处以最小字段集合构造并断言其语义。
- 至少有一条测试能对固定 org 文本断言当前 headline 的完整 subtree 范围，与预期边界完全一致。
- 至少有两条独立测试分别覆盖“目标为 source 自身”和“目标位于 source 子树内部”这两类非法目标，且返回明确的非法结果而非静默成功。
- 至少有一条测试对给定目标层级下的 source 新层级做精确断言，避免使用模糊描述。

## 完成标准
- 领域规则已能脱离 VS Code API 被描述清楚
- 单元测试能够表达 source/target/result 的核心语义
- 没有把“当前文档”写死到领域模型本身
