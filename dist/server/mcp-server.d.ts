/**
 * Vue I18n MCP Server - 메인 서버 클래스
 * GitHub Copilot Agent Mode와 완전 호환되는 MCP 서버
 */
/**
 * Vue I18n 자동화를 위한 MCP 서버
 */
export declare class VueI18nMCPServer {
    private server;
    private config;
    private tools;
    constructor();
    /**
     * 프로젝트 루트 디렉토리를 자동으로 탐지합니다 (동기)
     */
    private findProjectRoot;
    /**
     * 디렉토리가 프로젝트 루트인지 확인
     */
    private isProjectRoot;
    /**
     * Vue 프로젝트인지 확인
     */
    private isVueProject;
    /**
     * 주어진 디렉토리에서 프로젝트들을 찾기
     */
    private findProjectsInDirectory;
    /**
     * 환경변수에서 설정 정보 로드
     */
    private loadConfig;
    /**
     * MCP 도구들 초기화
     */
    private initializeTools;
    /**
     * MCP 요청 핸들러 설정
     */
    private setupHandlers;
    /**
     * 도구 컨텍스트 업데이트 (현재 파일, 워크스페이스 파일 등)
     */
    private updateToolContext;
    /**
     * 도구 실행 결과를 Agent Mode에 적합한 형식으로 포맷팅
     */
    private formatToolResult;
    /**
     * 한글 대체 처리 결과 포맷팅
     */
    private formatProcessResult;
    /**
     * 번역 매칭 결과 포맷팅
     */
    private formatMatchingResult;
    /**
     * MCP 서버 시작
     */
    start(): Promise<void>;
    /**
     * 서버 종료
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=mcp-server.d.ts.map