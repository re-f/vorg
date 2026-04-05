# Refile 任务索引

## 目标
- 来源：`requirements/chapters/09_Chapter_9__Refiling_and_Archiving.pdf`
- 当前目标：先实现 `refile`，暂不处理 `archive`
- 开发方式：严格按 TDD 推进，先写 failing tests，再补实现

## 文档结构
- `PRINCIPLES.md`
  - 所有任务都必须遵守的原则、边界和可扩展性约束
- `00-context-and-scope.md`
  - 需求来源、MVP 范围、暂不覆盖内容、为什么先做文档内 MVP
- `01-domain-rules.md`
  - 任务 1：定义领域规则
- `02-refile-planner.md`
  - 任务 2：实现纯逻辑 planner
- `03-target-resolver.md`
  - 任务 3：实现 target 收集与展示模型
- `04-command-layer.md`
  - 任务 4：实现命令层
- `05-integration-tests.md`
  - 任务 5：补集成测试
- `06-command-registration.md`
  - 任务 6：注册命令与快捷键

## 推荐执行顺序
1. 先读 `PRINCIPLES.md`
2. 再读 `00-context-and-scope.md`
3. 按 `01` 到 `06` 的顺序推进

## 推荐启动方式
每个任务文件都已内置 `Agent Brief`，包含：
- 开始前需要阅读的文件
- 本次只做什么
- 本次不要做什么
- 完成后如何汇报

因此，推荐直接用下面这句启动具体任务：

```text
请执行任务：`tasks/refile/0X-xxx.md`
```

如果希望更稳一点，也可以显式补上前置文档：

```text
请按 `tasks/refile/PRINCIPLES.md` 和 `tasks/refile/00-context-and-scope.md` 执行任务：`tasks/refile/0X-xxx.md`
```

## 使用约定
- 用户通常只需要选择当前要推进的任务文件
- 大模型应先阅读该任务文件中 `Agent Brief` 指向的内容，再开始实现
- 若任务文件与 `PRINCIPLES.md` 冲突，以 `PRINCIPLES.md` 为准
- 若任务文件与 `00-context-and-scope.md` 冲突，以范围更保守的约束为准

## 当前建议
- 第一阶段只交付当前文档内、基于 headline subtree 的 `org-refile` MVP
- 但实现必须按可扩展架构设计，避免未来支持跨文件时接近重做

## 第一批 failing tests
1. `应提取当前 headline 的完整 subtree 范围`
2. `应把 subtree 重挂到目标 headline 下并重算层级`
3. `应拒绝 refile 到自身子树内部`
4. `应在命令层通过 quick pick 选择目标并应用编辑`
