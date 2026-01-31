# VOrg Perspectives 2.0 需求规格文档

## 1. 核心定位 (Objective)
VOrg Perspectives 是扩展的核心组件，通过 **S-Expression (Lisp 风格)** 查询语言实现对整个工作区 Org 笔记的深度聚合与多维展现。它不仅是“保存的搜索”，更是一个动态的、可分组、可交互的侧边栏穿透式工作流面板。

## 2. 查询语言：VOrg-QL
系统采用具备递归解析能力的 S-Expression 语法，用于定义视图逻辑。

### 2.1 基础过滤器 (Atomic Filters)
*   `(todo "TODO" "NEXT")`: 过滤 TODO 状态
*   `(prio "A" "B")`: 过滤优先级
*   `(tag "work" "urgent")`: 过滤标签
*   `(file "worklog.org")`: 按文件路径过滤
*   `"关键词"`: 自由文本/搜索关键词

### 2.2 逻辑算子 (Logic Operators)
*   `(and ...)`: 与逻辑（所有条件必须满足）
*   `(or ...)`: 或逻辑（任一条件满足）
*   `(not ...)`: 非逻辑（排除特定条件）

### 2.3 高阶算子 (Meta-Operators)
*   **`(group-by <type> <query>)`**: 核心算子，定义结果集的聚合层级。
    *   支持的类型：`file` (按文件), `status` (按状态), `tag` (按标签), `priority` (按优先级)。
    *   *示例*: `(group-by file (and (todo "TODO") (prio "A")))` (按文件分组展示所有高优先级任务)

---

## 3. UI 展现与交互 (UX Model)

### 3.1 树状视图结构 (Hierarchical Tree)
侧边栏采用三级动态树状模型：
1.  **第一层：透视根目录 (Perspective Node)**
    *   代表一个持久化的查询视图。
    *   包含标题和灰色说明文字。
2.  **第二层：聚合分组节点 (Group Node)**
    *   **动态生成**：仅当查询包含 `group-by` 指令时出现。
    *   使用特定图标区分，如文件夹（按文件分组）或书签（按标签分组）。
3.  **第三层：标题条目 (Heading Item)**
    *   具体的任务或笔记条目。
    *   左侧显示 TODO 状态对应图标，标题后显示优先级。
    *   点击可立即定位到编辑器对应位置。

### 3.2 标题栏操作 (Action Bar)
*   🔍 **Search**: 开启临时搜索或输入新 DSL 定义。
*   💾 **Save**: 将当前活动查询保存为侧边栏透视。
*   🔄 **Refresh**: 强制重新扫描数据库。

---

## 4. 管理与编辑流

### 4.1 全员平等管理
*   **无内置限制**：所有透视（包含系统预设）均具备相同的右键菜单。
*   **操作支持**：支持 `Edit` (修改) 和 `Delete` (删除)。

### 4.2 两步式编辑工作流 (Streamlined Editing)
为了平衡灵活性与简洁性，防止过多的弹窗干扰：
1.  **Step 1: 修改核心逻辑 (Query)** 
    *   修改 S-Expression 表达式。独立编辑以便后续支持实时解析验证。
2.  **Step 2: 修改展现样式 (Label & Description)**
    *   输入格式：`视角名称 # 说明文字`。
    *   解析逻辑：以第一个 `#` 为界，前部为标题，后部为描述。

---

## 5. 技术设计 (Technical Implementation)

### 5.1 解析与翻译
*   **AST Parser**: 将 S-Expression 字符串解析为树状对象。
*   **SQL Generator**: 递归遍历 AST，生成 SQLite 复杂的嵌套 `WHERE` 子句和 `GROUP BY` 逻辑。

### 5.2 数据持久化
*   存储位置：VS Code `settings.json` 中的 `vorg.perspectives` 字段。
*   数据结构：`Array<{ label: string, query: string, description: string }>`。

### 5.3 响应式更新
*   监听文件系统变更或数据库就绪事件。
*   文件保存时，自动通知 `TreeDataProvider` 执行 `refresh`，确保护航看板始终为最新状态。

---

## 6. 后续演进 (Roadmap)
*   支持 `(sort mtime desc)` 进行结果排序功能。
*   在编辑对话框中集成“实时预览匹配条目数”的功能。
