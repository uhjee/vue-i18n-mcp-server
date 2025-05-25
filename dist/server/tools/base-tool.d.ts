/**
 * MCP 도구 기본 클래스
 * 모든 도구들이 상속받는 추상 클래스
 */
import { ToolContext } from '../../types/index.js';
/**
 * MCP 도구 인터페이스
 */
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
    execute(args: any): Promise<any>;
    getDescription(): string;
    getInputSchema(): any;
    updateContext(context: ToolContext): void;
}
/**
 * 도구 기본 추상 클래스
 */
export declare abstract class BaseTool implements MCPTool {
    protected context: ToolContext;
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly inputSchema: any;
    constructor(context: ToolContext);
    /**
     * 도구 실행 (각 도구에서 구현)
     */
    abstract execute(args: any): Promise<any>;
    /**
     * 도구 설명 반환
     */
    getDescription(): string;
    /**
     * 입력 스키마 반환
     */
    getInputSchema(): any;
    /**
     * 컨텍스트 업데이트
     */
    updateContext(context: ToolContext): void;
    /**
     * 공통 유틸리티: 현재 파일 경로 해결
     */
    protected resolveFilePath(filePath?: string): string;
    /**
     * 공통 유틸리티: 에러 형식화
     */
    protected formatError(error: unknown, context: string): string;
    /**
     * 공통 유틸리티: 성공 메시지 형식화
     */
    protected formatSuccess(message: string, details?: any): any;
    /**
     * 공통 유틸리티: 유효성 검사
     */
    protected validateArgs(args: any, requiredFields: string[]): void;
    /**
     * 공통 유틸리티: 안전한 JSON 파싱
     */
    protected safeJsonParse(jsonString: string, defaultValue?: any): any;
    /**
     * 공통 유틸리티: 파일 존재 확인
     */
    protected fileExists(filePath: string): Promise<boolean>;
    /**
     * 공통 유틸리티: 진행률 표시용 로그
     */
    protected logProgress(step: string, current: number, total: number): void;
}
//# sourceMappingURL=base-tool.d.ts.map