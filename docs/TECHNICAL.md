# VOrg 技术架构文档

## 🏗️ 整体架构

VOrg 扩展采用模块化设计，主要由以下几个核心组件构成：

```
VOrg Extension
├── Language Support        # Org-mode 语言支持
├── Preview Engine          # 预览引擎
├── Sync Manager           # 同步管理器
└── Theme Adapter          # 主题适配器
```

## 🔧 核心技术栈

### 前端技术
- **TypeScript**: 主要开发语言，提供类型安全
- **VS Code Extension API**: 扩展开发框架
- **WebView API**: 预览窗口渲染

### 文档处理
- **unified.js**: 文档处理管道核心
- **uniorg-parse**: Org-mode 专用解析器
- **uniorg-rehype**: Org-mode 到 HTML 转换器
- **rehype-stringify**: HTML 字符串化处理

## 📁 项目结构

```
vorg/
├── src/
│   └── extension.ts           # 主扩展逻辑
├── syntaxes/
│   └── org.tmLanguage.json    # Org-mode 语法定义
├── docs/                      # 文档目录
│   ├── FEATURES.md           # 功能特性
│   ├── USER_GUIDE.md         # 用户指南
│   └── TECHNICAL.md          # 技术文档
├── out/                       # 编译输出
├── package.json              # 扩展清单
├── tsconfig.json             # TypeScript 配置
├── language-configuration.json # 语言配置
└── example.org               # 示例文件
```

## ⚙️ 核心模块详解

### 1. 语言支持模块

#### 文件关联
```json
{
  "languages": [{
    "id": "org",
    "extensions": [".org"],
    "configuration": "./language-configuration.json"
  }]
}
```

#### 语法高亮
- 基于 TextMate 语法定义
- 支持标题、列表、代码块、链接等语法元素
- 自动着色和语法识别

### 2. 预览引擎

#### 文档解析流程
```typescript
const processor = unified()
  .use(uniorgParse)      // 解析 Org-mode 语法
  .use(uniorgRehype)     // 转换为 HTML AST
  .use(rehypeStringify); // 生成 HTML 字符串
```

#### 渲染管道
1. **文档监听**: 监听文档变化事件
2. **增量解析**: 只处理变化的内容
3. **HTML 生成**: 转换为带样式的 HTML
4. **WebView 更新**: 更新预览窗口内容

### 3. 同步管理器

#### 滚动同步算法
```typescript
function syncScrollToPreview(panel: vscode.WebviewPanel) {
  const editor = vscode.window.activeTextEditor;
  const visibleRanges = editor.visibleRanges;
  
  if (visibleRanges.length > 0) {
    const firstVisibleLine = visibleRanges[0].start.line;
    const totalLines = editor.document.lineCount;
    const scrollPercentage = firstVisibleLine / Math.max(totalLines - 1, 1);
    
    panel.webview.postMessage({
      command: 'updateScroll',
      scrollPercentage: scrollPercentage
    });
  }
}
```

#### 消息通信机制
- **Editor → WebView**: 滚动位置、内容更新
- **WebView → Editor**: 准备就绪状态、错误反馈

### 4. 主题适配器

#### 主题检测
```typescript
const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
```

#### CSS 变量系统
```css
:root {
  --bg-color: ${isDarkTheme ? '#1e1e1e' : '#ffffff'};
  --text-color: ${isDarkTheme ? '#d4d4d4' : '#333333'};
  --border-color: ${isDarkTheme ? '#404040' : '#e1e4e8'};
  /* ... 更多主题变量 */
}
```

## 🔄 工作流程

### 扩展激活流程
1. **事件触发**: `onLanguage:org` 或 `onCommand:vorg.*`
2. **命令注册**: 注册预览相关命令
3. **事件监听**: 设置文档变化和滚动监听器
4. **准备就绪**: 扩展激活完成

### 预览创建流程
1. **命令执行**: 用户触发预览命令
2. **窗口创建**: 创建 WebView 面板
3. **内容渲染**: 解析文档并生成 HTML
4. **事件绑定**: 设置消息通信和事件监听

### 实时更新流程
1. **变化检测**: 监听到文档内容变化
2. **增量解析**: 重新解析变化的内容
3. **HTML 更新**: 生成新的 HTML 内容
4. **界面刷新**: 更新 WebView 显示

## 🚀 性能优化策略

### 1. 渲染优化
- **增量更新**: 只重新渲染变化的部分
- **防抖处理**: 避免频繁的更新操作
- **缓存机制**: 缓存解析结果和渲染内容

### 2. 内存管理
- **智能清理**: 自动清理未使用的预览窗口
- **资源释放**: 及时释放事件监听器和订阅
- **弱引用**: 使用弱引用避免内存泄漏

### 3. 计算优化
- **异步处理**: 非阻塞的文档解析
- **批量操作**: 合并多个变化为单次更新
- **延迟加载**: 按需加载复杂组件

## 🔒 错误处理机制

### 1. 解析错误
```typescript
try {
  const html = processor.processSync(text).toString();
  panel.webview.html = generateStyledHtml(html);
} catch (error) {
  panel.webview.html = generateErrorHtml(error);
}
```

### 2. 类型检查
- 文件类型验证
- 编辑器状态检查
- 面板有效性验证

### 3. 优雅降级
- 非 Org 文件显示友好提示
- 解析失败时显示错误信息
- 网络资源加载失败的备用方案

## 📊 扩展性设计

### 1. 插件架构
- 模块化的组件设计
- 清晰的接口定义
- 可扩展的配置系统

### 2. 主题系统
- CSS 变量驱动的主题
- 自定义样式支持
- 响应式设计

### 3. 语法扩展
- 可插拔的语法解析器
- 自定义渲染器支持
- 第三方语法集成

## 🧪 测试策略

### 1. 单元测试
- 核心函数逻辑测试
- 文档解析功能测试
- 错误处理机制测试

### 2. 集成测试
- 扩展激活流程测试
- 预览功能端到端测试
- 多种文档格式兼容性测试

### 3. 性能测试
- 大文档渲染性能
- 内存使用情况监控
- 响应时间基准测试

## 🔮 未来架构规划

### 短期优化
- [ ] 引入 Web Workers 处理大文档
- [ ] 实现虚拟滚动优化性能
- [ ] 添加配置缓存机制

### 长期规划
- [ ] 微前端架构重构
- [ ] 插件生态系统建设
- [ ] 云端同步架构设计 