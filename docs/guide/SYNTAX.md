# VOrg 语法支持详解 (Syntax Guide)

本指南旨在向您展示 VOrg 在 VS Code 中支持的核心 Org-mode 语法。得益于现代 IDE 的高性能渲染，这些语法在实时预览中能获得极佳的视觉效果。

---

## 1. 标题 (Headings)

VOrg 支持 1-6 级标题。通过 `*` 数量来定义层级。

```org
* 一级标题 (Top-level)
** 二级标题
*** 三级标题
**** 四级标题
***** 五级标题
****** 六级标题
```

**提示**：在标题行按 `Alt+Enter` 可快速插入同级标题。

---

## 2. 列表 (Lists)

### 无序列表与复选框
```org
- 项目 1
- 项目 2
  - 子项目 A
  - [ ] 待办任务项
  - [X] 已完成任务项
```

### 有序列表
```org
1. 第一步
2. 第二步
3. [...]
```

---

## 3. 表格 (Tables)

VOrg 支持标准的 Org-mode 表格。输入 `|` 后输入内容并按 `Tab` 键，表格会自动对齐。

```org
| 项目     | 状态   | 优先级 |
|----------|--------|--------|
| VOrg 开发 | 进行中 | 高     |
| 文档编写 | 已完成 | 中     |
| 社区反馈 | 待处理 | 低     |
```

---

## 4. 代码块 (Code Blocks)

支持带有语言标记的语法高亮。

```org
#+BEGIN_SRC typescript
function helloVOrg() {
  console.log("Hello, Org-mode in VS Code!");
}
#+END_SRC
```

---

## 5. 属性抽屉 (Property Drawers)

用于存储结构的元数据，常用于 ID 链接和高级查询（VOrgQL）。

```org
* 这是一个带属性的标题
  :PROPERTIES:
  :ID:       550e8400-e29b-41d4-a716-446655440000
  :CATEGORY: project
  :STATUS:   active
  :END:
```

**提示**：使用快捷键 `Ctrl+C Ctrl+X P` 快速设置属性。

---

## 6. 时间戳 (Timestamps)

用于任务管理、日程安排和截止时间。

```org
* TODO 准备演示文档
  SCHEDULED: <2026-03-01 Sun>
  DEADLINE: <2026-03-05 Thu>
  :LOGBOOK:
  - State "DONE"       from "TODO"       [2026-02-26 Thu 17:00]
  :END:
```

---

## 7. 引用与说明 (Quotes & Examples)

```org
#+BEGIN_QUOTE
纯文本标记语言的力量在于它对人类和机器都是友好的。
#+END_QUOTE

#+BEGIN_EXAMPLE
这是原始文本示例，不会被解析。
#+END_EXAMPLE

---

想要了解如何在 VS Code 中高效操作这些语法？请参考 [高效编辑指南](./EDITING.md)。
