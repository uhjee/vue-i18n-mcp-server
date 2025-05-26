/**
 * AI 번역 응답 처리 도구
 * AI 에이전트가 제공한 번역 데이터를 검증하고 파일에 적용
 */

import { BaseTool } from './base-tool.js';
import { ToolContext } from '../../types/index.js';
import { KeyGeneratorService, KeyGenerationResponse } from '../../services/key-generator.js';
import { FileUpdaterService, UpdateResult } from '../../services/file-updater.js';

interface ProcessTranslationResponseInput {
  aiResponse: string;
  autoApply?: boolean;
  validateOnly?: boolean;
}

interface ProcessTranslationResponseOutput {
  validationResult: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  parsedData: KeyGenerationResponse;
  updateResult?: UpdateResult;
  recommendations: {
    suggestions: string[];
    alternativeKeys: Record<string, string[]>;
  };
}

/**
 * AI 번역 응답 처리 도구
 */
export class ProcessTranslationResponseTool extends BaseTool {
  name = 'process-translation-response';
  description = 'AI 에이전트의 번역 응답을 검증하고 파일에 적용합니다';

  inputSchema = {
    type: 'object',
    properties: {
      aiResponse: {
        type: 'string',
        description: 'AI 에이전트가 제공한 JSON 형태의 번역 응답'
      },
      autoApply: {
        type: 'boolean',
        description: '검증 통과 시 자동으로 파일에 적용할지 여부 (기본: false)',
        default: false
      },
      validateOnly: {
        type: 'boolean',
        description: '검증만 수행하고 적용하지 않을지 여부 (기본: false)',
        default: false
      }
    },
    required: ['aiResponse'],
    additionalProperties: false
  } as const;

  private keyGenerator: KeyGeneratorService;
  private fileUpdater: FileUpdaterService;

  constructor(context: ToolContext) {
    super(context);
    this.keyGenerator = new KeyGeneratorService(context.config);
    this.fileUpdater = new FileUpdaterService(context.config);
  }

  async execute(input: ProcessTranslationResponseInput): Promise<ProcessTranslationResponseOutput> {
    try {
      // 1. AI 응답 파싱
      console.log('🔍 AI 응답 파싱 중...');
      const parsedData = this.keyGenerator.parseAIResponse(input.aiResponse);
      
      // 2. 데이터 검증
      console.log('✅ 번역 데이터 검증 중...');
      const validationResult = await this.validateTranslationData(parsedData);
      
      // 3. 추천사항 생성
      console.log('💡 키 추천사항 생성 중...');
      const recommendations = await this.generateRecommendations(parsedData);
      
      let updateResult: UpdateResult | undefined;
      
      // 4. 파일 적용 (조건부)
      if (!input.validateOnly && (input.autoApply || validationResult.isValid)) {
        if (validationResult.isValid) {
          console.log('📝 번역 파일 업데이트 중...');
          updateResult = await this.fileUpdater.addTranslationKeys(parsedData.translations);
          
          if (updateResult.success) {
            console.log(`✅ 성공적으로 ${updateResult.updatedKeys.length}개 키가 추가되었습니다`);
          } else {
            console.log(`❌ 업데이트 실패: ${updateResult.errors.join(', ')}`);
          }
        } else {
          console.log('⚠️ 검증 실패로 인해 파일 업데이트를 건너뜁니다');
        }
      }

      return {
        validationResult,
        parsedData,
        updateResult,
        recommendations
      };

    } catch (error) {
      throw new Error(`AI 응답 처리 실패: ${error}`);
    }
  }

  /**
   * 번역 데이터 검증
   */
  private async validateTranslationData(data: KeyGenerationResponse): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 기본 구조 검증
    if (!data.translations || !Array.isArray(data.translations)) {
      errors.push('translations 배열이 없습니다');
      return { isValid: false, errors, warnings };
    }

    if (data.translations.length === 0) {
      warnings.push('번역할 텍스트가 없습니다');
    }

    // 각 번역 항목 검증
    for (let i = 0; i < data.translations.length; i++) {
      const translation = data.translations[i];
      const prefix = `번역 ${i + 1}`;

      // 필수 필드 검증
      if (!translation.korean || typeof translation.korean !== 'string') {
        errors.push(`${prefix}: korean 필드가 없거나 유효하지 않습니다`);
      }

      if (!translation.keyOptions || !Array.isArray(translation.keyOptions) || translation.keyOptions.length === 0) {
        errors.push(`${prefix}: keyOptions가 없거나 비어있습니다`);
      }

      if (!translation.english || typeof translation.english !== 'object') {
        errors.push(`${prefix}: english 필드가 없거나 유효하지 않습니다`);
      }

      // 키 옵션 검증
      if (translation.keyOptions) {
        for (let j = 0; j < translation.keyOptions.length; j++) {
          const keyOption = translation.keyOptions[j];
          const keyPrefix = `${prefix} 키옵션 ${j + 1}`;

          if (!keyOption.keyName || typeof keyOption.keyName !== 'string') {
            errors.push(`${keyPrefix}: keyName이 없습니다`);
            continue;
          }

          // 키 이름 검증
          const validation = this.keyGenerator.validateKeyName(keyOption.keyName);
          if (!validation.isValid) {
            errors.push(`${keyPrefix}: ${validation.reason}`);
          }

          // 신뢰도 검증
          if (typeof keyOption.confidence !== 'number' || keyOption.confidence < 0 || keyOption.confidence > 1) {
            warnings.push(`${keyPrefix}: 신뢰도가 유효하지 않습니다 (${keyOption.confidence})`);
          }
        }
      }

      // 영어 번역 검증
      if (translation.english) {
        const hasN = translation.english.N && typeof translation.english.N === 'string';
        const hasV = translation.english.V && typeof translation.english.V === 'string';
        
        if (!hasN && !hasV) {
          errors.push(`${prefix}: 영어 번역이 없습니다 (N 또는 V 필요)`);
        }
      }

      // 품사 검증
      if (translation.partOfSpeech && !['N', 'V'].includes(translation.partOfSpeech)) {
        errors.push(`${prefix}: 품사가 유효하지 않습니다 (${translation.partOfSpeech})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 추천사항 생성
   */
  private async generateRecommendations(data: KeyGenerationResponse): Promise<{
    suggestions: string[];
    alternativeKeys: Record<string, string[]>;
  }> {
    const suggestions: string[] = [];
    const alternativeKeys: Record<string, string[]> = {};

    // 일반적인 개선 제안
    if (data.translations.length > 0) {
      suggestions.push('✅ AI가 생성한 키들이 프로젝트 컨벤션과 일치하는지 검토해보세요');
      suggestions.push('💡 품사 분류가 애매한 경우 명사(N)로 처리되었는지 확인하세요');
    }

    // 특수문자 케이스 제안
    const specialCharCases = data.translations.filter(t => t.isSpecialCharacter);
    if (specialCharCases.length > 0) {
      suggestions.push('🔤 특수문자가 포함된 텍스트는 배열 키로 처리됩니다');
    }

    // 키 이름 대안 제안
    for (const translation of data.translations) {
      if (translation.keyOptions && translation.keyOptions.length > 0) {
        const primaryKey = translation.keyOptions[0].keyName;
        const alternatives = this.keyGenerator.suggestSimilarKeys(primaryKey);
        
        if (alternatives.length > 0) {
          alternativeKeys[primaryKey] = alternatives;
        }
      }
    }

    // 신뢰도 관련 제안
    const lowConfidenceTranslations = data.translations.filter(t => 
      t.keyOptions && t.keyOptions[0] && t.keyOptions[0].confidence < 0.7
    );
    
    if (lowConfidenceTranslations.length > 0) {
      suggestions.push(`⚠️ ${lowConfidenceTranslations.length}개 번역의 신뢰도가 낮습니다. 수동 검토를 권장합니다`);
    }

    return {
      suggestions,
      alternativeKeys
    };
  }
} 