# 00 Context And Scope

本文件面向 AI/Agent，提供执行 `tasks/refile` 各具体任务前必须掌握的阶段技术上下文、设计判断与实现边界。

## 背景
- 来源：`requirements/chapters/09_Chapter_9__Refiling_and_Archiving.pdf`
- 当前目标：先实现 `refile`，暂不处理 `archive`
- 当前仓库中尚无现成的 `refile` 实现
- 现有测试框架是 `mocha --ui tdd`

## Chapter 9 中与 Refile 相关的信息

### 核心命令
- `org-refile` / `C-c C-w`
  - 将当前条目或区域移动到目标标题下，作为其子项
- `org-refile-copy` / `C-c M-w`
  - 复制到目标位置，不删除原文
- `org-refile-reverse` / `C-c C-M-w`
  - 反向 refile，行为与 `org-reverse-note-order` 相关

### 相关能力
- 支持通过 outline path 补全目标
- 支持跨文件目标（`org-refile-targets`）
- 支持动态创建父节点（`org-refile-allow-creating-parent-nodes`）
- 支持 keep 原位（`org-refile-keep`）
- 支持记录 refile 日志（`org-log-refile`）
- 支持缓存（`org-refile-use-cache`）
- 存在与时钟项、前缀参数相关的高级行为

## 与 VOrg 当前架构的对齐
- 编辑命令入口在 `src/commands/editingCommands.ts`
- 子树与标题基础能力已存在于：
  - `src/commands/editing/headingCommands.ts`
  - `src/parsers/headingParser.ts`
- 当前最适合先做的路径是：
  - 纯文本/纯规则逻辑
  - 命令层接线
  - VS Code 交互层（Quick Pick）

## 当前阶段的技术执行判断
- 第一阶段允许把 target 限制为当前文档 headline，但这种限制应尽量停留在 resolver 或 command wiring 层
- planner 不应把 source 和 target 写死成“永远来自同一文档”
- 当前阶段不要求直接建立在索引驱动的跨文件写操作之上
- 当前阶段优先复用已有 headline / subtree 工具，而不是提前建设新的跨文件编辑基础设施

## 建议的 MVP 范围
先只做一个可交付的 `org-refile` MVP，不要一开始覆盖全部 Org-mode 变体。

### MVP 必须覆盖
- 从当前光标所在 headline，移动整个 subtree
- 目标先只支持当前文档内已有 headline
- 目标展示为 outline path，便于区分重名标题
- refile 后插入到目标标题子树末尾，作为最后一个子节点
- 禁止移动到自身或自身后代下面
- 移动后需要正确重算 subtree 内所有标题的层级

### MVP 暂不覆盖
- `org-refile-copy`
- `org-refile-reverse`
- 跨文件目标
- 动态创建父节点
- `org-refile-keep`
- `org-log-refile`
- refile cache
- 时钟项特殊语义

## 为什么先做文档内 MVP
这里的“先做文档内”不是说跨文件不重要，而是说第一阶段优先沿用 VOrg 当前已经成熟的能力边界。

### 当前索引系统更像读模型
- 当前工作区索引主要负责扫描、解析、入库、搜索
- 它已经很好地支撑了：
  - workspace symbol
  - 自动补全
  - 链接跳转
- 但它目前还不是一个“跨文件编辑写操作平台”

换句话说，索引现在主要回答：
- 工作区里有哪些 headline
- 它们在哪个文件、哪一行
- 如何搜索和展示它们

而不是统一负责：
- 如何安全地修改多个文件
- 如何校验索引定位与真实文档是否仍一致
- 如何规划跨文件写操作并处理失败

这意味着当前阶段的 `refile` 不需要提前解决：
- 多文件真实文档校验
- 索引过期与行号漂移
- 多文件 `WorkspaceEdit` 协调
- 跨文件失败恢复

### 当前编辑命令的主模式仍是“当前文档文本变换”
VOrg 现有编辑命令大多遵循这条路径：
- 从当前 editor 获取上下文
- 用 parser / command helper 计算范围和新文本
- 直接编辑当前文档

因此，第一阶段先做“当前文档内 source + 当前文档内 target + 当前文档内 edit”是合理的。

## 当前阶段推荐的实现切分
- `RefileTargetResolver`
  - 第一阶段：扫描当前文档 headings
  - 后续阶段：扩展到工作区索引或数据库查询
- `RefilePlanner`
  - 输入：`RefileSource` + `RefileTarget`
  - 输出：`RefilePlan`
  - 不直接依赖 `activeTextEditor` 或 Quick Pick
- `RefileEditApplier`
  - 第一阶段：应用单文件编辑
  - 后续阶段：扩展为多文件 `WorkspaceEdit`

## 当前阶段不要提前做的事
- 不要在命令函数里直接完成 subtree 提取、层级重算、删除和插入
- 不要为了未来跨文件支持，提前引入过重的数据库写回或复杂同步逻辑
- 不要把 Quick Pick 选择项直接设计成只能服务当前单文档实现的临时结构
- 不要在第一阶段顺带实现 `copy`、`keep`、`reverse`、动态创建父节点等后续能力

## 第一阶段的首批测试关注点
1. `应提取当前 headline 的完整 subtree 范围`
2. `应把 subtree 重挂到目标 headline 下并重算层级`
3. `应拒绝 refile 到自身子树内部`
4. `应在命令层通过 quick pick 选择目标并应用编辑`

## 当前结论
`refile` 最合理的第一阶段不是“完整模拟 Org-mode”，而是先做一个当前文档内、基于 headline subtree 的稳定 MVP。这样最符合 VOrg 现在的代码结构，也最适合 TDD 推进。
