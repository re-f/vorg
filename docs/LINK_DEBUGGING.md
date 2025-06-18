# 链接样式调试指南

## 当前问题

用户反馈：
1. **"待办任务"依然有下划线** - 应该是加粗无下划线
2. **链接（id部分）没有hover效果**

## 问题分析

### 1. VSCode语法高亮优先级问题

VSCode的语法高亮有多个层次：
1. **TextMate语法文件** (`org.tmLanguage.json`) - 基础语法高亮
2. **语义token** - 语言服务器提供的高级语法高亮  
3. **装饰器 (Decorations)** - 扩展代码应用的样式

**问题**: 我们的装饰器可能被语法文件的样式覆盖了。

### 2. 当前实现状态

#### 语法文件更改
- ✅ 将链接描述token改为 `entity.name.function.link.description.org`
- ✅ 将链接URL token改为 `string.other.link.reference.org`

#### 装饰器实现
- ✅ `link-description`: 加粗 + `textDecoration: 'none'`
- ✅ `link-url`: 下划线
- ✅ 复杂的正则匹配逻辑，分离URL和描述部分

#### 调试功能
- ✅ 添加了详细的console.log调试信息
- ✅ 创建了手动刷新命令 `vorg.debug.refreshHighlighting`

## 解决方案

### 1. 使用调试命令

1. 打开包含链接的org文件
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "VOrg: Debug - Refresh Highlighting"
4. 查看开发者控制台的调试信息

### 2. 检查控制台输出

预期的调试输出：
```
Debug Link: Found link with description: "[[id:TODO-TASK-1111-2222-3333-444444444444][待办任务]]"
  URL: "id:TODO-TASK-1111-2222-3333-444444444444", Description: "待办任务"
  Line 5: 简单测试：[[id:TODO-TASK-1111-2222-3333-444444444444][待办任务]]
  URL range: line 5, cols 7-51
  Description range: line 5, cols 53-57
Debug Link: Applying decorations:
  URL ranges: 1
  Description ranges: 1
  Full ranges: 0
```

### 3. 可能的解决方案

#### 方案A: 增加装饰器优先级
使用更高优先级的装饰器样式来覆盖默认样式。

#### 方案B: 修改语法文件
完全移除语法文件中的链接高亮，仅依赖装饰器。

#### 方案C: 使用CSS覆盖
通过更具体的CSS选择器来覆盖默认样式。

## 测试用例

使用 `test-data/link-debug.org` 文件测试：

```org
#+TITLE: 链接调试测试

* 测试链接

简单测试：[[id:TODO-TASK-1111-2222-3333-444444444444][待办任务]]

其他测试：
- [[https://example.com][网站]]
- [[file:test.org][文件]]  
- [[#heading][标题]]
```

### 预期效果

- `id:TODO-TASK-1111-2222-3333-444444444444` 部分：下划线
- `待办任务` 部分：**加粗，无下划线**
- 鼠标悬停时：相应背景高亮

## 下一步

1. 运行调试命令并检查控制台输出
2. 确认正则表达式是否正确匹配
3. 检查装饰器是否正确应用
4. 如需要，调整装饰器样式优先级 