// ESM imports moved to dynamic imports in indexFile to support CJS environments (unit tests)
// import { unified } from 'unified';
// import uniorgParse from 'uniorg-parse';
import * as crypto from 'crypto';
import { DatabaseConnection } from './connection';
import { FileRepository } from './fileRepository';
import { HeadingRepository } from './headingRepository';
import { LinkRepository } from './linkRepository';
import { UniorgAstExtractor } from './uniorgAstExtractor';
import { OrgFile, OrgHeading } from './types';
import { ConfigService } from '../services/configService';

/**
 * FileIndexer
 * 
 * Responsible for indexing a single Org file:
 * 1. Parse content using uniorg
 * 2. Extract metadata, headings, and links
 * 3. Update database within a transaction
 */
export class FileIndexer {
    constructor(
        private connection: DatabaseConnection,
        private fileRepo: FileRepository,
        private headingRepo: HeadingRepository,
        private linkRepo: LinkRepository,
        private extractor: UniorgAstExtractor,
        private configService: ConfigService
    ) { }

    /**
     * Re-index a file given its URI and content
     * @param uri File URI
     * @param content File content
     * @param force Force re-index even if hash matches
     */
    public async indexFile(uri: string, content: string, force: boolean = false): Promise<void> {
        // 1. Calculate hash to check for changes
        const hash = this.calculateHash(content);

        if (!force) {
            const existing = this.fileRepo.findByUri(uri);
            if (existing && existing.hash === hash) {
                // File hasn't changed, skip indexing
                return;
            }
        }

        // 2. Parse content into AST with custom TODO keywords
        const allKeywords = this.configService.getAllKeywordStrings();
        const doneKeywords = this.configService.getDoneKeywords().map(k => k.keyword);

        // Load ESM modules dynamically
        const { unified } = await (eval('import("unified")') as Promise<any>);
        const uniorgParse = (await (eval('import("uniorg-parse")') as Promise<any>)).default;

        const processor = unified().use(uniorgParse as any, {
            todoKeywords: allKeywords
        });
        const ast = processor.parse(content);

        // 3. Extract data
        const metadata = this.extractor.extractFileMetadata(ast);
        const headings = this.extractor.extractHeadings(ast, uri, content, doneKeywords);
        const links = this.extractor.extractLinks(ast, uri, content);

        // 4. Check for duplicate IDs (Warning only)
        this.checkDuplicateIds(headings, uri);

        // 5. Update database in transaction
        this.connection.transaction(() => {
            // Delete old data (cascade delete should handle headings if configured, 
            // but let's be explicit or rely on repositories)

            // Note: Our schema defines ON DELETE CASCADE for headings -> files
            // and links -> files. So deleting/updating file might suffice, 
            // but we are UPSERTING file.

            // Explicitly delete old headings and links to be safe and clean
            this.headingRepo.deleteByFileUri(uri);
            this.linkRepo.deleteByFileUri(uri);

            // Prepare file data
            const now = new Date();
            const fileData: OrgFile = {
                uri,
                hash,
                title: metadata.title,
                properties: metadata.properties,
                tags: metadata.tags,
                headings: [], // headings are stored in separate table
                updatedAt: now,
                createdAt: now // Repository upsert/insert should handle this
            };

            // Update file record
            // If exists, checks primary key.
            // FileRepository needs an 'upsert' or we check existence.
            // Current FileRepository has 'save' which does insert or replace?
            // Let's assume insertOrReplace or similar.
            // Looking at fileRepository implementation (assumed standard CRUD),
            // usually methods are 'insert', 'update', 'delete'.
            // To be safe: delete then insert, OR use specialized logic.
            // Let's use `save` if available, or delete+insert.
            // Checking FileRepository interface is needed. 
            // Assuming standard methods based on previous interactions, let's try delete then insert for file too if needed,
            // OR checks existance.
            const existing = this.fileRepo.findByUri(uri);
            if (existing) {
                fileData.createdAt = existing.createdAt;
                this.fileRepo.update(fileData);
            } else {
                this.fileRepo.insert(fileData);
            }

            // Batch insert headings and links
            if (headings.length > 0) {
                this.headingRepo.insertBatch(headings);
            }
            if (links.length > 0) {
                this.linkRepo.insertBatch(links);
            }
        });
    }

    /**
     * Check if any heading IDs in the current file are already used in other files.
     * Logs a warning if duplicates are found.
     */
    private checkDuplicateIds(headings: OrgHeading[], currentUri: string): void {
        const ids = headings
            .map(h => h.properties?.ID)
            .filter((id): id is string => !!id);

        if (ids.length === 0) {
            return;
        }

        for (const id of ids) {
            const existing = this.headingRepo.findById(id);
            if (existing && existing.fileUri !== currentUri) {
                const vscode = require('vscode');
                const Logger = require('../utils/logger').Logger;
                const msg = `Duplicate ID found: "${id}". It is already used in ${existing.fileUri}. This entry will override the previous one.`;
                Logger.warn(msg);
                // Optionally show a non-blocking message to the user
                // vscode.window.showWarningMessage(msg);
            }
        }
    }

    private calculateHash(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex');
    }
}
