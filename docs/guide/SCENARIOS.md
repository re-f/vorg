# VOrg 场景化使用指南 (科研、GTD 与 第二大脑)

本指南旨在帮助您利用 VOrg 的核心特性构建高效的个人知识管理系统。

---

## 🧠 场景一：科研笔记与“第二大脑” (Second Brain)

VOrg 的底层动力源自 Org-mode 的极简与 SQLite 的强劲，非常适合处理海量碎片化信息。

### 1. 利用 ID 构建永久双向链接
在 Org-mode 中，每一个标题都可以拥有一个唯一的 `ID`。
- **操作**：在标题上按 `Ctrl+C Ctrl+X P` 并输入 `ID`（或者使用插件提供的自动补全）。
- **优势**：即使您重命名文件或移动标题位置，`[[id:xxxx]]` 链接依然有效。这是构建 Obsidian 级双向链接的核心。

### 2. MOC (Map of Content) 目录组织
利用 VOrg 的层级结构和链接能力，您可以轻松构建 MOC：
- 创建一个中心索引文件（如 `Index.org`）。
- 使用 `[[file:path/to/note.org][Note Title]]` 引用其他笔记。
- 配合 **动态视图 (Dynamic Views)**，在 MOC 页面中嵌入自动化内容汇合块：
  ```org
  #+begin_src vorg-ql
  (and (tag "Research") (level 1))
  #+end_src
  ```

---

## ✅ 场景二：简约 GTD 任务管理

虽然 VOrg 不追求完全替代 Emacs，但它提供的 GTD 功能足以应对日常工作。

### 1. 任务流转与状态切换
- **切换状态**：`Ctrl+C Ctrl+T`。您可以在设置中自定义状态序列（如 `TODO | NEXT | DONE`）。
- **设置优先级**：`Shift+Up/Down`。快速标记哪些是 A 类紧要任务。

### 2. 时间维度控制
- **计划 (Scheduled)**：`Ctrl+C Ctrl+S`。标记何时开始。
- **截止 (Deadline)**：`Ctrl+C Ctrl+D`。标记何时到期。
- **自定义查询**：在侧边栏使用预设的 Perspectives 或直接在笔记中嵌入 QL 块，查看“今日到期”任务。

---

## 📂 场景三：MOC 层级管理

VOrg 强劲的标题操作能力让目录调整变得极其简单：
- **升级/降级子树**：`Ctrl+C Ctrl+Shift+,` / `.`。
- **一键折叠**：`Tab`。在大规模文档中，利用层级折叠保持视野清晰。

---

> [!TIP]
> 想要亲身体验这些功能？请查看项目根目录下的 [GETTING_STARTED.org](file:///GETTING_STARTED.org) 交互教程。
