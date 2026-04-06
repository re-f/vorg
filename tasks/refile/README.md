# Refile 任务索引

本文件面向人类读者，负责说明这组任务在做什么、当前阶段的范围，以及各文档该怎么使用。

## 目标
- 来源：`requirements/chapters/09_Chapter_9__Refiling_and_Archiving.pdf`
- 当前目标：先实现 `refile`，暂不处理 `archive`
- 开发方式：严格按 TDD 推进，先写 failing tests，再补实现

## 当前阶段范围
- 第一阶段只交付当前文档内、基于 headline subtree 的 `org-refile` MVP
- 当前阶段必须覆盖：
  - 从当前光标所在 headline，移动整个 subtree
  - 目标先只支持当前文档内已有 headline
  - 目标展示为 outline path，便于区分重名标题
  - refile 后插入到目标标题子树末尾，作为最后一个子节点
  - 禁止移动到自身或自身后代下面
  - 移动后需要正确重算 subtree 内所有标题的层级
- 当前阶段暂不覆盖：
  - `org-refile-copy`
  - `org-refile-reverse`
  - 跨文件目标
  - 动态创建父节点
  - `org-refile-keep`
  - `org-log-refile`
  - refile cache
  - 时钟项特殊语义

## 文档结构
- `PRINCIPLES.md`
  - 所有任务都必须遵守的硬约束与执行规范
- `00-context-and-scope.md`
  - 面向 AI/Agent 的阶段技术上下文、实现边界与设计判断
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
1. 先读本文件，理解当前阶段目标与文档结构
2. 执行具体任务时，再读 `PRINCIPLES.md`
3. 对 AI/Agent 执行任务时，再读 `00-context-and-scope.md`
3. 按 `01` 到 `06` 的顺序推进
4. 第一阶段完成后，按 `07` 到 `11` 推进跨文件能力
5. `12` 作为跨文件基础稳定后的候选功能池

## 使用方式
- 人类读者通常先看本文件，再挑选当前要推进的任务文件
- 每个任务文件都内置 `Agent Brief`
- 若将任务交给 AI/Agent 执行，任务文件会要求它先阅读必要的前置文档

例如可以直接这样启动具体任务：

```text
请执行任务：`tasks/refile/0X-xxx.md`
```

如果希望更稳一点，也可以显式补上前置文档：

```text
请按 `tasks/refile/PRINCIPLES.md` 和 `tasks/refile/00-context-and-scope.md` 执行任务：`tasks/refile/0X-xxx.md`
```

## 文档约定
- 用户通常只需要选择当前要推进的任务文件
- AI/Agent 应先阅读该任务文件中 `Agent Brief` 指向的内容，再开始实现
- 若任务文件与 `PRINCIPLES.md` 冲突，以 `PRINCIPLES.md` 为准
- 若任务文件与 `00-context-and-scope.md` 冲突，以范围更保守的约束为准
