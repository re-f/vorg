# 07 Workspace Targets

## Agent Brief
- 首先阅读：`tasks/refile/PRINCIPLES.md`
- 然后阅读：`tasks/refile/00-context-and-scope.md`
- 最后阅读：本文件
- 本任务可以做什么：
  - 将 target resolver 从“当前文档 headline”扩展到“工作区 headline”
  - 继续复用 `RefileTarget` 抽象
  - 为命令层提供可展示的跨文件目标候选
- 本任务不能做什么：
  - 不实现多文件写入
  - 不修改 planner 去直接操作 VS Code API
  - 不顺带实现 `copy / reverse / keep`
- 完成后汇报什么：
  - 新增了哪些 target 解析能力
  - 新增和更新了哪些单元测试
  - 用户现在可以看到什么新的可选目标范围

## 任务目标
把 `refile` 目标解析扩展到工作区范围，让 target 不再局限于当前文档。

## 必需行为
- 基于工作区索引或数据库查询获得 headline 候选
- 保留当前文档内 outline path 展示能力
- 为跨文件目标补充文件路径或相对路径信息
- 继续过滤非法目标：
  - source 本身
  - source 子树内部 headline
- 当 source 与 target 在同一文件时，行为应继续兼容第一阶段

## 建议的模块或文件
- `src/services/refile/refileTargetResolver.ts`
- 视情况复用：
  - `src/services/orgSymbolIndexService.ts`
  - 数据库 repository 层

## 建议的测试
- `应返回当前文档外的合法 headline 作为 target`
- `应为跨文件重名 headline 提供可区分的展示信息`
- `应继续过滤 source 本身与 source 后代`
- `索引无可用结果时应安全返回空列表`

## 验收标准
- 解析结果已能覆盖工作区 headline，而不是仅当前文档
- 目标展示信息足以区分跨文件重名标题
- resolver 仍保持与 UI 解耦

## 完成标准
- 命令层已经可以消费跨文件 target 候选
- 相关测试通过
- 没有把“索引结果”直接当作“最终写入位置”使用
