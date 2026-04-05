# 示例

## 示例 1：Refile 工作流

用户说：

```text
从 requirements/chapters/09_Chapter_9__Refiling_and_Archiving.pdf 提取需求，
我要在 vorg 中实现，要求是 tdd 的驱动模式
```

推荐产出：

- 创建 `tasks/refile/`
- 添加：
  - `README.md`
  - `PRINCIPLES.md`
  - `00-context-and-scope.md`
  - `01-domain-rules.md`
  - `02-refile-planner.md`
  - `03-target-resolver.md`
  - `04-command-layer.md`
  - `05-integration-tests.md`
  - `06-command-registration.md`
- 为每个任务添加验收标准
- 为每个任务添加 `Agent Brief`
- 在 `PRINCIPLES.md` 添加提交要求

之后用户可以通过以下方式调用实施：

```text
请执行任务：`tasks/refile/02-refile-planner.md`
```

## 示例 2：从 Org 笔记提取通用功能

用户说：

```text
根据这个 org 设计文档，帮我拆成可执行任务，并要求后续可以直接交给大模型实现
```

推荐产出：

- 创建 `tasks/<feature>/`
- 将设计转化为：
  - 共享原则
  - MVP 范围
  - 编号任务
  - 验收标准
  - 可执行的任务简报

## 示例 3：后续补充验收标准

用户说：

```text
把这些任务补上验收点
```

推荐产出：

- 审查每个现有任务文件
- 添加专门的 `## 验收点`
- 让每条标准可测试且具体
- 将共享约束放在 `PRINCIPLES.md`，不要到处重复

## 示例 4：让任务提示词友好

用户说：

```text
我希望以后只说一句"执行任务：tasks/xxx/01-foo.md"就能开始
```

推荐产出：

- 为每个任务文件添加 `Agent Brief`
- 确保每个简报包含：
  - 前置阅读
  - 范围内工作
  - 范围外工作
  - 完成汇报格式
- 用推荐的启动语更新 `README.md`

## 示例 5：提交纪律

用户说：

```text
应该在原则中说明提交要求
```

推荐产出：

- 在 `PRINCIPLES.md` 添加提交章节
- 要求按任务边界原子提交
- 优先使用 Conventional Commits
- 要求汇报提交前的测试状态
