# VOrg-QL 查询指南

VOrg-QL 是一款受 Emacs [org-ql](https://github.com/alphapapa/org-ql) 启发的查询语言。它使用 S-expression (S-表达式) 语法在 VS Code 中对 Org 模式条目进行高效检索。

## 快速上手

### 1. 哪里可以使用？
在 `.org` 文件中，你可以创建一个名为 `vorg-ql` 的代码块。当你保存文件或点击执行时，VOrg 会自动在下方渲染搜索结果：

    #+begin_src vorg-ql
    (todo)
    #+end_src

### 2. 搜索逻辑
- **简单搜索**: 直接写双引号包裹的文字，如 `"工作"`，VOrg 会在标题和拼音中模糊查找。
- **结构化搜索**: 使用括号包裹的“谓词”，如 `(todo)` 找未完成，`(priority "A")` 找高优先级。
- **组合搜索**: 使用 `(and ...)` 或 `(or ...)` 将多个谓词组合起来。

---

## 详细语法 (Reference)

一个 VOrg-QL 查询由一个或多个**谓词 (Predicates)** 组成。

- **S-exp 语法**: `(predicate arg1 arg2 ...)`
- **非 S-exp 语法**: 纯字符串（如 `"task"`）会被自动转换为 `(heading "task")`。

---

## 比较运算符 (Comparison)

部分谓词支持比较运算符（ `>`, `<`, `>=`, `<=`, `=`, `!=`）作为第一个参数。

- **示例**: 
    - `(level < 3)` -> 查找层级小于 3 的条目。
    - `(priority >= "B")` -> 查找优先级 A 或 B 的条目。
    - `(property "Age" > "18")` -> 属性数值比较。

---

## 谓词列表 (Predicates)

### 常规谓词 (General)

| 谓词 | 别名 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `todo` | `status`, `state` | 匹配特定 TODO 关键字。不带参数时匹配所有“未完成”状态。支持比较。 | `(todo "NEXT")`, `(todo > "TODO")` |
| `done` | - | 匹配所有“已完成”状态。 | `(done)` |
| `priority` | `prio`, `p` | 匹配任务优先级。支持比较。 | `(priority "A")`, `(p < "B")` |
| `tag` | `#` | 匹配条目的标签。 | `(tag "work")` |
| `heading` | `title`, `h` | 匹配标题内容（支持拼音）。 | `(heading "重构")` |
| `level` | - | 匹配标题层级。支持比较。 | `(level 1)`, `(level <= 2)` |
| `property` | `prop` | 匹配自定义属性对。支持比较。 | `(property "ID" "uuid")`, `(prop "Age" > "18")` |
| `file` | `src` | 限制在特定文件路径中搜索。 | `(file "inbox.org")` |

### 日期谓词 (Date/Time)

所有日期谓词均支持：
- **关键字**: `"today"`, `"today+1w"` (+/- n 并带单位 `d`, `w`, `m`, `y`)。
- **范围参数**: `:from`, `:to`, `:on`。

| 谓词 | 别名 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `deadline` | `dl` | 匹配截止日期。 | `(deadline :from today :to today+1w)` |
| `scheduled` | `sc` | 匹配计划日期。 | `(scheduled "2024-01-31")` |
| `closed` | - | 匹配完成/关闭日期。 | `(closed today)` |

### 结构谓词 (Ancestors/Descendants)

| 谓词 | 别名 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `parent` | `up` | 匹配父节点的标题（内容）。 | `(parent "项目计划")` |

---

## 逻辑操作符 (Logical Operators)

谓词可以通过逻辑操作符进行任意深度的嵌套：

- **`(and ...)`**: 所有谓词均返回真。
- **`(or ...)`**: 至少一个谓词返回真。
- **`(not ...)`**: 取反。

## 分组 (Grouping)

VOrg-QL 支持通过 `group-by` 包装器对结果进行视觉上的分组显示。

### 分组语法 (`group-by`)
- **语法**: `(group-by 字段 (查询谓词))`
- **支持的字段**: 
    - `tag` / `#`: 按标签分组。
    - `status` / `todo`: 按任务状态分组。
    - `priority` / `prio` / `p`: 按优先级分组。
    - `file` / `src`: 按文件分组。
    - `done`: 按“未完成/已完成”状态大类分组。
    - `level`: 按标题层级分组。
- **示例**: `(group-by priority (todo))` —— 搜索所有未完成任务并按优先级排列显示。

---

## 示例 (Examples)

### 检索今天到期的、高优先级的未完成任务
```lisp
(and (todo) (deadline "today") (priority "A"))
```

### 检索上周内完成的所有条目
```lisp
(closed :from today-1w :to today)
```

### 检索所有非顶级（level > 1）且标记为 "urgent" 的任务
```lisp
(and (level > 1) (tag "urgent"))
```
