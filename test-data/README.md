# VOrg 链接跳转功能测试数据

这个目录包含了完整的测试数据，用于验证VOrg扩展的链接跳转功能。

## 📁 目录结构

```
test-data/
├── README.md           # 本文件，测试说明
├── main.org           # 主测试文件，包含所有类型的链接
├── projects.org       # 项目管理文档
├── notes.org          # 开发笔记
└── subdir/
    └── deep.org       # 深层目录测试文件
```

## 🧪 测试用例覆盖


### 链接类型测试
- ✅ **内部链接** - `[[*heading]]`（org-mode标准格式）
- ✅ **ID链接（同文件）** - `[[id:UUID][description]]`
- ✅ **ID链接（跨文件）** - 全局ID搜索
- ✅ **文件链接** - `[[file:path][description]]` 和 `file:path`
- ✅ **HTTP链接** - `[[http://example.com][description]]` 和 `http://example.com`
- ✅ **相对路径** - `../` 和 `./` 路径处理
- ✅ **深层目录** - 跨目录文件链接
- 

### 功能测试
- ✅ **Ctrl+Click跳转** - DefinitionProvider
- ✅ **链接高亮** - DocumentLinkProvider  
- ✅ **命令跳转** - LinkCommands
- ✅ **错误处理** - 无效链接和文件不存在
- ✅ **异步搜索** - 工作区文件搜索

## 🎯 测试方法

### 1. 基本功能测试
1. 在VS Code中打开 `main.org`
2. 使用 **Ctrl+Click** (Windows/Linux) 或 **Cmd+Click** (Mac) 点击各种链接
3. 使用 **Ctrl+Enter** 跟随光标处的链接
4. 使用 **Ctrl+L** 插入新链接

### 2. 内部链接测试
- 点击 `[[*🔗 HTTP链接测试]]` 应该跳转到同文件的标题
- 点击 `[[*🧪 基本语法规则]]` 应该跳转到对应标题
- 点击 `[[id:MAIN-TEST-A123-4567-8901-BCDEF0123456][跳转到测试标题A]]` 应该跳转到同文件的ID标题

### 3. 跨文件链接测试
- 点击 `[[id:PROJ-VORG-2024-1234-5678-9ABCDEF01234][VOrg扩展项目]]` 应该跳转到 `projects.org`
- 点击 `[[file:notes.org][开发笔记]]` 应该打开笔记文件
- 点击 `[[file:subdir/deep.org][深层目录文档]]` 应该打开深层目录文件

### 4. HTTP链接测试
- 点击 `[[https://orgmode.org][Org Mode 官方网站]]` 应该在浏览器中打开
- 点击直接链接 `https://www.example.com` 应该在浏览器中打开

### 5. 深层目录测试
- 在 `subdir/deep.org` 中测试回到父目录的链接
- 测试 `[[file:../main.org][主测试文件]]` 相对路径跳转
- 测试跨文件ID链接在深层目录中的工作

## 📋 ID链接映射表

| ID | 文件 | 标题 | 用途 |
|----|------|------|------|
| `MAIN-TEST-A123-4567-8901-BCDEF0123456` | main.org | 测试标题A | 同文件ID测试 |
| `PROJ-VORG-2024-1234-5678-9ABCDEF01234` | projects.org | VOrg 扩展项目 | 跨文件ID测试 |
| `NOTE-IMPORTANT-ABCD-1234-EFGH-567890AB` | notes.org | 重要开发笔记 | 跨文件ID测试 |
| `DEEP-SECTION-9876-5432-1098-FEDCBA654321` | subdir/deep.org | 深层目录测试标题 | 深层目录ID测试 |
| `TODO-TASK-1111-2222-3333-444444444444` | main.org | TODO 待完成的任务 | 状态标题测试 |
| `DONE-TASK-5555-6666-7777-888888888888` | main.org | DONE 已完成的任务 | 状态标题测试 |

## ⚠️ 测试注意事项

1. **ID唯一性** - 每个ID在整个工作区内应该是唯一的
2. **文件路径** - 确保相对路径计算正确
3. **异常处理** - 测试不存在的文件和ID
4. **性能** - 注意大工作区中的搜索性能
5. **编码** - 测试中文和特殊字符的处理

## 🐛 已知问题

- 某些特殊字符在链接中可能需要转义
- 非常大的工作区（>100个.org文件）可能影响ID搜索性能
- 循环引用的链接可能导致意外行为

## 🔧 问题报告

如果发现链接跳转功能有问题，请提供：
1. 具体的链接文本
2. 期望的行为
3. 实际的行为  
4. 控制台错误信息（如果有）

---

**Happy Testing! 🚀** 