# 06 Command Registration

## Agent Brief
- 开始前先阅读：
  - `tasks/refile/PRINCIPLES.md`
  - `tasks/refile/00-context-and-scope.md`
  - `tasks/refile/04-command-layer.md`
  - 当前任务文件
- 本次只做：
  - 把 `vorg.refile` 正式接入命令注册和快捷键系统
  - 完成 `package.json`、命令协调器和必要接线
- 本次不要做：
  - 改写核心 refile 逻辑
  - 提前扩展 `copy` / `reverse`
  - 扩展跨文件能力
- 完成后汇报：
  - 改了哪些注册点
  - 命令面板与快捷键是否可发现
  - 哪些验收点已经满足
  - 是否发现键位或 enablement 冲突

## 任务目标
把 `refile` 命令正式接入 VOrg，包括命令注册、快捷键和必要的扩展接线。

## 本任务必须遵守
- 先读 `PRINCIPLES.md`
- 注册层只做接线，不承载业务逻辑
- 在命令真正稳定前，不要过早扩展到 `copy` / `reverse` 等变体

## 涉及位置
- `src/commands/editingCommands.ts`
- `src/extension.ts`（若需要单独接线）
- `package.json`

## 建议命令
- `vorg.refile`

## 快捷键建议
- `ctrl+c ctrl+w`

## 需要完成的内容
- 在命令协调器中注册 `vorg.refile`
- 在 `package.json` 中增加 command 描述
- 在 `package.json` 中增加 keybinding
- 根据现有风格补充 title / icon / enablement

## 需要检查
- 命令是否仅在 `org` 文档中可用
- 键位是否与现有绑定冲突
- 命令名称与项目现有命名风格是否一致

## 验收点
- `package.json` 中存在 `vorg.refile` 的命令贡献项，且命名风格、`title`、`enablement` 与现有 VOrg 命令保持一致。
- `package.json` 中存在 `ctrl+c ctrl+w` 的快捷键绑定，且 `when` 条件与其他 org 文档专用快捷键风格一致。
- 代码中的命令注册字符串与 `package.json` 中的 `command` 字段逐字一致，扩展激活路径能够实际注册 `vorg.refile`。
- 命令可以通过命令面板被发现并调用，且仅在 org 文档上下文中生效。
- 接线完成后，项目既有测试与新增的 refile 相关测试仍能通过，说明注册层改动未破坏现有行为。

## 完成标准
- 用户可从命令面板触发 `vorg.refile`
- 快捷键在 org 文档中可触发
- 接线完成后，相关集成测试仍通过
