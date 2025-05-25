/**
 * 기존 번역 찾기 도구 - RFP 3단계 구현
 * 추출된 한글 텍스트와 기존 ko.js, en.js 파일의 매칭을 찾습니다
 */
import { BaseTool } from './base-tool.js';
import { TranslationMatch } from '../../services/translation-matcher.js';
import { ToolContext } from '../../types/index.js';
interface FindExistingTranslationsInput {
    koreanTexts: string[];
    filePath?: string;
}
interface FindExistingTranslationsResult {
    summary: {
        totalTexts: number;
        foundMatches: number;
        unmatchedTexts: number;
        matchRate: number;
    };
    matches: TranslationMatch[];
    unmatched: string[];
    availableKeys: string[];
    recommendations: string[];
}
/**
 * 기존 번역 찾기 도구
 */
export declare class FindExistingTranslationsTool extends BaseTool {
    readonly name = "find-existing-translations";
    readonly description = "\uCD94\uCD9C\uB41C \uD55C\uAE00 \uD14D\uC2A4\uD2B8\uC640 \uAE30\uC874 \uBC88\uC5ED \uD30C\uC77C(ko.js, en.js)\uC5D0\uC11C \uB9E4\uCE6D\uB418\uB294 \uD0A4\uB97C \uCC3E\uC2B5\uB2C8\uB2E4";
    readonly inputSchema: {
        type: string;
        properties: {
            koreanTexts: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
                example: string[];
            };
            filePath: {
                type: string;
                description: string;
                example: string;
            };
        };
        required: string[];
    };
    private translationMatcher;
    constructor(context: ToolContext);
    /**
     * 도구 실행 로직
     */
    execute(input: FindExistingTranslationsInput): Promise<FindExistingTranslationsResult>;
    /**
     * 추천사항 생성
     */
    private generateRecommendations;
}
export {};
//# sourceMappingURL=find-existing-translations.d.ts.map