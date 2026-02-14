# 动态视图指南 (Dynamic Views Guide)

VOrg 基于 SQLite 构建了结构化索引。本指南通过 `VOrg-QL` 查询语言，利用元数据（TODO、优先级、标签等）构建嵌入文档的动态看板。

## 1. 动态视图机制
动态视图 (Dynamic View) 是指经由 `vorg-ql` 查询块生成的实时结果列表。保存文件时，视图会自动刷新。

## 2. 基础语法

所有的查询都包裹在 `#+BEGIN_QUERY` 块中，支持 JSON 格式（简单场景）和 S-Exp 格式（高级场景）。

### 示例：我的“今日投屏”

```org
#+BEGIN_QUERY
{
  "todo": ["NEXT", "TODO"],
  "priority": "A",
  "tags": ["work"],
  "limit": 10
}
#+END_QUERY
```
*这个查询会列出所有标记为 NEXT 或 TODO、优先级为 A 且带有 :work: 标签的任务。*

## 3. 进阶查询 (S-Expression)

对于复杂的逻辑组合，我们推荐使用类 Lisp 的 S-Exp 语法，它支持无限嵌套。

### 核心谓词

| 谓词 | 说明 | 示例 |
|:---|:---|:---|
| `(todo ...)` | 匹配 TODO 状态 | `(todo "NEXT" "WAITING")` |
| `(priority ...)` | 匹配优先级 | `(priority "A" "B")` |
| `(tag ...)` | 匹配标签 | `(tag "project" "urgent")` |
| `(category ...)` | 匹配分类属性 | `(category "personal")` |
| `(level n)` | 匹配标题层级 | `(level 1)` |
| `(deadline ...)` | 匹配截止日期 | `(deadline (today))` |

### 逻辑组合

*   **AND**: `(and (todo "NEXT") (tag "office"))`
*   **OR**: `(or (priority "A") (deadline (today)))`
*   **NOT**: `(not (tag "archive"))`

### 强大的日期查询
VOrg 支持自然语言风格的日期偏移：

*   `(today)`: 今天
*   `(tomorrow)`: 明天
*   `(yesterday)`: 昨天
*   `(today+ 3d)`: 未来3天内
*   `(today- 1w)`: 过去1周内

**案例：本周需要完成的高优任务**
```lisp
(and
  (todo "TODO")
  (priority "A")
  (deadline (today+ 7d))
)
```

## 4. 实战：构建 GTD 看板

您可以创建一个名为 `Dashboard.org` 的文件，填入以下内容，构建您的个人指挥中心：

```org
* 🚀 今日专注
#+BEGIN_QUERY
{
  "todo": "NEXT",
  "priority": "A"
}
#+END_QUERY

* 📅 即将到期 (未来3天)
#+BEGIN_SRC vorg-ql
(and
  (todo "TODO")
  (deadline (today+ 3d))
)
#+END_SRC

* 📥 待整理收件箱 (Refile)
#+BEGIN_QUERY
{
  "file": "inbox.org",
  "todo": "TODO"
}
#+END_QUERY
```

## 5. 常见问题

**Q: 查询结果可以点击吗？**
A: 当然！在预览窗口中点击任意一条查询结果，编辑器会立即跳转到该任务所在的源文件和具体行号。

**Q: 支持拼音搜索吗?**
A: 支持。在查询字符串中使用中文字符或拼音首字母均可匹配标题。

**Q: 查询结果不符合预期,如何调试?**
A: VOrg 提供了一个命令行调试工具,可以直接针对你的 `.org` 文件目录进行查询验证:

```bash
npx ts-node src/test/unit/debug_vorgql_real.ts \
  --dir ~/your-org-files \
  --query "(todo)"
```

该工具会:
- 扫描指定目录下的所有 `.org` 文件并建立临时索引
- 显示查询翻译成的 SQL 语句和参数
- 列出所有匹配结果
- **差异分析**: 对比数据库中的全量标签与查询结果,如果某个标签在库中存在但查询未命中,会显示 `[WARNING]`

**常见调试场景**:
- 某个文件/标签没被索引 → 验证 `HeadingRepository` 是否正确解析
- 复杂查询语法不确定 → 查看翻译后的 SQL 和参数
- 中文标签或特殊符号问题 → 直接在真实数据上验证

更多参数说明请运行 `npx ts-node src/test/unit/debug_vorgql_real.ts --help` 或查看文件头部注释。

---
*如需了解更底层的技术实现,请参阅架构文档。*
