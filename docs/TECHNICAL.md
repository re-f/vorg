# VOrg 技术架构文档

## 🏗️ 整体架构

VOrg 扩展采用模块化设计，基于 VS Code Extension API 构建：

```
VOrg Extension
├── Language Support        # Org-mode 语言支持 (package.json)
├── Preview Engine          # 预览引擎 (src/preview/)
├── Outline Provider        # 大纲导航提供器 (src/outline/)
├── Command Manager         # 命令管理器 (src/commands/)
├── Service Layer           # 服务层 (src/services/)
└── Extension Entry         # 扩展入口 (src/extension.ts)
```

## 🔧 核心技术栈

### 文档处理管道
- **unified.js**: 文档处理管道核心，提供插件化的文档转换架构
- **uniorg-parse**: Org-mode 专用解析器，将 .org 文本转换为 AST
- **uniorg-rehype**: Org-mode 到 HTML 转换器，处理语法元素映射
- **rehype-stringify**: HTML 字符串化处理，生成最终的 HTML 输出

*具体的处理流程实现参见 `src/preview/htmlGenerator.ts` 中的 `generatePreviewHtml` 方法。*

### VS Code 集成
- **WebView API**: 用于预览窗口的 HTML 渲染和消息通信
- **DocumentSymbolProvider**: 提供文档大纲和符号导航功能
- **WorkspaceSymbolProvider**: 提供工作区级别的符号搜索功能
- **FileSystemWatcher**: 监听文件变化，实现索引自动更新
- **Extension API**: 命令注册、事件监听、面板管理

*详细的 API 使用和实现逻辑分布在各模块的源代码中。*

## ⚙️ 架构设计原则

### 1. 单一职责
每个模块专注于特定功能领域：
- `PreviewManager`: 专注预览窗口生命周期管理
- `HtmlGenerator`: 专注文档转换和样式生成
- `ScrollSync`: 专注编辑器与预览的滚动同步
- `OrgOutlineProvider`: 专注文档结构解析和符号提供
- `OrgSymbolIndexService`: 专注工作区级别的标题索引和搜索

### 2. 事件驱动
基于 VS Code 事件系统实现响应式更新：
- 文档变化 → 预览更新
- 编辑器滚动 → 预览同步
- 主题切换 → 样式适配

*事件注册和处理逻辑参见 `src/commands/previewCommands.ts` 中的 `registerEventListeners` 方法。*

### 3. 状态管理
使用轻量级状态管理模式：
- `PreviewPanelManager`: 管理多个预览面板的状态
- `OrgSymbolIndexService`: 管理工作区符号索引缓存
- 常量集中管理：`src/utils/constants.ts`
- 类型安全：`src/types/index.ts`

### 4. 服务层架构
提供可复用的核心服务，采用单例模式确保全局共享：
- `OrgSymbolIndexService`: 工作区级别的标题符号索引服务
  - **内存缓存机制**: 首次扫描后，所有标题信息缓存在内存中，实现快速搜索
  - **自动更新机制**: 通过 FileSystemWatcher 监听文件变化，实时维护索引
  - **单例模式**: 全局共享实例，避免重复索引，提升性能
  - **高性能搜索**: 支持模糊匹配和多关键词搜索，响应时间 < 50ms
  - **应用场景**: 工作区符号搜索（Cmd+T / Ctrl+T）、链接插入、引用导航等

*详细的服务实现和使用方法参见 `src/services/orgSymbolIndexService.ts` 和 `src/services/README.md`。*

## 🔄 关键工作流程

### 扩展激活
```
用户打开 .org 文件 → 扩展激活 → 初始化服务（符号索引服务等） → 注册命令和提供器 → 设置事件监听
```

### 符号索引构建
```
扩展激活 → 初始化 OrgSymbolIndexService → 首次搜索触发索引构建 → 扫描所有 .org 文件 → 提取标题信息 → 建立内存索引 → 文件变化时增量更新
```

### 预览生成
```
用户触发预览命令 → 创建 WebView 面板 → 解析文档内容 → 生成 HTML → 渲染显示
```

### 实时同步
```
文档内容变化 → 触发变化事件 → 重新解析内容 → 更新预览面板 → 同步滚动位置
```

*具体的流程实现细节和错误处理机制已在源代码中详细注释。*

## 🚀 性能优化策略

### 1. 计算优化
- **防抖处理**: 避免频繁的重新渲染（实现在事件监听器中）
- **增量更新**: 只处理变化的内容部分
- **缓存机制**: WebView 保持上下文以减少重新创建开销

### 2. 内存管理
- **智能清理**: WebView 面板销毁时自动清理资源
- **订阅管理**: 统一管理 VS Code 事件订阅的生命周期
- **Context 订阅**: 使用 `context.subscriptions` 确保资源正确释放
- **索引缓存**: 符号索引服务使用内存缓存，首次构建后快速响应搜索请求
- **文件监听优化**: 仅在文件变化时更新对应文件的索引，避免全量重建

## 🔒 错误处理策略

### 1. 类型安全
- TypeScript 类型检查防止运行时错误
- 严格的接口定义确保数据结构一致性

### 2. 优雅降级
- 非 Org 文件显示信息页面而非错误
- 解析失败时显示友好的错误信息
- 编辑器或面板不存在时安全退出

*具体的错误处理实现参见 `HtmlGenerator` 类中的 `generateInfoHtml` 和 `generateErrorHtml` 方法。*

## 📊 扩展性设计

### 1. 模块化架构
- 清晰的模块边界和接口定义
- 新功能可作为独立模块添加
- 最小化模块间的耦合

### 2. 配置驱动
- 使用 `package.json` 配置语言支持和命令
- CSS 变量系统支持主题定制
- 常量集中管理便于配置调整

### 3. 插件化处理
- unified.js 插件架构支持自定义处理器
- 可扩展的语法解析和渲染管道

## 🔮 未来架构规划

### 短期优化
- [ ] 引入 Web Workers 处理大文档解析
- [ ] 实现更精细的增量更新算法
- [ ] 添加配置缓存机制

### 长期规划
- [ ] 插件生态系统建设
- [ ] 多文档格式支持架构
- [ ] 云端同步架构设计

---

*本文档专注于架构设计和技术决策，具体的实现细节、API 使用方法和代码逻辑请参考源代码中的注释和实现。* 