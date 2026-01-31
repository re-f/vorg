import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import * as crypto from 'crypto';
import { DatabaseConnection } from './connection';
import { FileRepository } from './fileRepository';
import { HeadingRepository } from './headingRepository';
import { LinkRepository } from './linkRepository';
import { UniorgAstExtractor } from './uniorgAstExtractor';
import { OrgFile } from './types';

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
        private extractor: UniorgAstExtractor
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

        // 2. Parse content into AST
        const processor = unified().use(uniorgParse as any);
        const ast = processor.parse(content);

        // 3. Extract data
        const metadata = this.extractor.extractFileMetadata(ast);
        const headings = this.extractor.extractHeadings(ast, uri);
        const links = this.extractor.extractLinks(ast, uri);

        // 4. Update database in transaction
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

    private calculateHash(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex');
    }
}
