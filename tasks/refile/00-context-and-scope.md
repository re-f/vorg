# 00 Context And Scope

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

### 当前编辑命令的主模式仍是“当前文档文本变换”
VOrg 现有编辑命令大多遵循这条路径：
- 从当前 editor 获取上下文
- 用 parser / command helper 计算范围和新文本
- 直接编辑当前文档

因此，第一阶段先做“当前文档内 source + 当前文档内 target + 当前文档内 edit”是合理的。

## 当前结论
`refile` 最合理的第一阶段不是“完整模拟 Org-mode”，而是先做一个当前文档内、基于 headline subtree 的稳定 MVP。这样最符合 VOrg 现在的代码结构，也最适合 TDD 推进。
