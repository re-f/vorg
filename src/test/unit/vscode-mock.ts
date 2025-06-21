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