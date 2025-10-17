# Property 属性管理

VOrg 提供了完整的 Property 属性管理功能，完全兼容 Emacs org-mode 的 `org-set-property` 行为。

## 🎯 核心功能

### 智能属性设置
- **自动创建**：如果标题下没有 Property 抽屉，自动创建（含唯一 ID）
- **自动 ID 生成**：创建新抽屉时自动生成唯一 ID（UUID v4 格式）
- **智能更新**：如果属性已存在，更新其值
- **智能添加**：如果属性不存在，在 `:END:` 前添加新属性
- **缩进对齐**：新属性自动与现有属性保持一致的缩进

### 快捷键和命令
- **快捷键**：`Ctrl+C Ctrl+X P` (完全对应 Emacs `C-c C-x p`)
- **命令面板**：`VOrg: Set Property`
- **函数名**：`orgSetProperty()` (类似 Emacs 命名风格)

## 📝 使用方法

### 基本操作流程

1. **定位光标**：将光标放在标题或其内容区域内
2. **执行命令**：按 `Ctrl+C Ctrl+X P` 或使用命令面板
3. **输入属性名**：例如 `CATEGORY`、`PRIORITY`、`CREATED` 等
4. **输入属性值**：例如 `work`、`high`、`[2023-10-20]` 等

### 智能行为示例

#### 场景1：新标题（无 Property 抽屉）
```org
* TODO 新任务
```
执行设置属性后（自动生成 ID）：
```org
* TODO 新任务
  :PROPERTIES:
  :ID: a1b2c3d4-5678-4abc-9def-0123456789ab
  :CATEGORY: work
  :END:
```
> 注意：首次创建 Property 抽屉时会自动生成一个唯一的 ID 属性，用于全局链接跳转

#### 场景2：已有 Property 抽屉，属性不存在
```org
* 任务标题
  :PROPERTIES:
  :CATEGORY: work
  :END:
```
添加 `PRIORITY` 属性后：
```org
* 任务标题
  :PROPERTIES:
  :CATEGORY: work
  :PRIORITY: high
  :END:
```

#### 场景3：已有 Property 抽屉，属性已存在
```org
* 任务标题
  :PROPERTIES:
  :CATEGORY: work
  :PRIORITY: low
  :END:
```
更新 `PRIORITY` 属性后：
```org
* 任务标题
  :PROPERTIES:
  :CATEGORY: work
  :PRIORITY: high
  :END:
```

## 🔧 智能编辑支持

### 折叠功能

Property 抽屉支持折叠功能，可以让文档更加简洁：

```org
* 任务标题
  :PROPERTIES:...  <-- 折叠后显示
  
* 任务标题
  :PROPERTIES:     <-- 展开状态
  :CATEGORY: work
  :PRIORITY: high
  :END:
```

**折叠方式**：
- **点击折叠图标**：点击 `:PROPERTIES:` 行左侧的折叠图标 (▼/▶)
- **快捷键**：`Ctrl+C Ctrl+Tab` 折叠，`Ctrl+C Ctrl+Shift+Tab` 展开
- **TAB 键**：在 `:PROPERTIES:` 行上按 `Tab` 键切换折叠状态

### 在 Property 抽屉内编辑

当光标在 Property 抽屉内时，`Alt+Enter` 会智能插入新的属性行：

```org
* 标题
  :PROPERTIES:
  :CATEGORY: work
  :PRIORITY: high
  :|  <-- 光标在这里按 Alt+Enter
  :END:
```

插入后：
```org
* 标题
  :PROPERTIES:
  :CATEGORY: work
  :PRIORITY: high
  :  <-- 新插入的属性行，缩进自动对齐
  :END:
```

## 🛠️ 技术实现细节



### 函数架构

```typescript
// 主要函数
orgSetProperty()                    // 主入口函数
├── findPropertyDrawer()            // 查找 Property 抽屉
├── findPropertyInDrawer()          // 在抽屉中查找属性
└── hasPropertyDrawer()            // 检查是否存在抽屉

// 辅助函数
insertPropertyItem()                // 在抽屉内插入新属性行
isInPropertyDrawer()               // 检查是否在 Property 抽屉内
```

## 🎨 用户体验

### 智能提示
- **属性名提示**：提供常用属性名示例（CATEGORY, PRIORITY, CREATED 等）
- **属性值提示**：根据属性类型提供值示例
- **操作反馈**：显示操作结果（已创建、已更新、已添加）

### 错误处理
- **位置检查**：确保光标在标题或其内容区域内
- **格式验证**：验证属性名和值的格式
- **友好提示**：提供清晰的错误信息和操作指导

## 🔮 未来规划

- [ ] 支持属性模板和预设
- [ ] 批量属性操作
- [ ] 属性继承和默认值
- [ ] 属性搜索和过滤
- [ ] 属性统计和报告

---

**Property 管理让您的 Org-mode 文档更加结构化和可管理！** 🏷️
