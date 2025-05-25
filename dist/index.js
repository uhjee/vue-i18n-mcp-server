#!/usr/bin/env node
/**
 * Vue I18n MCP Server - 진입점
 * GitHub Copilot Agent Mode와 호환되는 MCP 서버
 */
import { VueI18nMCPServer } from './server/mcp-server.js';
/**
 * 메인 실행 함수
 */
async function main() {
    try {
        // MCP 서버 인스턴스 생성 및 시작
        const server = new VueI18nMCPServer();
        // 종료 시그널 처리
        process.on('SIGINT', async () => {
            console.error('\n🛑 종료 신호를 받았습니다...');
            await server.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.error('\n🛑 종료 신호를 받았습니다...');
            await server.stop();
            process.exit(0);
        });
        // 처리되지 않은 예외 처리
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ 처리되지 않은 Promise 거부:', reason);
            console.error('Promise:', promise);
        });
        process.on('uncaughtException', (error) => {
            console.error('❌ 처리되지 않은 예외:', error);
            process.exit(1);
        });
        // 서버 시작
        await server.start();
    }
    catch (error) {
        console.error('❌ MCP 서버 시작 중 오류 발생:', error);
        process.exit(1);
    }
}
// 스크립트 직접 실행 시에만 main 함수 호출 (ES Module 방식)
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('❌ 서버 실행 실패:', error);
        process.exit(1);
    });
}
export { VueI18nMCPServer } from './server/mcp-server.js';
//# sourceMappingURL=index.js.map