import * as vscode from 'vscode';
import { EventEmitter } from 'events';

/**
 * File event types
 */
export enum FileEventType {
    Created,
    Changed,
    Deleted
}

/**
 * File event interface
 */
export interface FileEvent {
    uri: vscode.Uri;
    type: FileEventType;
}

/**
 * WorkspaceWatcher listens for changes to .org and .org_archive files
 * and emits events with de-bouncing.
 */
export class WorkspaceWatcher extends EventEmitter {
    private watcher: vscode.FileSystemWatcher;
    private disposables: vscode.Disposable[] = [];
    private pendingChanges: Map<string, NodeJS.Timeout> = new Map();
    private readonly debounceMs = 500;

    constructor() {
        super();
        // Watch for .org and .org_archive files
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.{org,org_archive}');

        this.watcher.onDidCreate(uri => this.handleEvent(uri, FileEventType.Created), null, this.disposables);
        this.watcher.onDidChange(uri => this.handleEvent(uri, FileEventType.Changed), null, this.disposables);
        this.watcher.onDidDelete(uri => this.handleEvent(uri, FileEventType.Deleted), null, this.disposables);
    }

    /**
     * Handle file system events with de-bouncing
     */
    private handleEvent(uri: vscode.Uri, type: FileEventType) {
        const key = `${uri.toString()}:${type}`;

        // Clear existing timer if any
        const existingTimer = this.pendingChanges.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
            this.emit('fileEvent', { uri, type } as FileEvent);
            this.pendingChanges.delete(key);
        }, this.debounceMs);

        this.pendingChanges.set(key, timer);
    }

    /**
     * Dispose of the watcher and its resources
     */
    public dispose() {
        // Clear all pending timers
        for (const timer of this.pendingChanges.values()) {
            clearTimeout(timer);
        }
        this.pendingChanges.clear();

        // Dispose watch and handlers
        this.watcher.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
