/**
 * MCP 도구 기본 클래스
 * 모든 도구들이 상속받는 추상 클래스
 */
/**
 * 도구 기본 추상 클래스
 */
export class BaseTool {
    constructor(context) {
        this.context = context;
    }
    /**
     * 도구 설명 반환
     */
    getDescription() {
        return this.description;
    }
    /**
     * 입력 스키마 반환
     */
    getInputSchema() {
        return this.inputSchema;
    }
    /**
     * 컨텍스트 업데이트
     */
    updateContext(context) {
        this.context = context;
    }
    /**
     * 공통 유틸리티: 현재 파일 경로 해결
     */
    resolveFilePath(filePath) {
        if (filePath) {
            // 절대 경로인지 확인
            if (filePath.startsWith('/') || filePath.includes(':')) {
                return filePath;
            }
            // 상대 경로를 절대 경로로 변환
            return `${this.context.projectRoot}/${filePath}`;
        }
        // filePath가 없으면 현재 파일 사용
        if (this.context.currentFile) {
            return this.context.currentFile;
        }
        throw new Error('파일 경로가 지정되지 않았고 현재 파일도 확인할 수 없습니다.');
    }
    /**
     * 공통 유틸리티: 에러 형식화
     */
    formatError(error, context) {
        const message = error instanceof Error ? error.message : String(error);
        return `${context} 중 오류 발생: ${message}`;
    }
    /**
     * 공통 유틸리티: 성공 메시지 형식화
     */
    formatSuccess(message, details) {
        return {
            success: true,
            message,
            timestamp: new Date().toISOString(),
            ...(details && { details })
        };
    }
    /**
     * 공통 유틸리티: 유효성 검사
     */
    validateArgs(args, requiredFields) {
        for (const field of requiredFields) {
            if (!(field in args) || args[field] === undefined || args[field] === null) {
                throw new Error(`필수 인자가 누락되었습니다: ${field}`);
            }
        }
    }
    /**
     * 공통 유틸리티: 안전한 JSON 파싱
     */
    safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        }
        catch {
            return defaultValue;
        }
    }
    /**
     * 공통 유틸리티: 파일 존재 확인
     */
    async fileExists(filePath) {
        try {
            const fs = await import('fs-extra');
            return await fs.pathExists(filePath);
        }
        catch {
            return false;
        }
    }
    /**
     * 공통 유틸리티: 진행률 표시용 로그
     */
    logProgress(step, current, total) {
        const percentage = Math.round((current / total) * 100);
        console.error(`[${this.name}] ${step}: ${current}/${total} (${percentage}%)`);
    }
}
//# sourceMappingURL=base-tool.js.map