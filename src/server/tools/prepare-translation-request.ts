/**
 * 번역 요청 준비 도구
 * AI 에이전트에게 전달할 번역 요청 데이터를 구조화하여 준비
 */

import { BaseTool } from './base-tool.js';
import { ToolContext } from '../../types/index.js';
import { KeyGeneratorService, KeyGenerationRequest } from '../../services/key-generator.js';
import { PatternScannerService } from '../../services/pattern-scanner.js';
import { TranslationMatcherService } from '../../services/translation-matcher.js';

interface PrepareTranslationRequestInput {
  filePath?: string;
  fileContent?: string;
  koreanTexts?: string[];
  context?: {
    fileType?: 'vue' | 'js' | 'ts';
    section?: 'template' | 'script' | 'all';
  };
}

interface PrepareTranslationRequestOutput {
  request: KeyGenerationRequest;
  untranslatedTexts: string[];
  aiPrompt: string;
  summary: {
    totalTexts: number;
    alreadyTranslated: number;
    needsTranslation: number;
  };
}

/**
 * AI 에이전트용 번역 요청 준비 도구
 */
export class PrepareTranslationRequestTool extends BaseTool {
  name = 'prepare-translation-request';
  description = 'AI 에이전트에게 전달할 번역 요청 데이터를 준비합니다';

  inputSchema = {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '분석할 파일 경로 (선택사항)'
      },
      fileContent: {
        type: 'string',
        description: '분석할 파일 내용 (선택사항)'
      },
      koreanTexts: {
        type: 'array',
        items: { type: 'string' },
        description: '직접 제공된 한글 텍스트 배열 (선택사항)'
      },
      context: {
        type: 'object',
        properties: {
          fileType: {
            type: 'string',
            enum: ['vue', 'js', 'ts'],
            description: '파일 타입'
          },
          section: {
            type: 'string',
            enum: ['template', 'script', 'all'],
            description: 'Vue 파일의 특정 섹션 (Vue 파일인 경우)'
          }
        },
        description: '파일 컨텍스트 정보 (선택사항)'
      }
    },
    required: [],
    additionalProperties: false
  } as const;

  private keyGenerator: KeyGeneratorService;
  private patternScanner: PatternScannerService;
  private translationMatcher: TranslationMatcherService;

  constructor(context: ToolContext) {
    super(context);
    this.keyGenerator = new KeyGeneratorService(context.config);
    this.patternScanner = new PatternScannerService();
    this.translationMatcher = new TranslationMatcherService(context.config);
  }

  async execute(input: PrepareTranslationRequestInput): Promise<PrepareTranslationRequestOutput> {
    try {
      // 1. 한글 텍스트 수집
      const allKoreanTexts = await this.collectKoreanTexts(input);
      
      // 2. 기존 번역 매칭 확인
      await this.translationMatcher.loadTranslations();
      const matches = await this.translationMatcher.findMatches(allKoreanTexts);
      const translatedTexts = new Set(matches.map(m => m.korean));
      
      // 3. 미번역 텍스트 필터링
      const untranslatedTexts = allKoreanTexts.filter(text => !translatedTexts.has(text));
      
      // 4. AI 요청 데이터 생성
      const request = this.keyGenerator.prepareTranslationRequest(
        untranslatedTexts, 
        {
          filePath: input.filePath,
          fileType: input.context?.fileType || 'unknown'
        }
      );
      
      // 5. AI 프롬프트 생성
      const aiPrompt = this.generateAIPrompt(request, input.context);
      
      return {
        request,
        untranslatedTexts,
        aiPrompt,
        summary: {
          totalTexts: allKoreanTexts.length,
          alreadyTranslated: matches.length,
          needsTranslation: untranslatedTexts.length
        }
      };

    } catch (error) {
      throw new Error(`번역 요청 준비 실패: ${error}`);
    }
  }

  /**
   * 한글 텍스트 수집
   */
  private async collectKoreanTexts(input: PrepareTranslationRequestInput): Promise<string[]> {
    const koreanTexts: string[] = [];

    // 직접 제공된 텍스트
    if (input.koreanTexts) {
      koreanTexts.push(...input.koreanTexts);
    }

    // 파일 내용에서 추출
    if (input.fileContent) {
      const extractedTexts = await this.extractFromContent(
        input.fileContent, 
        input.filePath || 'unknown',
        input.context
      );
      koreanTexts.push(...extractedTexts);
    }

    // 중복 제거
    return [...new Set(koreanTexts)];
  }

  /**
   * 파일 내용에서 한글 텍스트 추출
   */
  private async extractFromContent(
    content: string, 
    filePath: string, 
    context?: PrepareTranslationRequestInput['context']
  ): Promise<string[]> {
    const fileType = context?.fileType || this.getFileTypeFromPath(filePath);
    
    if (fileType === 'vue') {
      const results = await this.patternScanner.scanVueFile(filePath, content);
      
      // 섹션 필터링
      if (context?.section && context.section !== 'all') {
        const filteredResults = results.filter(r => r.location.section === context.section);
        return filteredResults.map(r => r.text);
      }
      
      return results.map(r => r.text);
    } else {
      const results = this.patternScanner.scanJSFile(filePath, content);
      return results.map(r => r.text);
    }
  }

  /**
   * 파일 경로에서 파일 타입 추론
   */
  private getFileTypeFromPath(filePath: string): 'vue' | 'js' | 'ts' {
    if (filePath.endsWith('.vue')) return 'vue';
    if (filePath.endsWith('.ts')) return 'ts';
    return 'js';
  }

  /**
   * AI 에이전트용 프롬프트 생성
   */
  private generateAIPrompt(request: KeyGenerationRequest, context?: PrepareTranslationRequestInput['context']): string {
    const existingKeysSample = request.projectContext?.existingKeys.slice(0, 10) || [];
    const keyPatternsSample = request.projectContext?.keyPatterns.slice(0, 15) || [];

    return `🎯 Vue i18n 번역 키 생성 및 품사 분석 요청

📝 번역할 한글 텍스트들:
${request.texts.map((t, i) => `${i + 1}. "${t.korean}"`).join('\n')}

📋 프로젝트 컨텍스트:
- 프로젝트 타입: ${request.projectContext?.projectType || 'unknown'}
- 기존 키 패턴 샘플: ${keyPatternsSample.join(', ')}
- 기존 키 예시: ${existingKeysSample.slice(0, 5).join(', ')}

🎯 요청사항:
각 한글 텍스트에 대해 다음 정보를 JSON 형태로 생성해주세요:

⚠️ **중요 규칙**:
- **모든 UI 단어는 WATCHALL.WORD 네임스페이스에 속합니다**
- **키 이름은 단어의 의미만 반영하고, 파일 위치나 컨텍스트는 무시하세요**
- **LOGIN, SIGNUP, FIND_PASSWORD 같이 단순한 키 이름을 사용하세요**
- **네임스페이스 접두사(LOGIN., AUTH. 등)는 사용하지 마세요**

1. **키 이름 추천**: 단순한 UPPER_SNAKE_CASE 형태로 3개 옵션
2. **품사 분석**: 명사(N) 또는 동사(V) 분류 (모호하면 N)
3. **영어 번역**: 명사형과 동사형 모두 제공
4. **특수문자 처리**: '/', '-', '&', '+', '|' 포함 시 배열 키 생성
5. **카테고리 분류**: CONFIRM, ERROR, SUCCESS, LOADING, GENERAL 등

📤 응답 형식:
\`\`\`
{
  "translations": [
    {
      "korean": "회원가입",
      "keyOptions": [
        {
          "keyName": "SIGNUP",
          "confidence": 0.95,
          "reasoning": "회원가입 버튼/링크",
          "category": "GENERAL"
        },
        {
          "keyName": "REGISTER",
          "confidence": 0.90,
          "reasoning": "등록 의미",
          "category": "GENERAL"
        },
        {
          "keyName": "JOIN",
          "confidence": 0.85,
          "reasoning": "가입 의미",
          "category": "GENERAL"
        }
      ],
      "english": {
        "N": "Signup",
        "V": "Sign up"
      },
      "partOfSpeech": "N",
      "isSpecialCharacter": false
    }
  ],
  "summary": {
    "total": ${request.texts.length},
    "processed": ${request.texts.length},
    "failed": 0
  }
}
\`\`\`

⚠️ 주의사항:
- **파일 위치와 관계없이 단어 자체의 의미만 고려**
- **WATCHALL.WORD. 접두사는 시스템에서 자동 추가됨**
- **LOGIN.SIGNUP (❌) → SIGNUP (✅)**
- **AUTH.PASSWORD (❌) → PASSWORD (✅)**
- 특수문자 포함 텍스트는 배열 키로 처리
- 모호한 품사는 명사(N)로 분류
- 키 이름은 50자 이내로 제한`;
  }
} 