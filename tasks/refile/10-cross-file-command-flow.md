# 10 Cross File Command Flow

## Agent Brief
- 首先阅读：`tasks/refile/PRINCIPLES.md`
- 然后阅读：`tasks/refile/00-context-and-scope.md`
- 最后阅读：本文件
- 本任务可以做什么：
  - 升级命令层，使 `vorg.refile` 支持跨文件 target
  - 串起 resolver、planner、applier 的跨文件流程
  - 改进跨文件场景下的用户提示
- 本任务不能做什么：
  - 不把核心规则重新塞回命令层
  - 不新增新的命令变体
  - 不在这里解决全部稳定性问题
- 完成后汇报什么：
  - 跨文件命令流程如何工作
  - 新增了哪些交互或提示
  - 用户现在可以如何触发跨文件 refile

## 任务目标
把现有 `vorg.refile` 流程升级为支持跨文件 target 的完整命令路径。

## 必需行为
- 命令可展示工作区范围的 target 候选
- 选择跨文件 target 后，触发 planner + applier
- 成功时给出合理反馈
- 失败时给出可理解的提示，不做危险写入

## 需要处理的场景
- 当前文档中没有其他 target，但工作区中有合法 target
- target 位于另一个文件
- 目标文件无法打开或校验失败
- planner / applier 返回失败

## 建议的测试
- `应允许选择另一个文件中的 headline 作为 target`
- `跨文件 refile 成功后应提示或安全返回`
- `目标文件不可用时应安全失败`
- `用户取消选择时不应修改任何文件`

## 验收标准
- 用户能通过同一命令触发跨文件 refile
- 命令层继续只做 orchestration
- 跨文件失败不会导致部分写入

## 完成标准
- `vorg.refile` 在跨文件场景下已可用
- 命令层测试或集成测试已覆盖主要路径
- 用户视角下可感知到跨文件能力已经解锁
