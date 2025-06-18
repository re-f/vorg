# Orgmode 语法高亮更新

## 概述

本次更新针对Orgmode格式的语法高亮进行了优化，主要目标是更好地利用VSCode主题中的程序语言保留字样式，使Orgmode文档在各种主题下都能获得一致且美观的显示效果。

## 主要更改

### 1. 语法Token映射优化

#### Properties 属性配置
- **之前**: `entity.name.function.org`
- **现在**: `keyword.control.property.org`
- **效果**: 属性名（如`:ID:`、`:CATEGORY:`等）现在使用与程序语言中控制关键字相同的样式

#### Babel 块关键字
- **之前**: `punctuation.definition.fenced.org`
- **现在**: `keyword.control.flow.begin.org` 和 `keyword.control.flow.end.org`
- **效果**: `BEGIN_SRC`、`END_SRC`、`BEGIN_QUOTE`、`END_QUOTE`等关键字现在使用与程序语言中流程控制关键字相同的样式

#### 指令关键字
- **之前**: `entity.name.function.org`
- **现在**: `keyword.control.directive.org`
- **效果**: `#+TITLE:`、`#+AUTHOR:`等指令现在使用与程序语言中预处理器指令相似的样式

### 2. 真正的代码块语法高亮

**重大改进**: 代码块现在支持根据语言进行真正的语法高亮，而不再仅仅显示为原始文本。

#### 支持的编程语言
- **Python** (`python`) - 完整的Python语法高亮
- **JavaScript** (`javascript`, `js`) - ES6+语法支持
- **TypeScript** (`typescript`, `ts`) - 类型注解和接口高亮
- **Java** (`java`) - 面向对象语法高亮
- **C** (`c`) - C语言语法高亮
- **C++** (`cpp`, `c++`) - 现代C++语法支持
- **Rust** (`rust`) - Rust语法和宏支持
- **Go** (`go`) - Go语言语法高亮
- **Shell** (`shell`, `bash`, `sh`) - Shell脚本语法
- **SQL** (`sql`) - 数据库查询语法
- **JSON** (`json`) - JSON格式高亮
- **YAML** (`yaml`, `yml`) - YAML配置文件高亮
- **HTML** (`html`) - HTML标记语法
- **CSS** (`css`) - CSS样式语法

#### 使用方法
```org
#+BEGIN_SRC python
def hello_world():
    print("Hello, World!")
#+END_SRC

#+BEGIN_SRC javascript
const greeting = "Hello from JavaScript";
console.log(greeting);
#+END_SRC
```

#### 回退机制
对于未明确支持的语言，代码块将回退到通用的原始文本显示模式。

### 3. 智能链接样式设计

**重大改进**: 链接现在根据不同部分应用不同的样式，提供更好的视觉体验。

#### 链接部分样式
- **URL/引用部分**: 保持下划线，表示可点击
- **描述部分**: **加粗显示，无下划线**，突出显示描述文本
- **Hover效果**: 鼠标悬停时有背景高亮

#### 支持的链接类型
```org
# 带描述的链接（描述部分加粗无下划线）
[[id:TODO-TASK-1111-2222-3333-444444444444][待办任务]]
[[https://example.com][网站名称]]
[[file:../README.md][项目文档]]

# 无描述的链接（URL部分有下划线）
[[https://example.com]]
[[#标题锚点]]

# 裸链接（完整下划线）
https://example.com
```

#### 视觉效果
- **`[[id:xxx][待办任务]]`**: `id:xxx`有下划线，`待办任务`加粗无下划线
- **鼠标悬停**: 相应部分显示背景高亮
- **点击提示**: 鼠标指针变为手型

### 4. 新增支持的其他块类型

扩展了对更多Org-mode块类型的支持：

- `BEGIN_EXPORT` / `END_EXPORT` - 导出块
- `BEGIN_VERSE` / `END_VERSE` - 诗歌块
- `BEGIN_CENTER` / `END_CENTER` - 居中块

### 5. 颜色配置更新

#### 深色主题配色
- **TODO关键字**: `#569CD6` (VSCode深色主题的关键字蓝色)
- **DONE关键字**: `#4EC9B0` (VSCode深色主题的类型青色)
- **属性名**: `#C586C0` (VSCode深色主题的控制流紫色)
- **块关键字**: `#C586C0` (与属性名相同的控制流紫色)
- **指令关键字**: `#6A9955` (低调的注释色调，不抢夺注意力)
- **时间戳**: `#CE9178` (VSCode深色主题的字符串橙色)
- **链接URL**: `#9CDCFE` (带下划线，可点击提示)
- **链接描述**: `#DCDCAA` (加粗显示，无下划线)
- **链接Hover效果**: 背景高亮
- **引用块**: `#6A9955` (VSCode深色主题的注释绿色)

#### 亮色主题配色
- **TODO关键字**: `#0000FF` (传统编程语言的关键字蓝色)
- **DONE关键字**: `#008000` (传统编程语言的成功绿色)
- **属性名**: `#800080` (传统编程语言的控制流紫色)
- **块关键字**: `#800080` (与属性名相同的控制流紫色)
- **指令关键字**: `#708090` (低调的灰蓝色，作为配置不抢夺注意力)
- **时间戳**: `#A31515` (传统编程语言的字符串红色)
- **链接URL**: `#0000EE` (带下划线，可点击提示)  
- **链接描述**: `#8B4513` (加粗显示，无下划线)
- **链接Hover效果**: 背景高亮

### 6. 语法高亮器增强

新增了三个专门的高亮应用方法：

1. `applyPropertiesHighlighting()` - 应用属性高亮（普通字体，无斜体）
2. `applyBlockKeywordsHighlighting()` - 应用块关键字高亮
3. `applyDirectivesHighlighting()` - 应用指令关键字高亮（低调显示，无加粗）

## 技术实现

### Token类型映射

```json
{
  "properties": "keyword.control.property.org",
  "blockKeywords": "keyword.control.flow.begin.org / keyword.control.flow.end.org",
  "directives": "keyword.control.directive.org"
}
```

### 正则表达式模式

- **属性匹配**: `/^\s*:([A-Z_]+):/`
- **块关键字匹配**: `/^\s*#\+(BEGIN_\w+|END_\w+)/`
- **指令匹配**: `/^\s*#\+(\w+):/`

## 使用效果

### 测试文件
可以使用 `test-data/syntax-test.org` 来测试所有的语法高亮效果，该文件包含了：

- 各种属性配置
- **多种编程语言的代码块** (Python, JavaScript, TypeScript, Java, C++, Rust, Go, Shell, SQL, JSON, YAML, HTML, CSS)
- 引用块、示例块等
- 指令关键字
- 时间戳和链接

#### 代码块测试效果
打开测试文件后，你将看到：
- Python代码中的关键字、函数、字符串等都有正确的语法高亮
- JavaScript/TypeScript代码中的ES6语法、类型注解等都被正确识别
- SQL查询中的关键字、函数名等都有适当的颜色
- JSON/YAML配置文件中的键值对结构清晰可见
- HTML/CSS代码中的标签、属性、选择器等都有不同的颜色

### 主题兼容性

这些更改确保了在不同的VSCode主题下，Orgmode文档都能获得一致的语法高亮体验：

- 深色主题 (Dark+, Monokai等)
- 亮色主题 (Light+, Solarized Light等)
- 高对比度主题

## 未来计划

1. **表格语法增强**: 进一步优化表格的语法高亮
2. **数学公式**: 改进LaTeX数学公式的显示
3. **自定义标签**: 支持用户自定义的TODO关键字和标签样式
4. **动态主题适配**: 更精细的主题颜色提取和适配

## 样式设计原则

- **属性配置 (PROPERTIES)**: 采用普通字体，无斜体，保持简洁
- **指令关键字 (#+TITLE: 等)**: 使用低饱和度颜色，无加粗，作为配置项应该低调不抢夺注意力
- **块关键字 (BEGIN_/END_)**: 保持加粗突出，因为它们是结构性元素
- **主题适配**: 深色和亮色主题都采用低调的配色方案

## 开发者注意事项

- 所有的token类型都遵循VSCode的语法高亮规范
- 颜色配置支持主题切换的动态更新
- 正则表达式经过优化，避免性能问题
- 代码结构清晰，便于后续扩展和维护
- 样式设计遵循"配置低调，结构突出"的原则 