/**
 * 한글 대체 처리 도구 - RFP 1단계 메인 도구
 * GitHub Copilot Agent Mode에서 파일 컨텍스트를 받아 한글 텍스트를 처리
 */
import { BaseTool } from './base-tool.js';
import { TranslationMatch } from '../../services/translation-matcher.js';
import { ToolContext, VueKoreanExtraction, JSKoreanExtraction } from '../../types/index.js';
interface ProcessKoreanReplacementInput {
    fileName: string;
    fileContent: string;
    fileType?: 'vue' | 'js' | 'ts';
}
interface ProcessKoreanReplacementResult {
    summary: {
        fileName: string;
        totalKoreanTexts: number;
        processingTime: number;
        fileType: string;
        matchingResults?: {
            foundMatches: number;
            unmatchedTexts: number;
            matchRate: number;
        };
    };
    extractions: {
        vue?: VueKoreanExtraction[];
        js?: JSKoreanExtraction[];
    };
    translationMatches?: TranslationMatch[];
    unmatchedTexts?: string[];
    recommendations: string[];
    nextSteps: string[];
}
/**
 * 한글 대체 처리 메인 도구
 */
export declare class ProcessKoreanReplacementTool extends BaseTool {
    readonly name = "process-korean-replacement";
    readonly description = "Vue/JS/TS \uD30C\uC77C\uC5D0\uC11C \uD55C\uAE00 \uD14D\uC2A4\uD2B8\uB97C \uC790\uB3D9\uC73C\uB85C \uAC10\uC9C0\uD558\uACE0 \uBD84\uC11D\uD558\uC5EC i18n \uD0A4 \uB300\uCCB4 \uC900\uBE44\uB97C \uC218\uD589\uD569\uB2C8\uB2E4";
    readonly inputSchema: {
        type: string;
        properties: {
            fileName: {
                type: string;
                description: string;
                example: string;
            };
            fileContent: {
                type: string;
                description: string;
            };
            fileType: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
    private patternScanner;
    private translationMatcher;
    private i18nConfig;
    constructor(context: ToolContext);
    /**
     * i18n 함수 설정을 가져옵니다
     */
    private getI18nConfig;
    /**
     * 도구 실행 로직
     */
    execute(input: ProcessKoreanReplacementInput): Promise<ProcessKoreanReplacementResult>;
    /**
     * 파일 타입 자동 감지
     */
    private detectFileType;
    /**
     * 파일별 한글 패턴 추출
     */
    private extractKoreanPatterns;
    /**
     * 전체 추출 개수 계산
     */
    private countTotalExtractions;
    /**
     * 모든 한글 텍스트를 배열로 추출
     */
    private extractAllKoreanTexts;
    /**
     * 추천사항 생성
     */
    private generateRecommendations;
    /**
     * 매칭된 키 찾기 헬퍼 메서드
     */
    private findMatchedKey;
    /**
     * 변환 예시를 생성하는 헬퍼 메서드
     */
    private generateConversionExample;
    /**
     * 다음 단계 안내 생성
     */
    private generateNextSteps;
}
export {};
//# sourceMappingURL=process-korean-replacement.d.ts.map