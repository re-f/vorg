import * as vscode from 'vscode';

type ShowMode = 'welcome' | 'update' | 'manual';

interface ChangelogItem {
  tag: string;
  tagColor: string;
  textZh: string;
  textEn: string;
}

interface ChangelogEntry {
  title: string;
  items: ChangelogItem[];
}

// 更新日志数据
const CHANGELOG: Record<string, ChangelogEntry> = {
  '1.2.1': {
    title: '双语更新日志 / Bilingual Changelog',
    items: [
      { tag: '🔧', tagColor: '#79c0ff', textZh: '更新日志改为中英双语呈现', textEn: 'Release notes now bilingual (ZH/EN)' },
      { tag: '🔧', tagColor: '#79c0ff', textZh: '内嵌更新日志条目精简并补英文', textEn: 'In-app changelog entries shortened with EN' },
    ],
  },
  '1.2.0': {
    title: '链接统一与强调格式 / Links & Emphasis',
    items: [
      { tag: '✨', tagColor: '#3fb950', textZh: '强调切换：Ctrl+C Ctrl+X Ctrl+F', textEn: 'Emphasis toggle: Ctrl+C Ctrl+X Ctrl+F' },
      { tag: '✨', tagColor: '#3fb950', textZh: '可隐藏强调标记字符', textEn: 'Hide emphasis markers (setting)' },
      { tag: '🔧', tagColor: '#79c0ff', textZh: '[[ 与 Ctrl+C Ctrl+L 统一 id 链接', textEn: 'Unified id links via [[ and Ctrl+C Ctrl+L' },
      { tag: '🔧', tagColor: '#79c0ff', textZh: '链接跳转支持 file:: 锚点', textEn: 'Link follow supports file:: anchors' },
      { tag: '🐛', tagColor: '#58a6ff', textZh: '修复嵌套有序列表编号', textEn: 'Fix nested ordered list numbering' },
    ],
  },
  '1.1.0': {
    title: 'Org Refile 子树移动 / Org Refile',
    items: [
      { tag: '✨', tagColor: '#3fb950', textZh: 'Org Refile：Ctrl+C Ctrl+W 移动子树', textEn: 'Org Refile: move subtrees with Ctrl+C Ctrl+W' },
      { tag: '🔧', tagColor: '#79c0ff', textZh: '跨文件目标显示文件路径', textEn: 'Cross-file targets show file paths' },
      { tag: '🔧', tagColor: '#79c0ff', textZh: '符号搜索支持路径拼音匹配', textEn: 'Symbol search matches file path pinyin' },
      { tag: '🐛', tagColor: '#58a6ff', textZh: '修复集成测试不稳定', textEn: 'Fix flaky integration tests' },
    ],
  },
  '1.0.0': {
    title: 'VOrg-QL 透视视图与全量索引 / VOrg-QL & Index',
    items: [
      { tag: '✨', tagColor: '#3fb950', textZh: 'VOrg-QL 透视视图与自定义查询', textEn: 'VOrg-QL Perspectives and custom queries' },
      { tag: '✨', tagColor: '#3fb950', textZh: '全量工作区索引与拼音搜索', textEn: 'Full workspace index with pinyin search' },
      { tag: '✨', tagColor: '#3fb950', textZh: 'DONE 自动记录 CLOSED 时间戳', textEn: 'DONE auto-records CLOSED timestamps' },
      { tag: '✨', tagColor: '#3fb950', textZh: 'Mermaid 图表预览', textEn: 'Mermaid diagram preview' },
    ],
  },
};

const GITHUB_URL = 'https://github.com/re-f/vorg';

export class ChangelogPanel {
  private static currentPanel: ChangelogPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly version: string,
    private readonly iconUri: vscode.Uri
  ) {
    this.panel = panel;
    this.panel.webview.html = this.buildHtml(iconUri);
    this.panel.webview.onDidReceiveMessage(
      (msg) => {
        if (msg.command === 'openLink') {
          vscode.env.openExternal(vscode.Uri.parse(msg.url));
        }
        if (msg.command === 'dismiss') {
          this.panel.dispose();
        }
      },
      null,
      this.disposables
    );
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static show(context: vscode.ExtensionContext, version: string, mode: ShowMode = 'manual') {
    if (ChangelogPanel.currentPanel) {
      ChangelogPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const title = mode === 'welcome' ? '👋 欢迎使用 VOrg' : `✨ 已更新到 v${version}`;

    const panel = vscode.window.createWebviewPanel(
      'vorgChangelog',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    // 加载扩展图标
    const iconUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'icon.png')
    );

    ChangelogPanel.currentPanel = new ChangelogPanel(panel, version, iconUri);
  }
  private buildHtml(iconUri: vscode.Uri): string {
    const entries = CHANGELOG[this.version];

    const itemsHtml = (entries?.items ?? [])
      .map(({ tag, tagColor, textZh, textEn }) => {
        const typeLabel = tag === '✨' ? 'NEW' : tag === '🐛' ? 'FIX' : 'UPD';
        return `
          <div class="item-row">
            <div class="item-tag" style="color: ${tagColor}; border-color: ${tagColor}44; background: ${tagColor}11;">${typeLabel}</div>
            <div class="item-text">
              <div class="item-text-zh">${textZh}</div>
              <div class="item-text-en">${textEn}</div>
            </div>
          </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<style>
  :root {
    --primary: var(--vscode-button-background);
    --fg: var(--vscode-editor-foreground);
    --bg: var(--vscode-editor-background);
    --border: var(--vscode-widget-border, rgba(128,128,128,0.2));
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: var(--vscode-font-family), "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--fg);
    line-height: 1.4;
    padding: 60px 40px;
    display: flex;
    justify-content: center;
  }

  .main-wrapper {
    width: 100%;
    max-width: 800px;
  }

  /* 核心冲击区：Logo + 产品名 + 更新日志 联排 */
  .hero-section {
    display: flex;
    align-items: center;
    gap: 32px;
    margin-bottom: 60px;
    padding-bottom: 40px;
    border-bottom: 2px solid var(--border);
  }

  .hero-logo {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  }

  .hero-content {
    display: flex;
    flex-direction: column;
  }

  /* 顶级大标题：产品名 + 更新日志 */
  .main-headline {
    font-size: 56px;
    font-weight: 850;
    line-height: 1;
    letter-spacing: -2px;
    margin-bottom: 12px;
    white-space: nowrap;
  }

  .main-headline .brand {
    color: var(--primary);
  }

  .sub-headline {
    font-size: 20px;
    font-weight: 500;
    opacity: 0.7;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .version-chip {
    background: var(--fg);
    color: var(--bg);
    padding: 2px 10px;
    border-radius: 6px;
    font-weight: 800;
    font-family: var(--vscode-editor-font-family), monospace;
  }

  /* 内容列表 */
  .changelog-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 60px;
  }

  .item-row {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 12px 0;
  }

  .item-tag {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 8px;
    border: 1px solid;
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  .item-text {
    font-size: 16px;
    font-weight: 400;
    color: var(--fg);
    opacity: 0.9;
  }

  .item-text-en {
    font-size: 13px;
    opacity: 0.65;
    margin-top: 4px;
  }

  /* 页脚 */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .btn-action {
    background: var(--primary);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.1s;
  }

  .btn-action:hover { transform: scale(1.02); filter: brightness(1.1); }

  .links { display: flex; gap: 24px; }
  .links a {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }
</style>
</head>
<body>

<div class="main-wrapper">
  <div class="hero-section">
    <img src="${iconUri}" class="hero-logo">
    <div class="hero-content">
      <h1 class="main-headline">
        <span class="brand">VOrg</span> 更新日志
      </h1>
      <div class="sub-headline">
        <span class="version-chip">v${this.version}</span>
        <span>${entries?.title ?? '新功能发布'}</span>
      </div>
    </div>
  </div>

  <div class="changelog-body">
    ${itemsHtml}
  </div>

  <footer class="footer">
    <div class="links">
      <a onclick="openLink('${GITHUB_URL}/releases')">完整变更详情</a>
      <a onclick="openLink('${GITHUB_URL}')">GitHub 项目主页</a>
    </div>
    <button class="btn-action" onclick="dismiss()">立即进入工作区</button>
  </footer>
</div>

<script>
  const vscode = acquireVsCodeApi();
  function openLink(url) { vscode.postMessage({ command: 'openLink', url }); }
  function dismiss() { vscode.postMessage({ command: 'dismiss' }); }
</script>
</body>
</html>`;
  }
  private dispose() {
    ChangelogPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

/**
 * 获取上次使用的版本号
 */
function getPreviousVersion(context: vscode.ExtensionContext): string | undefined {
  return context.globalState.get<string>('vorg.previousVersion');
}

/**
 * 设置当前版本号为上次版本号
 */
function setPreviousVersion(context: vscode.ExtensionContext, version: string): void {
  context.globalState.update('vorg.previousVersion', version);
}

/**
 * 检查是否是首次安装
 */
function isFirstInstall(context: vscode.ExtensionContext): boolean {
  return getPreviousVersion(context) === undefined;
}

/**
 * 检查是否是更新
 */
function isUpdate(context: vscode.ExtensionContext, currentVersion: string): boolean {
  const previous = getPreviousVersion(context);
  return previous !== undefined && previous !== currentVersion;
}

/**
 * 显示更新日志
 */
export function showChangelogIfNeeded(context: vscode.ExtensionContext, currentVersion: string): void {
  if (isFirstInstall(context)) {
    ChangelogPanel.show(context, currentVersion, 'welcome');
  } else if (isUpdate(context, currentVersion)) {
    ChangelogPanel.show(context, currentVersion, 'update');
  }
  setPreviousVersion(context, currentVersion);
}
