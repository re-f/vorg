# Refile Principles

## 适用范围
本文件对 `tasks/refile` 下的所有任务都生效。

## 核心目标
- 第一阶段交付一个稳定、可测试的当前文档内 `org-refile` MVP
- 同时保留未来扩展到“索引驱动的跨文件写操作”的架构空间

## 必须遵守的原则

### 1. 严格 TDD
- 先写 failing tests，再补实现
- 先从纯逻辑测试开始，再接命令层和集成测试
- 每个任务完成后，都应能说明新增测试验证了什么行为

### 2. 命令层只做 orchestration
- 命令层负责：
  - 获取当前 editor / selection / document
  - 调用 resolver / planner / applier
  - 处理 Quick Pick、提示信息、取消操作
- 命令层不应直接承担 subtree 提取、层级重算、文本拼接等核心规则

### 3. 核心规则尽量纯函数化
- subtree 范围识别
- 目标合法性判断
- 层级重算
- 编辑计划生成

这些能力应尽量独立于 VS Code API，优先写成可直接单测的纯逻辑。

### 4. 不能把“当前文档”写死进核心层
- 第一阶段虽然只支持当前文档 target
- 但核心 planner 不应假设 source 和 target 永远来自同一文档
- “当前文档限制”应尽量只存在于 resolver 或 command wiring，而不是 planner 本身

### 5. 抽象 source / target / plan
至少应保留这些概念边界：
- `RefileSource`
  - 描述 source subtree 所在文档、起止范围、原始文本、根标题层级
- `RefileTarget`
  - 描述 target 所在文档、插入点、目标层级、outline path
- `RefilePlan`
  - 描述整个 refile 将产生哪些编辑

### 6. UI 与目标解析分离
- Quick Pick 是交互层，不应承担目标建模职责
- 目标对象应先被 resolver 构建出来
- UI 只负责展示和选择，不直接承载核心业务规则

### 7. 先做文档内 MVP，不等于以后重做
第一阶段的“文档内限制”是功能范围限制，不应演变为架构限制。
- planner 直接依赖 `activeTextEditor`
- planner 直接操作 `showQuickPick`
- planner 只能处理“同一文档 source/target”

### 8. 提交要求
- 提交应保持原子性，一个 commit 只表达一个清晰的逻辑单元。
- 优先按任务边界提交：
  - 文档规划类变更单独提交
  - 领域模型 / planner / resolver / command / tests 尽量分任务提交
- 不要把无关修改、顺手清理或后续任务内容混进当前任务的提交。
- 提交前至少确认与当前任务直接相关的测试已通过；若未运行测试，提交说明中必须明确指出。
- 提交信息遵循 Conventional Commits，优先使用清晰 scope，例如：
  - `docs(editing): ...`
  - `feat(editing): ...`
  - `test(editing): ...`
- 提交信息应说明“做什么”和“为什么”，避免堆砌实现细节或文件清单。

### 9. 完成汇报要求
- 每个任务完成后的汇报，除了代码与测试信息外，还必须补充一段“从用户视角当前可以怎么用或怎么测试”。
- 这一段不要求写成详细操作步骤，只需要说明：
  - 当前已经可以验证哪些能力
  - 用户现在可以测什么
  - 当前还不能直接测试什么（如果适用）
- 这一段的目标是帮助用户快速判断“这次实现已经产生了什么可感知结果”，而不是解释内部实现细节。

## 必须避免的实现方式
- 在命令函数里直接完成 subtree 提取、层级重算、删除和插入
- 把 `editor.document` 当成 source 和 target 的唯一来源
- 用当前文档行号直接编码全部逻辑，而没有抽象 model
- Quick Pick 选项直接绑定单文档实现细节，无法演化为跨文件目标对象
- planner 直接操作 VS Code API，而不是返回明确的编辑计划

## 每个任务完成时都应检查
- 是否新增了对应的 failing tests 并转绿
- 是否把核心规则放在了可测试的逻辑层
- 是否把“当前文档”限制控制在最外层
- 是否为未来跨文件扩展留下了清晰边界
- 完成汇报中是否包含“用户现在可以测什么”的说明
- 若准备提交，是否符合本文件中的提交要求
