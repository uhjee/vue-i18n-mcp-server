/**
 * 한글 대체 처리 도구 - RFP 1단계 메인 도구
 * GitHub Copilot Agent Mode에서 파일 컨텍스트를 받아 한글 텍스트를 처리
 */

import { BaseTool } from './base-tool.js';
import { PatternScannerService } from '../../services/pattern-scanner.js';
import { TranslationMatcherService, TranslationMatch } from '../../services/translation-matcher.js';
import { MixedLanguageProcessor, MixedLanguageConversion } from '../../services/mixed-language-processor.js';
import { ToolContext, VueKoreanExtraction, JSKoreanExtraction } from '../../types/index.js';
import { DEFAULT_I18N_CONFIG, I18nFunctionConfig, VUE_I18N_CONFIGS } from '../../types/i18n-config.js';

interface ProcessKoreanReplacementInput {
  fileName: string;
  fileContent: string;
  fileType?: 'vue' | 'js' | 'ts';
  forceWordDecomposition?: boolean;
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
    mixedLanguageResults?: {
      totalMixed: number;
      pureKorean: number;
      pureEnglish: number;
      averageConfidence: number;
    };
  };
  extractions: {
    vue?: VueKoreanExtraction[];
    js?: JSKoreanExtraction[];
  };
  translationMatches?: TranslationMatch[];
  unmatchedTexts?: string[];
  mixedLanguageConversions?: MixedLanguageConversion[];
  recommendations: string[];
  nextSteps: string[];
}

/**
 * 한글 대체 처리 메인 도구
 */
export class ProcessKoreanReplacementTool extends BaseTool {
  readonly name = 'process-korean-replacement';
  readonly description = 'Vue/JS/TS 파일에서 한글 텍스트를 자동으로 감지하고 분석하여 i18n 키 대체 준비를 수행합니다';
  readonly inputSchema = {
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        description: '처리할 파일명 (확장자 포함)',
        example: 'UserProfile.vue'
      },
      fileContent: {
        type: 'string',
        description: '파일의 전체 내용',
      },
      fileType: {
        type: 'string',
        enum: ['vue', 'js', 'ts'],
        description: '파일 타입 (자동 감지되지만 명시적 지정 가능)',
      },
      forceWordDecomposition: {
        type: 'boolean',
        description: '강제 개별 단어 분해 옵션',
      }
    },
    required: ['fileName', 'fileContent']
  };

  private patternScanner: PatternScannerService;
  private translationMatcher: TranslationMatcherService;
  private mixedLanguageProcessor: MixedLanguageProcessor;
  private i18nConfig: I18nFunctionConfig;

  constructor(context: ToolContext) {
    super(context);
    this.patternScanner = new PatternScannerService();
    this.translationMatcher = new TranslationMatcherService(context.config);
    this.mixedLanguageProcessor = new MixedLanguageProcessor(this.translationMatcher);
    
    // i18n 함수 설정 (환경변수로 변경 가능)
    this.i18nConfig = this.getI18nConfig();
  }

  /**
   * i18n 함수 설정을 가져옵니다
   */
  private getI18nConfig(): I18nFunctionConfig {
    const configType = process.env.I18N_FUNCTION_TYPE || 'DEFAULT';
    
    switch (configType) {
      case 'VUE_I18N_WATCHALL':
        return VUE_I18N_CONFIGS.VUE_I18N_WATCHALL;
      case 'VUE_I18N_COMPOSABLE':
        return VUE_I18N_CONFIGS.VUE_I18N_COMPOSABLE;
      case 'CUSTOM':
        // CUSTOM의 경우 환경변수로 오버라이드 가능
        return {
          vue: {
            template: process.env.I18N_VUE_TEMPLATE || VUE_I18N_CONFIGS.CUSTOM.vue.template,
            script: process.env.I18N_VUE_SCRIPT || VUE_I18N_CONFIGS.CUSTOM.vue.script
          },
          javascript: {
            function: process.env.I18N_JS_FUNCTION || VUE_I18N_CONFIGS.CUSTOM.javascript.function
          }
        };
      default:
        return DEFAULT_I18N_CONFIG;
    }
  }

  /**
   * 도구 실행 로직
   */
  async execute(input: ProcessKoreanReplacementInput): Promise<ProcessKoreanReplacementResult> {
    const startTime = Date.now();
    
    try {
      // 파일 타입 자동 감지
      const fileType = this.detectFileType(input.fileName, input.fileType);
      
      // 한글 패턴 추출
      const extractions = await this.extractKoreanPatterns(
        input.fileName,
        input.fileContent,
        fileType
      );

      // 총 추출된 한글 텍스트 수 계산
      const totalKoreanTexts = this.countTotalExtractions(extractions);

      // 처리 시간 계산
      const processingTime = Date.now() - startTime;

      // 기존 번역 매칭 수행
      let translationMatches: TranslationMatch[] = [];
      let unmatchedTexts: string[] = [];
      let matchingResults;

      // 한영 혼용 처리 수행
      let mixedLanguageConversions: MixedLanguageConversion[] = [];
      let mixedLanguageResults;

      if (totalKoreanTexts > 0) {
        try {
          const allKoreanTexts = this.extractAllKoreanTexts(extractions);
          
          // 강제 개별 단어 분해 옵션에 따라 처리 순서 변경
          if (input.forceWordDecomposition) {
            console.error('🔍 강제 개별 단어 분해 모드 - 개별 단어 분해 우선 실행...');
            
            // 개별 단어 분해를 먼저 수행
            mixedLanguageConversions = await this.mixedLanguageProcessor.convertMultipleTexts(allKoreanTexts, true);
            
            const summary = this.mixedLanguageProcessor.summarizeConversions(mixedLanguageConversions);
            mixedLanguageResults = {
              totalMixed: summary.mixed,
              pureKorean: summary.pureKorean,
              pureEnglish: summary.pureEnglish,
              averageConfidence: summary.averageConfidence
            };
            
            console.error(`✅ 개별 단어 분해 완료: ${summary.mixed}개 혼용, ${summary.pureKorean}개 순수 한글, 평균 신뢰도 ${summary.averageConfidence}%`);
            
            // 기존 번역 매칭은 참고용으로만 수행
            console.error('🔍 기존 번역 매칭 (참고용)...');
            await this.translationMatcher.loadTranslations();
            translationMatches = await this.translationMatcher.findMatches(allKoreanTexts);
            unmatchedTexts = await this.translationMatcher.getUnmatchedTexts(allKoreanTexts);
            
          } else {
            console.error('🔍 기존 번역 매칭 시작...');
            await this.translationMatcher.loadTranslations();
            translationMatches = await this.translationMatcher.findMatches(allKoreanTexts);
            unmatchedTexts = await this.translationMatcher.getUnmatchedTexts(allKoreanTexts);
            
            console.error(`✅ 번역 매칭 완료: ${translationMatches.length}개 매칭, ${unmatchedTexts.length}개 미매칭`);

            // 한영 혼용 처리 - 🎯 문장이 아닌 경우 자동으로 개별 단어 분해
            console.error('🔍 한영 혼용 문자열 처리 시작...');
            mixedLanguageConversions = await this.mixedLanguageProcessor.convertMultipleTexts(allKoreanTexts, false);
            
            const summary = this.mixedLanguageProcessor.summarizeConversions(mixedLanguageConversions);
            mixedLanguageResults = {
              totalMixed: summary.mixed,
              pureKorean: summary.pureKorean,
              pureEnglish: summary.pureEnglish,
              averageConfidence: summary.averageConfidence
            };

            console.error(`✅ 한영 혼용 처리 완료: ${summary.mixed}개 혼용, ${summary.pureKorean}개 순수 한글, 평균 신뢰도 ${summary.averageConfidence}%`);
          }
          
          const matchRate = allKoreanTexts.length > 0 
            ? (translationMatches.length / allKoreanTexts.length) * 100 
            : 0;

          matchingResults = {
            foundMatches: translationMatches.length,
            unmatchedTexts: unmatchedTexts.length,
            matchRate: Math.round(matchRate * 100) / 100
          };
          
        } catch (error) {
          console.error('⚠️ 번역 매칭 중 오류:', error);
        }
      }

      // 결과 생성
      const result: ProcessKoreanReplacementResult = {
        summary: {
          fileName: input.fileName,
          totalKoreanTexts,
          processingTime,
          fileType,
          matchingResults,
          mixedLanguageResults,
        },
        extractions,
        translationMatches: translationMatches.length > 0 ? translationMatches : undefined,
        unmatchedTexts: unmatchedTexts.length > 0 ? unmatchedTexts : undefined,
        mixedLanguageConversions: mixedLanguageConversions.length > 0 ? mixedLanguageConversions : undefined,
        recommendations: this.generateRecommendations(extractions, fileType, translationMatches, unmatchedTexts, mixedLanguageConversions, input.forceWordDecomposition),
        nextSteps: this.generateNextSteps(totalKoreanTexts, translationMatches.length),
      };

      return result;

    } catch (error) {
      throw new Error(`한글 패턴 처리 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 파일 타입 자동 감지
   */
  private detectFileType(fileName: string, explicitType?: string): string {
    if (explicitType) {
      return explicitType;
    }

    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'vue':
        return 'vue';
      case 'ts':
        return 'ts';
      case 'js':
        return 'js';
      default:
        // 파일 내용으로 추가 판단 가능
        return 'js';
    }
  }

  /**
   * 파일별 한글 패턴 추출
   */
  private async extractKoreanPatterns(
    fileName: string,
    content: string,
    fileType: string
  ): Promise<{ vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] }> {
    const extractions: { vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] } = {};

    switch (fileType) {
      case 'vue':
        extractions.vue = await this.patternScanner.scanVueFile(fileName, content);
        break;
      case 'js':
      case 'ts':
        extractions.js = await this.patternScanner.scanJSFile(fileName, content);
        break;
    }

    return extractions;
  }

  /**
   * 전체 추출 개수 계산
   */
  private countTotalExtractions(extractions: { vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] }): number {
    let total = 0;
    if (extractions.vue) total += extractions.vue.length;
    if (extractions.js) total += extractions.js.length;
    return total;
  }

  /**
   * 모든 한글 텍스트를 배열로 추출
   */
  private extractAllKoreanTexts(extractions: { vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] }): string[] {
    const texts: string[] = [];
    
    if (extractions.vue) {
      texts.push(...extractions.vue.map(e => e.text));
    }
    
    if (extractions.js) {
      texts.push(...extractions.js.map(e => e.text));
    }
    
    // 중복 제거
    return [...new Set(texts)];
  }

  /**
   * 추천사항 생성 (개선된 버전 - 매칭/미매칭 단어 명확히 구분)
   */
  private generateRecommendations(
    extractions: { vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] },
    fileType: string,
    translationMatches: TranslationMatch[] = [],
    unmatchedTexts: string[] = [],
    mixedLanguageConversions: MixedLanguageConversion[] = [],
    forceWordDecomposition: boolean = false
  ): string[] {
    const recommendations: string[] = [];

    // 전체 한글 텍스트 추출
    const allKoreanTexts = this.extractAllKoreanTexts(extractions);
    
    if (allKoreanTexts.length === 0) {
      recommendations.push('✅ 한글 텍스트가 발견되지 않았습니다. 파일이 이미 국제화되어 있거나 한글이 없는 파일입니다.');
      return recommendations;
    }

    // === 📊 전체 분석 결과 요약 ===
    recommendations.push(`📊 **분석 결과 요약**`);
    recommendations.push(`- 발견된 한글 텍스트: ${allKoreanTexts.length}개`);
    
    if (forceWordDecomposition) {
      recommendations.push(`- 🎯 **강제 개별 단어 분해 모드 활성화**`);
      recommendations.push(`- 개별 단어 분해 우선 처리: ${mixedLanguageConversions.length}개`);
      recommendations.push(`- 기존 번역 매칭 (참고용): ${translationMatches.length}개`);
    } else {
      recommendations.push(`- 기존 번역과 매칭: ${translationMatches.length}개 (${Math.round((translationMatches.length / allKoreanTexts.length) * 100)}%)`);
      recommendations.push(`- 새로운 번역 필요: ${unmatchedTexts.length}개`);
    }
    
    // 한영 혼용 결과 추가
    if (mixedLanguageConversions.length > 0) {
      const summary = this.mixedLanguageProcessor.summarizeConversions(mixedLanguageConversions);
      recommendations.push(`- 한영 혼용 문자열: ${summary.mixed}개`);
      recommendations.push(`- 순수 한글: ${summary.pureKorean}개`);
      recommendations.push(`- 평균 변환 신뢰도: ${summary.averageConfidence}%`);
    }
    recommendations.push('');

    // 강제 개별 단어 분해 모드에서는 순서를 바꿔서 개별 분해 결과를 먼저 표시
    if (forceWordDecomposition && mixedLanguageConversions.length > 0) {
      // === 🎯 개별 단어 분해 결과 (우선 표시) ===
      recommendations.push(`🎯 **개별 단어 분해 결과** (우선 모드)`);
      recommendations.push(`모든 한글 텍스트를 개별 단어로 분해하여 처리합니다:`);
      recommendations.push('');
      
      // 신뢰도별로 분류
      const highConfidence = mixedLanguageConversions.filter(c => c.confidence >= 70);
      const mediumConfidence = mixedLanguageConversions.filter(c => c.confidence >= 40 && c.confidence < 70);
      const lowConfidence = mixedLanguageConversions.filter(c => c.confidence < 40);

      if (highConfidence.length > 0) {
        recommendations.push(`✅ **높은 신뢰도 (${highConfidence.length}개)** - 바로 적용 권장:`);
        highConfidence.slice(0, 5).forEach((conv, index) => {
          recommendations.push(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
        });
        if (highConfidence.length > 5) {
          recommendations.push(`   ... 외 ${highConfidence.length - 5}개 더`);
        }
        recommendations.push('');
      }

      if (mediumConfidence.length > 0) {
        recommendations.push(`⚠️ **중간 신뢰도 (${mediumConfidence.length}개)** - 검토 후 적용:`);
        mediumConfidence.slice(0, 5).forEach((conv, index) => {
          recommendations.push(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
        });
        if (mediumConfidence.length > 5) {
          recommendations.push(`   ... 외 ${mediumConfidence.length - 5}개 더`);
        }
        recommendations.push('');
      }

      if (lowConfidence.length > 0) {
        recommendations.push(`🔍 **낮은 신뢰도 (${lowConfidence.length}개)** - 수동 처리 또는 전체 키 매칭 고려:`);
        lowConfidence.slice(0, 5).forEach((conv, index) => {
          recommendations.push(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
        });
        if (lowConfidence.length > 5) {
          recommendations.push(`   ... 외 ${lowConfidence.length - 5}개 더`);
        }
        recommendations.push('');
      }

      // 기존 번역 매칭은 참고용으로 표시
      if (translationMatches.length > 0) {
        recommendations.push(`📋 **기존 번역 매칭 (참고용)**`);
        recommendations.push(`다음은 기존 번역 파일에서 전체 매칭된 결과입니다:`);
        recommendations.push('');
        
        translationMatches.slice(0, 5).forEach((match, index) => {
          recommendations.push(`${index + 1}. "${match.korean}" → ${match.keyPath} (${match.confidence}%)`);
        });
        if (translationMatches.length > 5) {
          recommendations.push(`   ... 외 ${translationMatches.length - 5}개 더`);
        }
        recommendations.push('');
        recommendations.push(`💡 **개별 분해 vs 전체 매칭 비교**: 개별 단어 분해가 더 유연하고 재사용 가능합니다.`);
        recommendations.push('');
      }
    } else {
      // 기존 로직 유지 (한영 혼용 결과 먼저, 그 다음 매칭 결과)

      // === 🌐 한영 혼용 문자열 처리 결과 ===
      if (mixedLanguageConversions.length > 0) {
        const mixedTexts = mixedLanguageConversions.filter(c => c.analysis.isMixed);
        
        if (mixedTexts.length > 0) {
          recommendations.push(`🌐 **한영 혼용 문자열 처리 (${mixedTexts.length}개)**`);
          recommendations.push(`한글과 영어가 섞인 문자열들을 자동으로 분리하여 처리합니다:`);
          recommendations.push('');
          
          // 신뢰도별로 분류
          const highConfidence = mixedTexts.filter(c => c.confidence >= 70);
          const mediumConfidence = mixedTexts.filter(c => c.confidence >= 40 && c.confidence < 70);
          const lowConfidence = mixedTexts.filter(c => c.confidence < 40);

          if (highConfidence.length > 0) {
            recommendations.push(`✅ **높은 신뢰도 (${highConfidence.length}개)** - 바로 적용 가능:`);
            highConfidence.slice(0, 3).forEach((conv, index) => {
              recommendations.push(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
            });
            if (highConfidence.length > 3) {
              recommendations.push(`   ... 외 ${highConfidence.length - 3}개 더`);
            }
            recommendations.push('');
          }

          if (mediumConfidence.length > 0) {
            recommendations.push(`⚠️ **중간 신뢰도 (${mediumConfidence.length}개)** - 검토 후 적용:`);
            mediumConfidence.slice(0, 3).forEach((conv, index) => {
              recommendations.push(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
            });
            if (mediumConfidence.length > 3) {
              recommendations.push(`   ... 외 ${mediumConfidence.length - 3}개 더`);
            }
            recommendations.push('');
          }

          if (lowConfidence.length > 0) {
            recommendations.push(`🔍 **낮은 신뢰도 (${lowConfidence.length}개)** - 수동 처리 권장:`);
            lowConfidence.slice(0, 3).forEach((conv, index) => {
              recommendations.push(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
            });
            if (lowConfidence.length > 3) {
              recommendations.push(`   ... 외 ${lowConfidence.length - 3}개 더`);
            }
            recommendations.push('');
          }

          // 한영 혼용 변환 예시
          const bestMixed = highConfidence[0] || mediumConfidence[0] || lowConfidence[0];
          if (bestMixed) {
            recommendations.push(`📝 **한영 혼용 변환 예시**:`);
            recommendations.push(`원본: "${bestMixed.originalText}"`);
            recommendations.push(`분석: ${bestMixed.analysis.segments.map(s => `[${s.type}] "${s.text}"`).join(' + ')}`);
            recommendations.push(`변환: ${bestMixed.finalConversion}`);
            recommendations.push('');
          }
        }
      }

      // === ✅ 매칭된 번역 (대체 가능한 단어들) ===
      if (translationMatches.length > 0) {
        recommendations.push(`✅ **매칭된 번역 (${translationMatches.length}개)**`);
        
        // 신뢰도별로 분류
        const perfectMatches = translationMatches.filter(m => m.confidence >= 0.95);
        const goodMatches = translationMatches.filter(m => m.confidence >= 0.8 && m.confidence < 0.95);
        const partialMatches = translationMatches.filter(m => m.confidence < 0.8);

        // 완전 매칭 (신뢰도 95% 이상)
        if (perfectMatches.length > 0) {
          recommendations.push(`🎯 **완전 매칭 (${perfectMatches.length}개)** - 바로 대체 가능:`);
          perfectMatches.slice(0, 5).forEach((match, index) => {
            recommendations.push(`${index + 1}. "${match.korean}" → ${match.keyPath}`);
          });
          if (perfectMatches.length > 5) {
            recommendations.push(`   ... 외 ${perfectMatches.length - 5}개 더`);
          }
          recommendations.push('');
        }

        // 조합 매칭 (신뢰도 80-94%)
        if (goodMatches.length > 0) {
          recommendations.push(`🔗 **조합 매칭 (${goodMatches.length}개)** - 단어 조합으로 매칭:`);
          goodMatches.slice(0, 3).forEach((match, index) => {
            recommendations.push(`${index + 1}. "${match.korean}" → ${match.keyPath}`);
          });
          if (goodMatches.length > 3) {
            recommendations.push(`   ... 외 ${goodMatches.length - 3}개 더`);
          }
          recommendations.push('');
        }

        // 부분 매칭 (신뢰도 80% 미만)
        if (partialMatches.length > 0) {
          recommendations.push(`⚡ **부분 매칭 (${partialMatches.length}개)** - 일부 단어만 매칭:`);
          partialMatches.slice(0, 3).forEach((match, index) => {
            recommendations.push(`${index + 1}. "${match.korean}" → ${match.keyPath}`);
          });
          if (partialMatches.length > 3) {
            recommendations.push(`   ... 외 ${partialMatches.length - 3}개 더`);
          }
          recommendations.push('');
        }

        // 변환 예시 제공
        const bestMatch = perfectMatches[0] || goodMatches[0] || partialMatches[0];
        if (bestMatch) {
          const sectionType = this.getTextSectionType(bestMatch.korean, extractions);
          const functionName = this.getFunctionNameForSection(sectionType);
          const conversionExample = this.generateConversionExample(bestMatch.korean, bestMatch.keyPath, functionName);
          recommendations.push(`📝 **변환 예시**: ${conversionExample}`);
          recommendations.push('');
        }
      }
    }

    // === ❌ 매칭되지 않은 텍스트 (새로운 번역 필요) ===
    if (unmatchedTexts.length > 0) {
      recommendations.push(`❌ **새로운 번역이 필요한 텍스트 (${unmatchedTexts.length}개)**`);
      recommendations.push(`다음 한글 텍스트들은 기존 번역 파일에 없어서 새로 추가해야 합니다:`);
      recommendations.push('');
      
      unmatchedTexts.forEach((text, index) => {
        const sectionInfo = this.getTextLocationInfo(text, extractions);
        recommendations.push(`${index + 1}. "${text}" ${sectionInfo}`);
      });
      recommendations.push('');
      
      recommendations.push(`💡 **추천 작업 순서**:`);
      recommendations.push(`1. 위 ${unmatchedTexts.length}개 텍스트를 ko.js, en.js에 추가`);
      recommendations.push(`2. 매칭된 ${translationMatches.length}개 텍스트를 i18n 함수로 대체`);
      recommendations.push(`3. 전체 파일 재검토 및 테스트`);
      recommendations.push('');
    }

    // === ⚙️ 기술 정보 ===
    recommendations.push(`⚙️ **현재 i18n 설정**`);
    recommendations.push(`- Template: {{ ${this.i18nConfig.vue.template}('key') }}`);
    recommendations.push(`- Script: ${this.i18nConfig.vue.script}('key')`);
    recommendations.push(`- JavaScript: ${this.i18nConfig.javascript.function}('key')`);

    return recommendations;
  }

  /**
   * 텍스트가 어느 섹션에 있는지 확인
   */
  private getTextSectionType(text: string, extractions: { vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] }): 'template' | 'script' | 'javascript' {
    if (extractions.vue) {
      const vueMatch = extractions.vue.find(e => e.text === text);
      if (vueMatch) {
        return vueMatch.location.section === 'template' ? 'template' : 'script';
      }
    }
    return 'javascript';
  }

  /**
   * 섹션 타입에 따른 함수명 반환
   */
  private getFunctionNameForSection(sectionType: 'template' | 'script' | 'javascript'): string {
    switch (sectionType) {
      case 'template':
        return `{{ ${this.i18nConfig.vue.template}`;
      case 'script':
        return this.i18nConfig.vue.script;
      case 'javascript':
        return this.i18nConfig.javascript.function;
    }
  }

  /**
   * 텍스트의 위치 정보 반환
   */
  private getTextLocationInfo(text: string, extractions: { vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] }): string {
    if (extractions.vue) {
      const vueMatch = extractions.vue.find(e => e.text === text);
      if (vueMatch) {
        return `(${vueMatch.location.section} 섹션, 라인 ${vueMatch.location.line})`;
      }
    }
    
    if (extractions.js) {
      const jsMatch = extractions.js.find(e => e.text === text);
      if (jsMatch) {
        return `(라인 ${jsMatch.location.line}, ${jsMatch.context.literalType})`;
      }
    }
    
    return '';
  }

  /**
   * 변환 예시를 생성하는 헬퍼 메서드
   */
  private generateConversionExample(text: string, keyPath: string, functionName: string): string {
    // Vue template 함수인지 확인 ({{ 로 시작하는 경우)
    const isTemplate = functionName.startsWith('{{');
    
    // 배열 형태 키인지 확인 ([로 시작하고 ]로 끝나는 경우)
    if (keyPath.startsWith('[') && keyPath.endsWith(']')) {
      // 배열 내용 추출 및 개별 키를 따옴표로 감싸기
      const arrayContent = keyPath.slice(1, -1); // [ ] 제거
      const keys = arrayContent.split(', ').map(key => key.trim());
      const quotedKeys = keys.map(key => `'${key}'`).join(', ');
      
      if (isTemplate) {
        const cleanFunctionName = functionName.replace('{{ ', '');
        return `"${text}" → {{ ${cleanFunctionName}([${quotedKeys}]) }}`;
      } else {
        return `"${text}" → ${functionName}([${quotedKeys}])`;
      }
    } else if (keyPath.includes(',')) {
      // 쉼표가 있지만 대괄호가 없는 경우 (기존 로직 유지)
      if (isTemplate) {
        const cleanFunctionName = functionName.replace('{{ ', '');
        return `"${text}" → {{ ${cleanFunctionName}([${keyPath}]) }}`;
      } else {
        return `"${text}" → ${functionName}([${keyPath}])`;
      }
    } else {
      // 단일 키인 경우 일반 형태로 변환
      if (isTemplate) {
        const cleanFunctionName = functionName.replace('{{ ', '');
        return `"${text}" → {{ ${cleanFunctionName}('${keyPath}') }}`;
      } else {
        return `"${text}" → ${functionName}('${keyPath}')`;
      }
    }
  }

  /**
   * 다음 단계 안내 생성
   */
  private generateNextSteps(totalKoreanTexts: number, matchedCount: number = 0): string[] {
    const nextSteps: string[] = [];

    if (totalKoreanTexts === 0) {
      nextSteps.push('✅ 이 파일은 한글 텍스트가 없어서 추가 처리가 필요하지 않습니다');
      return nextSteps;
    }

    nextSteps.push('🔍 **3단계**: 기존 번역 파일 분석을 통해 매칭 가능한 키 찾기');
    nextSteps.push('🔄 **4단계**: 매칭된 키로 한글 텍스트 자동 대체');
    nextSteps.push('📋 **리포트**: 대체되지 않은 한글 텍스트 목록 확인');
    
    if (totalKoreanTexts > 10) {
      nextSteps.push('⚡ 팁: 한글 텍스트가 많으므로 배치 처리를 고려해보세요');
    }

    return nextSteps;
  }
} 