# 技术决策记录

## TD-001: SQLite 库选择 - better-sqlite3

**日期**: 2026-01-28  
**状态**: 已采纳  
**决策者**: 开发团队

### 背景

Phase 0 需要选择 SQLite 库实现结构化存储。主要候选方案:
- better-sqlite3 (native bindings)
- sql.js (WebAssembly)

### 决策

选择 **better-sqlite3**

### 理由

#### 性能优势
- 查询性能: 2.9x - 24.4x 快于其他方案
- 插入性能: 15.6x 快于异步方案
- 同步 API,无异步开销

#### 技术匹配
- VS Code 扩展运行在 Node.js 环境
- 同步 API 更符合扩展开发模式
- org-roam 使用类似方案(SQLite + emacsql)

#### 权衡
**优点**:
- ✅ 极致性能
- ✅ 简洁的同步 API
- ✅ 完整的事务支持
- ✅ 更好的内存管理

**缺点**:
- ❌ 需要 native bindings (C++ 编译)
- ❌ 跨平台需要预编译二进制

**缓解措施**:
- 使用 `@vscode/vsce` 打包时自动处理 native 模块
- 提供预编译二进制 (Windows/macOS/Linux)
- 降级方案: 如果加载失败,提示用户重新安装

### 性能目标

基于 better-sqlite3 的性能特性,设定目标:
- 索引 100 个文件: < 5 秒
- 单次查询: < 50ms
- 增量更新: < 100ms

### 参考资料

- [better-sqlite3 vs sqlite3 性能对比](https://github.com/WiseLibs/better-sqlite3)
- [VS Code 扩展 native 模块最佳实践](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)
- [org-roam 数据库架构](https://github.com/org-roam/org-roam)
