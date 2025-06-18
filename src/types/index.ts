import * as vscode from 'vscode';

export interface PreviewPanelManager {
  currentPanel: vscode.WebviewPanel | undefined;
  currentSidePanel: vscode.WebviewPanel | undefined;
}

export interface ScrollSyncOptions {
  scrollPercentage: number;
}

export interface WebviewMessage {
  command: string;
  scrollPercentage?: number;
}

export interface PreviewOptions {
  enableScripts: boolean;
  retainContextWhenHidden: boolean;
} 