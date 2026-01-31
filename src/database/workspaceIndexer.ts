import { FileIndexer } from './fileIndexer';

/**
 * Interface for file system operations to allow mocking in tests
 * or different implementations (e.g. VS Code workspace vs Node fs)
 */
export interface FileProvider {
    /**
     * Find files matching a glob pattern
     */
    findFiles(pattern: string): Promise<string[]>; // Returns URIs

    /**
     * Read file content
     */
    readFile(uri: string): Promise<string>;
}

/**
 * WorkspaceIndexer
 * 
 * Responsible for indexing the entire workspace or specific folders.
 * Coordinates finding files and delegating to FileIndexer.
 */
export class WorkspaceIndexer {
    constructor(
        private fileIndexer: FileIndexer,
        private fileProvider: FileProvider
    ) { }

    /**
     * Index all Org files in the workspace
     * @param force Force re-index even if content hasn't changed
     */
    public async indexWorkspace(force: boolean = false): Promise<void> {
        console.log('Starting workspace indexing...');

        // Find all .org files
        // Pattern matches all .org files, ignoring .git/node_modules usually handled by provider
        const uris = await this.fileProvider.findFiles('**/*.org');

        console.log(`Found ${uris.length} files to index.`);

        let indexedCount = 0;
        let errorCount = 0;

        // Process sequentially to avoid overwhelming DB or memory
        // Could be parallelized with concurrency limit if needed
        for (const uri of uris) {
            try {
                const content = await this.fileProvider.readFile(uri);
                await this.fileIndexer.indexFile(uri, content, force);
                indexedCount++;
            } catch (error) {
                console.error(`Failed to index file: ${uri}`, error);
                errorCount++;
            }
        }

        console.log(`Workspace indexing complete. Indexed: ${indexedCount}, Errors: ${errorCount}`);
    }

    /**
     * Index a specific list of files (e.g. from file watcher)
     */
    public async indexFiles(uris: string[]): Promise<void> {
        for (const uri of uris) {
            try {
                const content = await this.fileProvider.readFile(uri);
                await this.fileIndexer.indexFile(uri, content);
            } catch (error) {
                console.error(`Failed to index file: ${uri}`, error);
            }
        }
    }
}
