# 参考资料

## 推荐的目录结构

```text
tasks/<topic>/
├── README.md
├── PRINCIPLES.md
├── 00-context-and-scope.md
├── 01-<task>.md
├── 02-<task>.md
├── 03-<task>.md
└── ...
```

## `README.md` 模板

```markdown
# <Topic> 任务索引

## 目标
- 来源：`<需求文档>`
- 当前目标：`<MVP 目标>`
- 开发方式：严格按 TDD 推进

## 文档结构
- `PRINCIPLES.md`
- `00-context-and-scope.md`
- `01-...md`
- `02-...md`

## 推荐执行顺序
1. 先读 `PRINCIPLES.md`
2. 再读 `00-context-and-scope.md`
3. 按任务编号推进

## 推荐启动方式
```text
请执行任务：`tasks/<topic>/0X-xxx.md`
```
```

## `PRINCIPLES.md` 模板

```markdown
# <Topic> 原则

## 适用范围
本文件对 `tasks/<topic>` 下的所有任务都生效。

## 必须遵守的原则
- 严格 TDD
- 命令层只做 orchestration
- 核心规则尽量纯函数化
- 不要把阶段性限制写死成长期架构限制

## 提交要求
- commit 保持原子性
- 优先按任务边界提交
- 提交前说明测试状态
- 提交信息遵循 Conventional Commits
```

## `00-context-and-scope.md` 模板

```markdown
# 00 上下文与范围

## 背景
- 来源：`<文档>`
- 当前目标：`<目标>`

## MVP 必须覆盖
- ...

## MVP 暂不覆盖
- ...

## 为什么先这样做
- ...
```

## 单任务模板

```markdown
# 0X <任务名称>

## Agent Brief
- 开始前先阅读：
  - `tasks/<topic>/PRINCIPLES.md`
  - `tasks/<topic>/00-context-and-scope.md`
  - 当前任务文件
- 本次只做：
  - ...
- 本次不要做：
  - ...
- 完成后汇报：
  - ...

## 任务目标
...

## 本任务必须遵守
- ...

## 建议测试
1. ...
2. ...

## 验收点
- ...
- ...

## 完成标准
- ...
```

## 任务拆分启发式

当工作流以实施为主时，优先按此顺序：

1. 领域规则
2. 规划器或纯逻辑
3. 解析器或建模
4. 命令层
5. 集成测试
6. 注册或发布 wiring

## 验收标准规则

好的验收标准：
- 可观察
- 可测试
- 范围限定在单一任务
- 表述为结果，而非意图

避免：
- "代码应足够优雅"
- "实现完整功能"
- "处理各种情况"

优先：
- "至少有一条测试验证..."
- "命令执行后文档全文保持不变"
- "`package.json` 中存在 ... 配置项"

## 提交指导模式

记录提交要求时，优先：
- 实际可行时，文档变更与实施分开提交
- 每个任务边界一个 commit
- 汇报完成时包含测试状态
