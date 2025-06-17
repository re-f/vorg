# VOrg - Org-mode Preview for VS Code

VOrg 是一个 VS Code 扩展，提供 Org-mode 文档的实时预览功能，类似于 Markdown Preview Enhanced。它允许用户在编辑 Org-mode 文档的同时，实时查看渲染后的效果。

## 功能特点

- 🔄 **实时预览** - 编辑时自动更新预览
- 🎨 **主题适配** - 自动适应 VS Code 明暗主题
- 📱 **并排预览** - 支持编辑器和预览窗口并排显示
- 🚀 **完整语法支持** - 支持所有标准 Org-mode 语法
- 💻 **现代界面** - 美观的预览样式和用户体验

## 支持的 Org-mode 语法

### 基本格式
- **标题层级**（使用 `*` 标记）
- **文本格式**：*粗体*、/斜体/、_下划线_、=代码=、~等宽字体~
- **列表**（有序和无序）
- **任务列表**（TODO 项目）

### 高级功能
- **代码块**（支持语法高亮）
- **表格**（完整的表格渲染）
- **引用块**
- **链接**（内部和外部链接）
- **图片**（支持在线图片）
- **标签**（标题标签）
- **数学公式**（基础支持）

## 使用方法

### 打开预览

有多种方式可以打开 Org-mode 预览：

1. **快捷键**：
   - `Ctrl+Shift+V` (Windows/Linux) 或 `Cmd+Shift+V` (Mac) - 在当前标签页打开预览
   - `Ctrl+K V` (Windows/Linux) 或 `Cmd+K V` (Mac) - 并排打开预览

2. **编辑器按钮**：
   - 点击编辑器右上角的预览图标

3. **命令面板**：
   - 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac) 打开命令面板
   - 执行 `VOrg: Open Preview` 或 `VOrg: Open Preview to the Side`

### 预览模式

- **普通预览**：在当前编辑器标签页中打开预览
- **并排预览**：在编辑器旁边打开预览窗口，实现真正的并排编辑和预览

## 安装

### 从源码安装（开发版）

1. 克隆项目：
   ```bash
   git clone <repository-url>
   cd vorg
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 编译项目：
   ```bash
   npm run compile
   ```

4. 在 VS Code 中打开项目文件夹

5. 按 `F5` 启动调试，这会打开一个新的 VS Code 窗口并加载扩展

6. 在新窗口中打开 `example.org` 文件测试功能

## 开发

### 项目结构

```
vorg/
├── src/
│   └── extension.ts        # 主要扩展逻辑
├── out/                    # 编译输出目录
├── package.json           # 扩展清单文件
├── tsconfig.json          # TypeScript 配置
├── example.org            # 示例 Org 文件
└── README.md              # 说明文档
```

### 构建和测试

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式编译
npm run watch

# 运行测试
npm test
```

### 调试

1. 在 VS Code 中打开项目
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中测试扩展功能

## 技术架构

- **VS Code Extension API** - 扩展开发框架
- **unified** - 文本处理管道
- **uniorg-parse** - Org-mode 解析器
- **uniorg-rehype** - Org-mode 到 HTML 转换器
- **rehype-stringify** - HTML 字符串化

## 特性对比

| 功能 | VOrg | 其他 Org 扩展 |
|------|------|---------------|
| 实时预览 | ✅ | ❌ |
| 并排预览 | ✅ | ❌ |
| 主题适配 | ✅ | ❌ |
| 完整语法支持 | ✅ | ⚠️ |
| 现代界面 | ✅ | ❌ |

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 更新日志

### v0.0.1
- 初始版本
- 基本的 Org-mode 预览功能
- 支持实时更新
- 支持明暗主题
- 支持并排预览 