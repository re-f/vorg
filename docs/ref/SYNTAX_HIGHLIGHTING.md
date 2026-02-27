# VOrg 语法高亮文档

VOrg 为 Org-mode 文档提供完整的语法高亮支持，让您的文档更加美观和易读。

## 📋 目录

- [标题层级](#标题层级)
- [TODO 状态](#todo-状态)
- [文本格式](#文本格式)
- [列表](#列表)
- [代码块](#代码块)
- [引用块和示例块](#引用块和示例块)
- [表格](#表格)
- [链接](#链接)
- [数学公式](#数学公式)
- [时间戳](#时间戳)
- [标签](#标签)
- [优先级标记](#优先级标记)
- [注释](#注释)

## 🎯 标题层级

Org-mode 使用星号（`*`）来标记标题层级：

```org
* 一级标题
** 二级标题
*** 三级标题
**** 四级标题
***** 五级标题
****** 六级标题
```

每个标题都会以不同的颜色和样式显示，帮助您快速识别文档结构。

## ✅ TODO 状态

VOrg 支持完整的 TODO 状态管理，包括：

### 默认 TODO 关键字
- **未完成状态**：`TODO`、`NEXT`、`WAITING`
- **已完成状态**：`DONE`、`CANCELLED`

### 自定义 TODO 关键字
您可以在设置中自定义 TODO 关键字：

```json
{
  "vorg.todoKeywords": "TODO(t) NEXT(n) WAITING(w) | DONE(d) CANCELLED(c)",
  "vorg.defaultTodoKeyword": "TODO"
}
```

### 状态转换记录
支持状态转换记录功能：
- `@` 表示记录时间戳
- `!` 表示需要备注

示例：
```org
* TODO 任务1
* NEXT 任务2
* WAITING 等待中的任务
* DONE 已完成的任务
* CANCELLED 已取消的任务
```

## 🎨 文本格式

VOrg 支持丰富的文本格式：

### 基本格式
- **粗体**：`*粗体文本*`
- *斜体*：`/斜体文本/`
- _下划线_：`_下划线文本_`
- ~~删除线~~：`+删除线文本+`
- `代码`：`=代码文本=`
- 等宽字体：`~等宽字体文本~`

### 示例
```org
这是 *粗体* 文本
这是 /斜体/ 文本
这是 _下划线_ 文本
这是 +删除线+ 文本
这是 =代码= 文本
这是 ~等宽字体~ 文本
```

## 📝 列表

### 无序列表
```org
- 列表项1
- 列表项2
  - 子列表项2.1
  - 子列表项2.2
- 列表项3
```

### 有序列表
```org
1. 第一项
2. 第二项
   1. 子项2.1
   2. 子项2.2
3. 第三项
```

### 任务列表
```org
- [ ] 未完成任务
- [X] 已完成任务
- [-] 进行中任务
```

## 💻 代码块

### 基本代码块
```org
#+BEGIN_SRC python
def hello_world():
    print("Hello, World!")
#+END_SRC
```

### 行内代码
```org
使用 `print()` 函数输出文本
```

### 支持的编程语言
VOrg 支持多种编程语言的语法高亮：
- **Python** (`python`)
- **JavaScript** (`javascript`, `js`)
- **TypeScript** (`typescript`, `ts`)
- **Java** (`java`)
- **C** (`c`)
- **C++** (`cpp`, `c++`)
- **Rust** (`rust`)
- **Go** (`go`)
- **Shell** (`shell`, `bash`, `sh`)
- **SQL** (`sql`)
- **JSON** (`json`)
- **YAML** (`yaml`, `yml`)
- **HTML** (`html`)
- **CSS** (`css`)

## 💬 引用块和示例块

### 引用块
```org
#+BEGIN_QUOTE
这是一段引用文本。
可以包含多行内容。
#+END_QUOTE
```

### 示例块
```org
#+BEGIN_EXAMPLE
这是示例文本，
通常用于展示代码或配置。
#+END_EXAMPLE
```

### 其他块类型
```org
#+BEGIN_VERSE
诗歌块内容
#+END_VERSE

#+BEGIN_CENTER
居中块内容
#+END_CENTER
```

## 📊 表格

VOrg 提供完整的表格支持：

### 基本表格
```org
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |
```

### 表格对齐
```org
| 左对齐 | 居中 | 右对齐 |
|:-------|:----:|-------:|
| 文本   | 文本 | 文本   |
```

## 🔗 链接

VOrg 支持多种类型的链接：

### 基本链接
```org
[[https://example.com][示例网站]]
[[https://example.com]]
```

### 文件链接
```org
[[file:path/to/file.org][文件链接]]
[[file:path/to/file.org]]
```

### 内部链接
```org
[[*标题名称][链接到标题]]
[[#锚点名称][锚点链接]]
```

### 全局ID链接
```org
[[id:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX][全局链接]]
```

### 裸链接
```org
https://example.com
mailto:user@example.com
```

## 🧮 数学公式

### 行内公式
```org
行内公式：$E = mc^2$
```

### 块级公式
```org
$$E = mc^2$$
```

## ⏰ 时间戳

VOrg 支持多种时间格式：

### 基本时间戳
```org
<2024-01-01>
<2024-01-01 12:00>
<2024-01-01 Mon>
```

### 时间范围
```org
<2024-01-01>--<2024-01-02>
<2024-01-01 09:00-12:00>
```

### 重复时间
```org
<2024-01-01 +1d>
<2024-01-01 +1w>
<2024-01-01 +1m>
<2024-01-01 +1y>
```

### 非活动时间戳
```org
[2024-01-01]
[2024-01-01 12:00]
```

## 🏷️ 标签

### 标题标签
```org
* 标题 :标签1:标签2:
* 另一个标题 :工作:重要:
```

### 文件标签
```org
#+FILETAGS: :项目:文档:
```

### 属性
```org
#+PROPERTY: 属性名 属性值
#+PROPERTY: 优先级 A
#+PROPERTY: 状态 进行中
```

## 🎯 优先级标记

VOrg 支持标题优先级标记：

```org
* [#A] 高优先级任务
* [#B] 中优先级任务
* [#C] 低优先级任务
```

## 💬 注释

VOrg 支持注释行：

```org
# 这是注释行
# 可以包含多行注释
```

## 🎨 主题适配

VOrg 的语法高亮会自动适应 VS Code 的主题：
- **浅色主题**：使用适合浅色背景的颜色
- **深色主题**：使用适合深色背景的颜色
- **高对比度主题**：提供更好的可读性

## 🔧 自定义配置

您可以在 VS Code 设置中自定义语法高亮的颜色：

```json
{
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        "scope": "markup.heading.org",
        "settings": {
          "foreground": "#FF6B6B"
        }
      },
      {
        "scope": "keyword.todo.org",
        "settings": {
          "foreground": "#4ECDC4"
        }
      }
    ]
  }
}
```

## 📚 更多资源

- [Org-mode 官方文档](https://orgmode.org/manual/)
- [VS Code 主题定制指南](https://code.visualstudio.com/api/extension-guides/color-theme)
- [VOrg 项目主页](https://github.com/re-f/vorg)

---

*如果您发现任何语法高亮问题或有改进建议，请通过 [GitHub Issues](https://github.com/re-f/vorg/issues) 反馈给我们。* 