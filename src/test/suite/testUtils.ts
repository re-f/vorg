import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { DatabaseConnection } from '../../database/connection';
import { ConfigService } from '../../services/configService';

/**
 * 确保测试环境已准备就绪（数据库和配置已初始化）
 */
export async function ensureTestReady(): Promise<void> {
    // 1. 确保 ConfigService 已初始化
    if (!ConfigService.getInstance()) {
        ConfigService.setInstance(ConfigService.default());
    }

    // 2. 确保数据库已初始化
    const connection = DatabaseConnection.getInstance();
    if (!connection.isReady()) {
        // 如果没准备好，尝试等待扩展初始化完成（最多等待 1 秒）
        let attempts = 0;
        while (!connection.isReady() && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // 如果仍然没准备好，说明可能不是在常规扩展环境中运行，或者初始化太慢
        // 主动为测试环境初始化一个临时数据库
        if (!connection.isReady()) {
            const tempDbPath = path.join(os.tmpdir(), `vorg-test-${Date.now()}.db`);
            try {
                await connection.initialize(tempDbPath);
                console.log(`[TestUtils] Database force-initialized for tests at: ${tempDbPath}`);
            } catch (err) {
                console.error('[TestUtils] Failed to force-initialize database', err);
            }
        }
    }
}
