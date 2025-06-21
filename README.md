# VOrg - Org-mode Preview for VS Code

VOrg 是一个 VS Code 扩展，提供 Org-mode 文档的实时预览功能，类似于 Markdown Preview Enhanced。它允许用户在编辑 Org-mode 文档的同时，实时查看渲染后的效果。

## ✨ 功能特点
- 🔄 **实时预览** 实时预览，并排预览
- 🎨 **主题适配** - 自动适应 VS Code 明暗主题
- 🚀 **完整语法支持** - 支持所有标准 Org-mode 语法
- 📋 **文档大纲** - 智能解析文档结构，提供完整的 Outline 导航
- 🌈 **智能语法高亮** 
- 🔗 **链接跳转** - 支持多种链接类型的智能跳转和插入功能
- ⚡ **智能编辑** - 类似 Emacs org-meta-return 的上下文感知编辑功能

## 🚀 快速开始

### 使用方法

1. **打开预览**：
   - 快捷键：`Ctrl+Shift+V` (Windows/Linux) 或 `Cmd+Shift+V` (Mac)
   - 命令面板：`VOrg: Open Preview`
   - 点击编辑器右上角的预览图标

2. **并排预览**：
   - 快捷键：`Ctrl+K V` (Windows/Linux) 或 `Cmd+K V` (Mac)
   - 命令面板：`VOrg: Open Preview to the Side`

3. **链接跳转**：
   - 快捷键：`Ctrl+Enter` (Windows/Linux) 或 `Cmd+Enter` (Mac) - 跟随光标处的链接
   - 快捷键：`Ctrl+L` (Windows/Linux) 或 `Cmd+L` (Mac) - 插入新链接
   - 鼠标：`Ctrl+Click` (Windows/Linux) 或 `Cmd+Click` (Mac) - 跟随链接

4. **智能编辑** (类似 Emacs org-meta-return)：
   - 快捷键：`Alt+Enter` - 智能插入新元素（标题、列表项、表格行等）
   - 快捷键：`Ctrl+Alt+Enter` (Windows/Linux) 或 `Cmd+Ctrl+Enter` (Mac) - 在子树末尾插入同级元素
   - 快捷键：`Shift+Alt+Enter` - 插入TODO标题

5. **智能 TAB 折叠** (类似 Emacs org-mode TAB 行为)：
   - 快捷键：`Tab` - 主要用于可见性控制（折叠/展开切换）
     - 在标题上：切换折叠/展开状态
     - 在列表项上：切换折叠状态（有子项）或增加缩进（无子项）
     - 在代码块标题上：切换代码块的折叠/展开状态
     - 在表格中：移动到下一个单元格
     - 在代码块内：正常代码缩进
   - 快捷键：`Shift+Tab` - 在列表中减少缩进，在表格中反向导航

6. **文档大纲导航**：
   - 查看侧边栏的 "Outline" 面板
   - 使用 `Ctrl+Shift+O` (Windows/Linux) 或 `Cmd+Shift+O` (Mac) 快速跳转
   - 自动解析标题层级、文档属性和标签

### 支持的 Org-mode 语法

- **标题层级**（使用 `*` 标记，1-6级标题）
- **TODO 状态**（TODO、DONE、NEXT、WAITING、CANCELLED）
- **文本格式**：*粗体*、/斜体/、_下划线_、+删除线+、=代码=、~等宽字体~
- **列表**（有序、无序和任务列表）
- **代码块**（支持语言标识和语法高亮）
- **引用块和示例块**
- **表格**（完整的表格语法支持）
- **链接**（内部、外部和裸链接，支持跳转功能）
- **数学公式**（行内和块级公式）
- **时间戳**（多种时间格式）
- **标签**（标题标签和属性）
- **注释和分隔线**

## 📚 文档

- **[功能特性](docs/FEATURES.md)** - 详细的功能介绍和特性说明
- **[用户指南](docs/USER_GUIDE.md)** - 完整的使用教程和语法指南
- **[技术文档](docs/TECHNICAL.md)** - 架构设计和技术实现细节
- **[语法高亮](docs/SYNTAX_HIGHLIGHTING.md)** - 语法高亮功能详细说明
- **[TAB 智能折叠](docs/TAB_SMART_INDENTATION.md)** - TAB 键智能折叠功能详细说明

## 🛠️ 开发

### 环境要求

- Node.js 14.x 或更高版本
- VS Code 1.60.0 或更高版本

### 构建和测试

```bash
# 安装依赖
npm install

# 编译项目
npm run compile

# 监听模式编译
npm run watch

# 运行测试
npm test
```

### 调试

1. 在 VS Code 中打开项目
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中打开 `example.org` 文件测试功能

## 🏗️ 项目结构

```
vorg/
├── src/                       # 源代码
│   ├── extension.ts          # 主扩展逻辑
│   ├── commands/             # 命令管理
│   ├── preview/              # 预览功能
│   ├── outline/              # 大纲导航
│   │   └── orgOutlineProvider.ts  # Outline Provider
│   ├── links/                # 链接跳转功能
│   │   └── orgLinkProvider.ts     # Link Provider
│   ├── types/                # 类型定义
│   └── utils/                # 工具函数
├── syntaxes/                 # 语法定义
│   └── org.tmLanguage.json   # Org-mode 语法高亮
├── docs/                     # 文档
│   ├── FEATURES.md          # 功能特性
│   ├── USER_GUIDE.md        # 用户指南
│   └── TECHNICAL.md         # 技术文档
├── out/                      # 编译输出
├── package.json             # 扩展清单
├── tsconfig.json            # TypeScript 配置
├── language-configuration.json # 语言配置
└── example.org              # 示例文件
```

## 🔧 技术架构

- **VS Code Extension API** - 扩展开发框架
- **unified** - 文本处理管道
- **uniorg-parse** - Org-mode 解析器
- **uniorg-rehype** - Org-mode 到 HTML 转换器
- **rehype-stringify** - HTML 字符串化

详细的技术架构请参考 [技术文档](docs/TECHNICAL.md)。

## 🆚 特性对比

| 功能 | VOrg | 其他 Org 扩展 |
|------|------|---------------|
| 实时预览 | ✅ | ❌ |
| 并排预览 | ✅ | ❌ |
| 滚动同步 | ✅ | ❌ |
| 文档大纲 | ✅ | ❌ |
| 主题适配 | ✅ | ⚠️ |
| 完整语法支持 | ✅ | ⚠️ |
| 现代界面 | ✅ | ❌ |


## 📄 许可证

MIT License

## 🔮 未来规划

### 支持的链接类型

VOrg 现在支持完整的 Org-mode 链接跳转功能：

1. **[[link][description]]** - 带描述的链接
2. **[[link]]** - 简单链接
3. **file:path/to/file** - 文件链接
4. **http://example.com** - 网页链接
5. **[[*heading]]** - 内部链接到同文件的标题（org-mode标准格式）
6. **[[id:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX][description]]** - 全局ID跳转（支持跨文件）

### 短期目标
- [x] 链接跳转功能
- [x] 智能编辑命令 (org-meta-return 风格)
- [ ] 添加导出功能（PDF、HTML、Word）
- [ ] 支持数学公式渲染（MathJax）
- [ ] 添加图表支持（Mermaid、PlantUML）
- [ ] 优化大文档性能

### 长期愿景
- [ ] 插件生态系统
- [ ] 支持 org-babel
- [ ] 缓存工作区中 org 文件元数据，如
  - [ ] org-ids
  - [ ] headline
  - [ ] ...

## 📞 支持

如果您在使用过程中遇到问题或有改进建议：

- 🐛 **问题反馈**：创建 [GitHub Issue](https://github.com/your-repo/vorg/issues)
- 💡 **功能建议**：参与 [GitHub Discussions](https://github.com/your-repo/vorg/discussions)
- 📖 **使用文档**：查看 [用户指南](docs/USER_GUIDE.md)

---

**VOrg - 让 Org-mode 编辑更加现代化和高效！** 🚀 