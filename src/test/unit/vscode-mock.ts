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