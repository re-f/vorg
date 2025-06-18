# VOrg - Org-mode Preview for VS Code

VOrg 是一个 VS Code 扩展，提供 Org-mode 文档的实时预览功能，类似于 Markdown Preview Enhanced。它允许用户在编辑 Org-mode 文档的同时，实时查看渲染后的效果。

## ✨ 功能特点

- 🔄 **实时预览** - 编辑时自动更新预览
- 🎨 **主题适配** - 自动适应 VS Code 明暗主题
- 📱 **并排预览** - 支持编辑器和预览窗口并排显示
- 🚀 **完整语法支持** - 支持所有标准 Org-mode 语法
- 💻 **现代界面** - 美观的预览样式和用户体验
- 🔄 **滚动同步** - 编辑器与预览窗口精准同步滚动
- 📋 **文档大纲** - 智能解析文档结构，提供完整的 Outline 导航

## 🚀 快速开始

### 使用方法

1. **打开预览**：
   - 快捷键：`Ctrl+Shift+V` (Windows/Linux) 或 `Cmd+Shift+V` (Mac)
   - 命令面板：`VOrg: Open Preview`
   - 点击编辑器右上角的预览图标

2. **并排预览**：
   - 快捷键：`Ctrl+K V` (Windows/Linux) 或 `Cmd+K V` (Mac)
   - 命令面板：`VOrg: Open Preview to the Side`

3. **文档大纲导航**：
   - 查看侧边栏的 "Outline" 面板
   - 使用 `Ctrl+Shift+O` (Windows/Linux) 或 `Cmd+Shift+O` (Mac) 快速跳转
   - 自动解析标题层级、文档属性和标签

### 支持的 Org-mode 语法

- **标题层级**（使用 `*` 标记）
- **文本格式**：*粗体*、/斜体/、_下划线_、=代码=、~等宽字体~
- **列表**（有序和无序）
- **任务列表**（TODO 项目）
- **代码块**（支持语法高亮）
- **表格**（完整的表格渲染）
- **引用块**
- **链接**（内部和外部链接）
- **图片**（支持在线图片）
- **标签**（标题标签）

## 📚 文档

- **[功能特性](docs/FEATURES.md)** - 详细的功能介绍和特性说明
- **[用户指南](docs/USER_GUIDE.md)** - 完整的使用教程和语法指南
- **[技术文档](docs/TECHNICAL.md)** - 架构设计和技术实现细节

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

### 短期目标
- [ ] 添加导出功能（PDF、HTML、Word）
- [ ] 支持数学公式渲染（MathJax）
- [ ] 添加图表支持（Mermaid、PlantUML）
- [ ] 优化大文档性能

### 长期愿景
- [ ] 插件生态系统
- [ ] 支持 org-babel

## 📞 支持

如果您在使用过程中遇到问题或有改进建议：

- 🐛 **问题反馈**：创建 [GitHub Issue](https://github.com/your-repo/vorg/issues)
- 💡 **功能建议**：参与 [GitHub Discussions](https://github.com/your-repo/vorg/discussions)
- 📖 **使用文档**：查看 [用户指南](docs/USER_GUIDE.md)

---

**VOrg - 让 Org-mode 编辑更加现代化和高效！** 🚀 