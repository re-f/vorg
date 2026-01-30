# Services

服务层模块，提供可复用的核心功能。

## OrgSymbolIndexService

Org-mode 标题符号索引服务，提供高性能的标题搜索和导航功能。

### 特性

- **内存缓存**：首次扫描后，所有标题信息缓存在内存中
- **自动更新**：通过 FileWatcher 监听文件变化，自动维护索引
- **单例模式**：全局共享，避免重复索引
- **高性能**：后续搜索响应时间 < 50ms

### 使用示例

```typescript
import * as vscode from 'vscode';
import { OrgSymbolIndexService } from './services/orgSymbolIndexService';

// 获取服务实例
const indexService = OrgSymbolIndexService.getInstance();

// 搜索标题（模糊匹配）
const symbols = await indexService.searchSymbols('project meeting');

// 获取指定文件的所有标题
const uri = vscode.Uri.file('/path/to/file.org');
const fileSymbols = await indexService.getSymbolsForFile(uri);

// 获取所有标题
const allSymbols = await indexService.getAllSymbols();

// 获取统计信息
const stats = indexService.getStats();
console.log(`已索引 ${stats.fileCount} 个文件，共 ${stats.symbolCount} 个标题`);
```

### 应用场景

1. **工作区符号搜索**（`OrgWorkspaceSymbolProvider`）
   - 实现 Cmd+T / Ctrl+T 快速搜索功能

2. **链接插入**（计划中）
   - 插入链接时快速查找目标标题
   - 提供标题自动补全

3. **引用导航**（计划中）
   - 查找所有引用某个标题的位置
   - 实现"查找所有引用"功能

4. **标题重构**（计划中）
   - 批量更新标题引用
   - 重命名标题时自动更新链接

### 性能数据

基于 500 个 .org 文件的测试数据：

| 操作 | 时间 |
|------|------|
| 首次索引构建 | ~3秒 |
| 后续搜索 | ~50ms |
| 文件修改时更新 | ~20ms |
| 内存占用 | ~5MB |

### 注意事项

- 服务在扩展激活时自动初始化
- 首次搜索时会触发索引构建（仅一次）
- 扩展卸载时会自动清理资源
- 不要手动调用 `dispose()`，由 VS Code 管理


