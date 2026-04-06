# 00 Context And Scope

本文件面向 AI/Agent，提供当前 `tasks/refile` 任务包在各阶段执行前必须掌握的技术上下文。

它主要回答 3 个问题：
- 这一阶段要做什么，不做什么
- 为什么这一阶段要这样切
- 进入下一阶段前，哪些技术边界必须保持清晰

本文件不负责：
- 文档导航与使用说明
- 长期共享的硬规则、反模式与提交纪律

这些内容分别由 `README.md` 与 `PRINCIPLES.md` 承担。

## Requirement Source
- 来源：`requirements/chapters/09_Chapter_9__Refiling_and_Archiving.pdf`
- 当前主题：先实现 `refile`，暂不处理 `archive`
- 当前仓库中尚无现成的 `refile` 实现
- 现有测试框架是 `mocha --ui tdd`

需求中与 `refile` 直接相关的关键信息：
- `org-refile` / `C-c C-w`
  - 将当前条目或区域移动到目标标题下，作为其子项
- `org-refile-copy` / `C-c M-w`
  - 复制到目标位置，不删除原文
- `org-refile-reverse` / `C-c C-M-w`
  - 反向 refile，行为与 `org-reverse-note-order` 相关
- 支持 outline path 补全目标
- 支持跨文件目标（`org-refile-targets`）
- 支持动态创建父节点（`org-refile-allow-creating-parent-nodes`）
- 支持 keep 原位（`org-refile-keep`）
- 支持记录 refile 日志（`org-log-refile`）
- 支持缓存（`org-refile-use-cache`）

## Shared Implementation Baseline
无论处于哪个阶段，当前仓库都具备以下基础：
- 编辑命令入口在 `src/commands/editingCommands.ts`
- 子树与标题基础能力已存在于：
  - `src/commands/editing/headingCommands.ts`
  - `src/parsers/headingParser.ts`
- 当前最适合复用的路线仍是：
  - 纯文本/纯规则逻辑
  - 命令层接线
  - VS Code 交互层（Quick Pick）

## Phase 1: Current-Document MVP

### Phase Goal
先交付一个稳定、可测试、当前文档内的 `org-refile` MVP。

### In Scope
- 从当前光标所在 headline，移动整个 subtree
- target 只支持当前文档内已有 headline
- target 展示为 outline path，便于区分重名标题
- refile 后插入到目标标题子树末尾，作为最后一个子节点
- 禁止移动到自身或自身后代下面
- 移动后正确重算 subtree 内所有标题的层级

### Out Of Scope
- `org-refile-copy`
- `org-refile-reverse`
- 跨文件目标
- 动态创建父节点
- `org-refile-keep`
- `org-log-refile`
- refile cache
- 时钟项特殊语义

### Why Phase 1 Is Scoped This Way
第一阶段先做文档内 MVP，不是因为跨文件不重要，而是因为它最贴合 VOrg 当前架构。

当前索引系统更像读模型，主要负责：
- 扫描、解析、入库、搜索
- 支撑 workspace symbol、自动补全、链接跳转

它目前还不统一负责：
- 多文件真实文档校验
- 索引过期与行号漂移处理
- 多文件 `WorkspaceEdit` 协调
- 跨文件失败恢复

同时，当前编辑命令的主模式仍是：
- 从当前 editor 获取上下文
- 用 parser / helper 计算范围和新文本
- 直接编辑当前文档

因此，第一阶段先做“当前文档内 source + 当前文档内 target + 当前文档内 edit”是合理的，也是最适合 TDD 的切分。

### Recommended Technical Shape
- `RefileTargetResolver`
  - 第一阶段只扫描当前文档 headings
- `RefilePlanner`
  - 输入：`RefileSource` + `RefileTarget`
  - 输出：`RefilePlan`
  - 不直接依赖 `activeTextEditor` 或 Quick Pick
- `RefileEditApplier`
  - 第一阶段只应用单文件编辑

### What Not To Do Yet
- 不要在命令函数里直接完成 subtree 提取、层级重算、删除和插入
- 不要为了未来跨文件支持，提前引入过重的数据库写回或复杂同步逻辑
- 不要把 Quick Pick 选择项设计成只能服务当前单文档实现的临时结构
- 不要在第一阶段顺带实现 `copy`、`keep`、`reverse`、动态创建父节点

### Phase 1 Test Focus
1. `应提取当前 headline 的完整 subtree 范围`
2. `应把 subtree 重挂到目标 headline 下并重算层级`
3. `应拒绝 refile 到自身子树内部`
4. `应在命令层通过 quick pick 选择目标并应用编辑`

## Phase 2: Cross-File Refile

### Phase Goal
在第一阶段稳定后，推进“基于工作区 headline 的跨文件 refile”。

### In Scope
- target 可来自工作区索引，而不是仅当前文档扫描
- source 与 target 可以位于不同文件
- planner 开始产出跨文件编辑计划
- applier 开始负责多文件 `WorkspaceEdit`
- 命令层开始处理“索引定位 + 真实文档校验 + 多文件写入”的完整链路

### Out Of Scope
- `org-refile-copy`
- `org-refile-reverse`
- 动态创建父节点
- `org-refile-keep`
- `org-log-refile`
- refile cache
- 时钟项特殊语义

### Why Phase 2 Starts Here
第二阶段的起点，不是继续扩功能面，而是把第一阶段预留的抽象真正扩展到跨文件场景：
- `RefileTargetResolver`
  - 从当前文档扫描，扩展到工作区索引或数据库查询
- `RefilePlanner`
  - 从单文件 plan，扩展到跨文件 plan
- `RefileEditApplier`
  - 从单文件 edit，扩展到多文件 `WorkspaceEdit`

这个阶段的关键判断是：
- 索引可以作为目标发现入口，但不能直接信任为最终写入位置
- 在真正写入前，必须重新打开 source/target 文档并校验关键位置

### New Problems To Solve
- target 来自索引后，如何映射回真实文档位置
- 当索引过期、标题被移动、文件未保存时如何安全失败
- 如何构造多文件 `WorkspaceEdit`
- refile 成功后如何确认索引最终会重新同步

### What Not To Do Yet
- 不要把跨文件能力与 `copy / reverse / keep` 绑在同一阶段实现
- 不要为了解决索引陈旧，一开始就引入重量级事务或复杂回滚系统
- 不要在没有关键集成测试前继续扩展更多命令变体

## Exit Criteria Between Phases
满足以下条件后，第一阶段可以视为完成，并进入第二阶段：
- 当前文档内 `org-refile` 主链路稳定
- `resolver / planner / applier` 三层边界已经存在
- 单文件 happy path 与关键非法路径已有测试保护
- 命令层没有重新吞掉核心规则

进入第二阶段后，应继续保持：
- 索引只负责发现 target，不直接替代真实文档校验
- 跨文件扩展优先复用现有抽象，而不是另起一套命令实现
