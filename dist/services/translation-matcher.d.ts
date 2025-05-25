/**
 * 번역 매칭 서비스 - RFP 3단계 구현
 * 기존 ko.js, en.js 파일에서 한글 텍스트와 매칭되는 키를 찾습니다
 */
import { MCPServerConfig } from '../types/index.js';
export interface TranslationMatch {
    korean: string;
    english: string;
    keyPath: string;
    confidence: number;
}
/**
 * 번역 매칭 서비스 클래스
 */
export declare class TranslationMatcherService {
    private config;
    private koTranslations;
    private enTranslations;
    private loaded;
    constructor(config: MCPServerConfig);
    /**
     * 언어 파일들을 로드합니다
     */
    loadTranslations(): Promise<void>;
    /**
     * JS 파일 내용을 파싱하여 객체로 변환
     */
    private parseJSFile;
    /**
     * 한글 텍스트와 매칭되는 번역 키를 찾습니다
     */
    findMatches(koreanTexts: string[]): Promise<TranslationMatch[]>;
    /**
     * 공백으로 분리된 단어들을 개별 매칭하여 조합 키 생성
     */
    private findWordCombinationMatch;
    /**
     * 객체에서 값으로 키 경로를 찾습니다
     */
    private findKeyByValue;
    /**
     * 경로로 값을 가져옵니다
     */
    private getValueByPath;
    /**
     * 두 문자열이 매칭되는지 확인
     */
    private isMatch;
    /**
     * 매칭 신뢰도 계산
     */
    private calculateConfidence;
    /**
     * 사용 가능한 모든 번역 키 목록을 반환
     */
    getAvailableKeys(): string[];
    /**
     * 매칭되지 않은 한글 텍스트 목록 반환
     */
    getUnmatchedTexts(koreanTexts: string[]): Promise<string[]>;
}
//# sourceMappingURL=translation-matcher.d.ts.map