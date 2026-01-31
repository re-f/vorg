import * as vscode from 'vscode';
import { WorkspaceWatcher, FileEvent, FileEventType } from './workspaceWatcher';
import { WorkspaceIndexer } from './workspaceIndexer';
import { FileIndexer } from './fileIndexer';
import { FileRepository } from './fileRepository';
import { DatabaseConnection } from './connection';
import { Logger } from '../utils/logger';

import { HeadingRepository } from './headingRepository';
import { LinkRepository } from './linkRepository';
import { UniorgAstExtractor } from './uniorgAstExtractor';

/**
 * VSCode implementation of FileProvider
 */
class VSCodeFileProvider {
    async findFiles(pattern: string): Promise<string[]> {
        const uris = await vscode.workspace.findFiles(pattern);
        return uris.map(u => u.fsPath);
    }

    async readFile(uri: string): Promise<string> {
        const vscodeUri = vscode.Uri.file(uri);
        const content = await vscode.workspace.fs.readFile(vscodeUri);
        return content.toString();
    }
}

/**
 * IncrementalUpdateService coordinates workspace indexing and real-time updates.
 */
export class IncrementalUpdateService implements vscode.Disposable {
    private watcher: WorkspaceWatcher;
    private workspaceIndexer: WorkspaceIndexer;
    private fileIndexer: FileIndexer;
    private fileRepo: FileRepository;
    private headingRepo: HeadingRepository;
    private linkRepo: LinkRepository;
    private extractor: UniorgAstExtractor;
    private disposables: vscode.Disposable[] = [];
    private isIndexing = false;

    constructor() {
        const connection = DatabaseConnection.getInstance();
        const db = connection.getDatabase();

        // Initialize all repositories
        this.fileRepo = new FileRepository(db);
        this.headingRepo = new HeadingRepository(db);
        this.linkRepo = new LinkRepository(db);
        this.extractor = new UniorgAstExtractor();

        // Initialize indexers
        this.fileIndexer = new FileIndexer(
            connection,
            this.fileRepo,
            this.headingRepo,
            this.linkRepo,
            this.extractor
        );

        const fileProvider = new VSCodeFileProvider();
        this.workspaceIndexer = new WorkspaceIndexer(this.fileIndexer, fileProvider as any);

        this.watcher = new WorkspaceWatcher();

        // Subscribe to file events
        this.watcher.on('fileEvent', (event: FileEvent) => this.handleFileEvent(event));
    }

    /**
     * Start the service: perform initial indexing and begin watching
     */
    public async start() {
        Logger.info('Starting IncrementalUpdateService...');

        // Initial full indexing
        await this.runFullIndexing();
    }

    /**
     * Perform a full indexing of the workspace
     */
    private async runFullIndexing() {
        if (this.isIndexing) return;
        this.isIndexing = true;

        try {
            Logger.info('Running full workspace indexing...');
            await this.workspaceIndexer.indexWorkspace();
            Logger.info('Full indexing complete.');
        } catch (error) {
            Logger.error('Full indexing failed', error);
        } finally {
            this.isIndexing = false;
        }
    }

    /**
     * Handle incremental file events
     */
    private async handleFileEvent(event: FileEvent) {
        const uriString = event.uri.fsPath;

        try {
            switch (event.type) {
                case FileEventType.Created:
                case FileEventType.Changed:
                    Logger.info(`Updating index for: ${uriString}`);
                    // Use fileIndexer which handles hash check internally
                    const content = await vscode.workspace.fs.readFile(event.uri);
                    await this.fileIndexer.indexFile(uriString, content.toString());
                    break;

                case FileEventType.Deleted:
                    Logger.info(`Removing from index: ${uriString}`);
                    this.fileRepo.delete(uriString);
                    break;
            }
        } catch (error) {
            Logger.error(`Failed to handle file event for ${uriString}`, error);
        }
    }

    /**
     * Dispose of resources
     */
    public dispose() {
        this.watcher.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
