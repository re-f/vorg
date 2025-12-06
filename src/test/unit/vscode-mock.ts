// Mock implementation of VS Code API for unit testing

export enum FoldingRangeKind {
  Comment = 1,
  Imports = 2,
  Region = 3
}

export class FoldingRange {
  constructor(
    public start: number,
    public end: number,
    public kind?: FoldingRangeKind
  ) {}
}

export class Position {
  constructor(
    public line: number,
    public character: number
  ) {}
}

export class Range {
  constructor(
    public start: Position,
    public end: Position
  ) {}
}

export interface TextDocument {
  getText(): string;
}

export interface FoldingContext {
  // Mock interface for folding context
}

export interface CancellationToken {
  // Mock interface for cancellation token
}

export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;

// Mock configuration
class MockWorkspaceConfiguration {
  private config: { [key: string]: any } = {
    'vorg.todoKeywords': 'TODO NEXT WAITING | DONE CANCELLED',
    'vorg.defaultTodoKeyword': 'TODO'
  };

  get<T>(key: string, defaultValue?: T): T {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  has(key: string): boolean {
    return this.config.hasOwnProperty(key);
  }

  inspect<T>(key: string): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T } | undefined {
    return undefined;
  }

  update(key: string, value: any): Promise<void> {
    this.config[key] = value;
    return Promise.resolve();
  }
}

// Mock CompletionItemKind
export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25
}

// Mock CompletionItem
export class CompletionItem {
  label: string | { label: string; description?: string };
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string | { value: string };
  insertText?: string;
  filterText?: string;
  sortText?: string;
  range?: Range | { inserting: Range; replacing: Range };
  command?: { title: string; command: string; arguments?: any[] };
  
  constructor(label: string | { label: string; description?: string }, kind?: CompletionItemKind) {
    this.label = label;
    this.kind = kind;
  }
}

// Mock MarkdownString
export class MarkdownString {
  value: string;
  
  constructor(value?: string) {
    this.value = value || '';
  }
  
  appendText(value: string): MarkdownString {
    this.value += value;
    return this;
  }
  
  appendMarkdown(value: string): MarkdownString {
    this.value += value;
    return this;
  }
  
  appendCodeblock(value: string, language?: string): MarkdownString {
    this.value += `\`\`\`${language || ''}\n${value}\n\`\`\``;
    return this;
  }
}

// Mock workspace
export const workspace = {
  getConfiguration: (section?: string): MockWorkspaceConfiguration => {
    return new MockWorkspaceConfiguration();
  },
  
  onDidChangeConfiguration: (listener: (e: any) => void) => {
    // Mock event listener - returns a disposable
    return {
      dispose: () => {}
    };
  }
};

// 导出完整的 mock vscode 对象
export const vscode = {
  CompletionItemKind,
  CompletionItem,
  Position,
  Range,
  MarkdownString,
  workspace: {
    ...workspace,
    openTextDocument: async (uri: any) => {
      // 默认实现，可以在测试中覆盖
      return {
        uri: typeof uri === 'string' ? { fsPath: uri, toString: () => uri } : uri,
        lineCount: 0,
        lineAt: () => ({ text: '', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } }),
        getText: () => ''
      };
    }
  }
}; 