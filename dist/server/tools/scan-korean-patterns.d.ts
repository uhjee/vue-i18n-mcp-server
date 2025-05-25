/**
 * 한글 패턴 스캔 도구 (스켈레톤)
 * ![한글]! 패턴을 찾아서 컨텍스트와 함께 추출
 */
import { BaseTool } from './base-tool.js';
export declare class ScanKoreanPatternsTool extends BaseTool {
    readonly name = "scan-korean-patterns";
    readonly description = "\uD604\uC7AC \uB610\uB294 \uC9C0\uC815\uB41C Vue/JS \uD30C\uC77C\uC5D0\uC11C ![\uD55C\uAE00]! \uD328\uD134\uC744 \uC2A4\uCE94\uD558\uACE0 \uCEE8\uD14D\uC2A4\uD2B8 \uC815\uBCF4\uB97C \uC218\uC9D1\uD569\uB2C8\uB2E4";
    readonly inputSchema: {
        type: string;
        properties: {
            filePath: {
                type: string;
                description: string;
            };
            includeContext: {
                type: string;
                default: boolean;
                description: string;
            };
        };
    };
    /**
     * 도구 실행
     */
    execute(args: any): Promise<any>;
    /**
     * 파일에서 한글 패턴 스캔 (스켈레톤 구현)
     */
    private scanFile;
    /**
     * 패턴 분석 및 요약
     */
    private analyzePatterns;
}
//# sourceMappingURL=scan-korean-patterns.d.ts.map