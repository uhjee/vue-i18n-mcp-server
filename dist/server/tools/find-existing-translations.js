/**
 * 기존 번역 찾기 도구 - RFP 3단계 구현
 * 추출된 한글 텍스트와 기존 ko.js, en.js 파일의 매칭을 찾습니다
 */
import { BaseTool } from './base-tool.js';
import { TranslationMatcherService } from '../../services/translation-matcher.js';
/**
 * 기존 번역 찾기 도구
 */
export class FindExistingTranslationsTool extends BaseTool {
    constructor(context) {
        super(context);
        this.name = 'find-existing-translations';
        this.description = '추출된 한글 텍스트와 기존 번역 파일(ko.js, en.js)에서 매칭되는 키를 찾습니다';
        this.inputSchema = {
            type: 'object',
            properties: {
                koreanTexts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '매칭을 찾을 한글 텍스트 배열',
                    example: ['로그인', '사용자 프로필', '저장하기']
                },
                filePath: {
                    type: 'string',
                    description: '분석 중인 파일 경로 (선택사항)',
                    example: 'components/UserProfile.vue'
                }
            },
            required: ['koreanTexts']
        };
        this.translationMatcher = new TranslationMatcherService(context.config);
    }
    /**
     * 도구 실행 로직
     */
    async execute(input) {
        try {
            console.error(`🔍 기존 번역 매칭 시작: ${input.koreanTexts.length}개 텍스트`);
            console.error(`📝 입력 텍스트: ${input.koreanTexts.join(', ')}`);
            // 번역 파일 로드
            console.error(`📁 번역 파일 로드 시작...`);
            await this.translationMatcher.loadTranslations();
            // 사용 가능한 키 확인
            const availableKeys = this.translationMatcher.getAvailableKeys();
            console.error(`🔑 사용 가능한 키: ${availableKeys.length}개`);
            if (availableKeys.length > 0) {
                console.error(`처음 5개 키: ${availableKeys.slice(0, 5).join(', ')}`);
            }
            else {
                console.error(`❌ 사용 가능한 키가 없습니다!`);
            }
            // 매칭 찾기
            console.error(`🔍 매칭 검색 시작...`);
            const matches = await this.translationMatcher.findMatches(input.koreanTexts);
            const unmatched = await this.translationMatcher.getUnmatchedTexts(input.koreanTexts);
            // 매칭률 계산
            const matchRate = input.koreanTexts.length > 0
                ? (matches.length / input.koreanTexts.length) * 100
                : 0;
            // 결과 생성
            const result = {
                summary: {
                    totalTexts: input.koreanTexts.length,
                    foundMatches: matches.length,
                    unmatchedTexts: unmatched.length,
                    matchRate: Math.round(matchRate * 100) / 100
                },
                matches,
                unmatched,
                availableKeys: availableKeys.slice(0, 20), // 처음 20개만 표시
                recommendations: this.generateRecommendations(matches, unmatched, matchRate)
            };
            console.error(`✅ 매칭 완료: ${matches.length}개 발견, ${unmatched.length}개 미매칭`);
            if (matches.length > 0) {
                console.error(`✅ 매칭된 항목들:`);
                matches.forEach(match => {
                    console.error(`  - "${match.korean}" → ${match.keyPath} (${(match.confidence * 100).toFixed(1)}%)`);
                });
            }
            return result;
        }
        catch (error) {
            console.error(`❌ 번역 매칭 중 오류:`, error);
            throw new Error(`기존 번역 매칭 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 추천사항 생성
     */
    generateRecommendations(matches, unmatched, matchRate) {
        const recommendations = [];
        if (matches.length > 0) {
            recommendations.push(`✅ ${matches.length}개 텍스트가 기존 번역과 매칭되었습니다`);
            // 높은 신뢰도 매칭
            const highConfidenceMatches = matches.filter(m => m.confidence >= 0.95);
            if (highConfidenceMatches.length > 0) {
                recommendations.push(`🎯 ${highConfidenceMatches.length}개는 정확한 매칭입니다 (신뢰도 95% 이상)`);
            }
            // 낮은 신뢰도 매칭
            const lowConfidenceMatches = matches.filter(m => m.confidence < 0.8);
            if (lowConfidenceMatches.length > 0) {
                recommendations.push(`⚠️ ${lowConfidenceMatches.length}개는 부분 매칭입니다 (검토 필요)`);
            }
        }
        if (unmatched.length > 0) {
            recommendations.push(`❌ ${unmatched.length}개 텍스트는 기존 번역이 없습니다`);
            if (unmatched.length <= 5) {
                recommendations.push(`새로 추가할 항목: ${unmatched.map(t => `"${t}"`).join(', ')}`);
            }
        }
        // 매칭률에 따른 추천
        if (matchRate >= 80) {
            recommendations.push(`🚀 매칭률이 높습니다(${matchRate}%). 대부분 기존 키를 사용할 수 있습니다`);
        }
        else if (matchRate >= 50) {
            recommendations.push(`📝 매칭률이 보통입니다(${matchRate}%). 일부는 새 번역이 필요합니다`);
        }
        else {
            recommendations.push(`🆕 매칭률이 낮습니다(${matchRate}%). 대부분 새로운 번역 키가 필요합니다`);
        }
        return recommendations;
    }
}
//# sourceMappingURL=find-existing-translations.js.map