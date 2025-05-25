/**
 * 한글 대체 처리 도구 - RFP 1단계 메인 도구
 * GitHub Copilot Agent Mode에서 파일 컨텍스트를 받아 한글 텍스트를 처리
 */

import { BaseTool } from './base-tool.js';
import { PatternScannerService } from '../../services/pattern-scanner.js';
import { TranslationMatcherService, TranslationMatch } from '../../services/translation-matcher.js';
import { ToolContext, VueKoreanExtraction, JSKoreanExtraction } from '../../types/index.js';
import { DEFAULT_I18N_CONFIG, I18nFunctionConfig, VUE_I18N_CONFIGS } from '../../types/i18n-config.js';

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
      }
    },
    required: ['fileName', 'fileContent']
  };

  private patternScanner: PatternScannerService;
  private translationMatcher: TranslationMatcherService;
  private i18nConfig: I18nFunctionConfig;

  constructor(context: ToolContext) {
    super(context);
    this.patternScanner = new PatternScannerService();
    this.translationMatcher = new TranslationMatcherService(context.config);
    
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

      if (totalKoreanTexts > 0) {
        try {
          console.error('🔍 기존 번역 매칭 시작...');
          const allKoreanTexts = this.extractAllKoreanTexts(extractions);
          
          await this.translationMatcher.loadTranslations();
          translationMatches = await this.translationMatcher.findMatches(allKoreanTexts);
          unmatchedTexts = await this.translationMatcher.getUnmatchedTexts(allKoreanTexts);
          
          const matchRate = allKoreanTexts.length > 0 
            ? (translationMatches.length / allKoreanTexts.length) * 100 
            : 0;

          matchingResults = {
            foundMatches: translationMatches.length,
            unmatchedTexts: unmatchedTexts.length,
            matchRate: Math.round(matchRate * 100) / 100
          };

          console.error(`✅ 번역 매칭 완료: ${translationMatches.length}개 매칭, ${unmatchedTexts.length}개 미매칭`);
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
        },
        extractions,
        translationMatches: translationMatches.length > 0 ? translationMatches : undefined,
        unmatchedTexts: unmatchedTexts.length > 0 ? unmatchedTexts : undefined,
        recommendations: this.generateRecommendations(extractions, fileType, translationMatches, unmatchedTexts),
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
   * 추천사항 생성
   */
  private generateRecommendations(
    extractions: { vue?: VueKoreanExtraction[]; js?: JSKoreanExtraction[] },
    fileType: string,
    translationMatches: TranslationMatch[] = [],
    unmatchedTexts: string[] = []
  ): string[] {
    const recommendations: string[] = [];

    // Vue 파일 추천사항 + 실제 변환 예시
    if (extractions.vue && extractions.vue.length > 0) {
      const templateExtractions = extractions.vue.filter(e => e.location.section === 'template');
      const scriptExtractions = extractions.vue.filter(e => e.location.section === 'script');

      if (templateExtractions.length > 0) {
        recommendations.push(`Template 섹션에서 ${templateExtractions.length}개 한글 텍스트 발견`);
        
        // 실제 변환 예시 추가
        const templateExample = templateExtractions[0];
        const matchedKey = this.findMatchedKey(templateExample.text, translationMatches);
        const exampleKey = matchedKey || 'EXAMPLE.KEY';
        
        const conversionExample = matchedKey 
          ? this.generateConversionExample(templateExample.text, matchedKey, `{{ ${this.i18nConfig.vue.template}`)
          : `"${templateExample.text}" → {{ ${this.i18nConfig.vue.template}('${exampleKey}') }}`;
        
        recommendations.push(`📝 변환 예시: ${conversionExample}`);
        
        if (templateExtractions.length > 1) {
          recommendations.push(`📋 모든 template 한글 텍스트는 {{ ${this.i18nConfig.vue.template}('key') }} 형태로 변환해주세요`);
        }
      }

      if (scriptExtractions.length > 0) {
        recommendations.push(`Script 섹션에서 ${scriptExtractions.length}개 한글 텍스트 발견`);
        
        // 실제 변환 예시 추가
        const scriptExample = scriptExtractions[0];
        const matchedKey = this.findMatchedKey(scriptExample.text, translationMatches);
        const exampleKey = matchedKey || 'EXAMPLE.KEY';
        
        const conversionExample = matchedKey 
          ? this.generateConversionExample(scriptExample.text, matchedKey, this.i18nConfig.vue.script)
          : `"${scriptExample.text}" → ${this.i18nConfig.vue.script}('${exampleKey}')`;
        
        recommendations.push(`📝 변환 예시: ${conversionExample}`);
        
        if (scriptExtractions.length > 1) {
          recommendations.push(`📋 모든 script 한글 텍스트는 ${this.i18nConfig.vue.script}('key') 형태로 변환해주세요`);
        }
      }
    }

    // JS/TS 파일 추천사항 + 실제 변환 예시
    if (extractions.js && extractions.js.length > 0) {
      const stringExtractions = extractions.js.filter(e => e.context.literalType === 'string');
      const templateExtractions = extractions.js.filter(e => e.context.literalType === 'template');

      if (stringExtractions.length > 0) {
        recommendations.push(`문자열 리터럴 ${stringExtractions.length}개 발견`);
        
        // 실제 변환 예시 추가
        const stringExample = stringExtractions[0];
        const matchedKey = this.findMatchedKey(stringExample.text, translationMatches);
        const exampleKey = matchedKey || 'EXAMPLE.KEY';
        
        const conversionExample = matchedKey 
          ? this.generateConversionExample(stringExample.text, matchedKey, this.i18nConfig.javascript.function)
          : `"${stringExample.text}" → ${this.i18nConfig.javascript.function}('${exampleKey}')`;
        
        recommendations.push(`📝 변환 예시: ${conversionExample}`);
        
        if (stringExtractions.length > 1) {
          recommendations.push(`📋 모든 문자열은 ${this.i18nConfig.javascript.function}('key') 형태로 변환해주세요`);
        }
      }

      if (templateExtractions.length > 0) {
        recommendations.push(`템플릿 리터럴 ${templateExtractions.length}개 발견 - 템플릿 내 한글 부분만 선별 대체 예정`);
      }
    }

    // 번역 매칭 결과 추가
    if (translationMatches.length > 0) {
      recommendations.push(`✅ ${translationMatches.length}개 텍스트가 기존 번역과 매칭되었습니다`);
      
      const highConfidenceMatches = translationMatches.filter(m => m.confidence >= 0.95);
      if (highConfidenceMatches.length > 0) {
        recommendations.push(`🎯 ${highConfidenceMatches.length}개는 정확한 매칭 - 바로 대체 가능`);
        
        // 매칭된 실제 예시 추가
        const perfectMatch = highConfidenceMatches[0];
        recommendations.push(`💡 매칭 예시: "${perfectMatch.korean}" → "${perfectMatch.keyPath}"`);
      }
    }

    if (unmatchedTexts.length > 0) {
      recommendations.push(`❌ ${unmatchedTexts.length}개 텍스트는 새로운 번역이 필요합니다`);
    }

    // 중요한 함수 설정 안내 추가
    recommendations.push(`⚙️ 현재 i18n 함수 설정: Template(${this.i18nConfig.vue.template}), Script(${this.i18nConfig.vue.script}), JS(${this.i18nConfig.javascript.function})`);

    // 일반적인 추천사항
    if (extractions.vue?.length === 0 && extractions.js?.length === 0) {
      recommendations.push('한글 텍스트가 발견되지 않았습니다. 파일이 이미 국제화되어 있거나 한글이 없는 파일입니다.');
    }

    return recommendations;
  }

  /**
   * 매칭된 키 찾기 헬퍼 메서드
   */
  private findMatchedKey(koreanText: string, translationMatches: TranslationMatch[]): string | null {
    const match = translationMatches.find(m => m.korean === koreanText);
    if (!match) return null;
    
    // 배열 형태의 키인지 확인
    if (match.keyPath.startsWith('[') && match.keyPath.endsWith(']')) {
      // 배열 형태 키를 올바른 함수 호출 형태로 변환
      const keyArray = match.keyPath.slice(1, -1); // [ ] 제거
      return keyArray; // 배열 내용 그대로 반환
    }
    
    return match.keyPath;
  }

  /**
   * 변환 예시를 생성하는 헬퍼 메서드
   */
  private generateConversionExample(text: string, keyPath: string, functionName: string): string {
    // Vue template 함수인지 확인 ({{ 로 시작하는 경우)
    const isTemplate = functionName.startsWith('{{');
    
    // 배열 형태 키인지 확인
    if (keyPath.includes(',')) {
      // 여러 키가 있는 경우 배열 형태로 변환
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