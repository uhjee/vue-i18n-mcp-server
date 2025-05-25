/**
 * 패턴 스캔 엔진 - 2단계 구현
 * Vue/JS/TS 파일에서 한글 텍스트를 자동 추출
 */
import { VueKoreanExtraction, JSKoreanExtraction } from '../types/index.js';
/**
 * 패턴 스캔 엔진 클래스
 */
export declare class PatternScannerService {
    private readonly koreanRegex;
    private readonly excludeRegex;
    /**
     * Vue 파일에서 한글 텍스트 추출
     */
    scanVueFile(filePath: string, content: string): Promise<VueKoreanExtraction[]>;
    /**
     * JS/TS 파일에서 한글 텍스트 추출 (정규식 기반)
     */
    scanJSFile(filePath: string, content: string): JSKoreanExtraction[];
    /**
     * Vue Template에서 한글 추출
     */
    private extractFromTemplate;
    /**
     * Vue Script에서 한글 추출 (정규식 기반)
     */
    private extractFromScript;
    /**
     * 텍스트에서 한글 패턴 추출
     */
    private extractKoreanFromText;
    /**
     * 제외 패턴 검사
     */
    private isExcludedPattern;
    /**
     * 주석 제거
     */
    private removeComments;
    /**
     * 중복 제거
     */
    private deduplicateExtractions;
    private deduplicateJSExtractions;
    private extractTextNodeKorean;
    private extractAttributeKorean;
    private getElementType;
    private getFunctionContext;
    private getVariableContext;
    private getObjectKeyContext;
    private getVueVariableContext;
    private getSimpleVueContext;
    private getSimpleFunctionContext;
    private getSimpleVariableContext;
    private getSimpleObjectKeyContext;
}
//# sourceMappingURL=pattern-scanner.d.ts.map