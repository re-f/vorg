import * as path from 'path';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
    try {
        // 扩展开发文件夹路径
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // 测试文件夹路径
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // 运行测试
        await runTests({
            version: 'stable',
            extensionDevelopmentPath,
            extensionTestsPath
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main(); 