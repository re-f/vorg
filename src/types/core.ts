/**
 * API-independent core types.
 * These interfaces allow the core logic to run without depending on vscode.
 */

export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface TextLine {
    text: string;
    lineNumber: number;
    range: Range;
}

export interface TextDocument {
    lineCount: number;
    lineAt(line: number): TextLine;
    getText(range?: Range): string;
}
