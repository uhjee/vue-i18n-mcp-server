/**
 * 키 생성 서비스 - AI 에이전트 연동
 * 새로운 한글 텍스트에 대한 번역 키 추천 및 생성
 */

import { MCPServerConfig } from '../types/index.js';

export interface KeyGenerationOption {
  keyName: string;
  confidence: number;
  reasoning: string;
  category?: string;
}

export interface TranslationAnalysis {
  korean: string;
  english: {
    N?: string;  // 명사형
    V?: string;  // 동사형
  };
  partOfSpeech: 'N' | 'V';
  keyOptions: KeyGenerationOption[];
  isSpecialCharacter: boolean;
  arrayKey?: string[];
}

export interface KeyGenerationRequest {
  texts: Array<{
    korean: string;
    context?: string;
    location?: string;
  }>;
  projectContext?: {
    existingKeys: string[];
    keyPatterns: string[];
    projectType: string;
  };
}

export interface KeyGenerationResponse {
  translations: TranslationAnalysis[];
  summary: {
    total: number;
    processed: number;
    failed: number;
  };
}

/**
 * AI 에이전트 기반 키 생성 서비스
 */
export class KeyGeneratorService {
  private config: MCPServerConfig;
  private readonly keyPrefix = 'WATCHALL.WORD';
  private readonly maxKeyLength = 50;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * AI 에이전트용 번역 요청 데이터 준비
   */
  prepareTranslationRequest(texts: string[], context?: any): KeyGenerationRequest {
    const existingKeys = this.getExistingKeys();
    
    return {
      texts: texts.map(text => ({
        korean: text,
        context: context?.fileType || 'unknown',
        location: context?.filePath || 'unknown'
      })),
      projectContext: {
        existingKeys,
        keyPatterns: this.analyzeExistingKeyPatterns(existingKeys),
        projectType: 'vue'
      }
    };
  }

  /**
   * AI 응답 파싱 및 검증
   */
  parseAIResponse(aiResponse: string): KeyGenerationResponse {
    try {
      const parsed = JSON.parse(aiResponse);
      return this.validateAndNormalizeResponse(parsed);
    } catch (error) {
      console.error('AI 응답 파싱 오류:', error);
      return this.createFallbackResponse();
    }
  }

  /**
   * 로컬 사전 기반 키 생성 (백업 방법)
   */
  generateLocalKeys(texts: string[]): TranslationAnalysis[] {
    return texts.map(text => this.generateSingleLocalKey(text));
  }

  /**
   * 키 중복 검사
   */
  validateKeyName(keyName: string): { isValid: boolean; reason?: string } {
    // 길이 검사
    if (keyName.length > this.maxKeyLength) {
      return { isValid: false, reason: `키 이름이 ${this.maxKeyLength}자를 초과합니다` };
    }

    // 형식 검사 (UPPER_SNAKE_CASE)
    if (!/^[A-Z][A-Z0-9_]*$/.test(keyName)) {
      return { isValid: false, reason: '키 이름은 UPPER_SNAKE_CASE 형식이어야 합니다' };
    }

    // 중복 검사
    const existingKeys = this.getExistingKeys();
    if (existingKeys.includes(`${this.keyPrefix}.${keyName}`)) {
      return { isValid: false, reason: '이미 존재하는 키입니다' };
    }

    return { isValid: true };
  }

  /**
   * 유사한 키 제안
   */
  suggestSimilarKeys(keyName: string): string[] {
    const existingKeys = this.getExistingKeys();
    const suggestions: string[] = [];

    // 편집 거리 기반 유사 키 찾기
    existingKeys.forEach(key => {
      const keyOnly = key.replace(`${this.keyPrefix}.`, '');
      if (this.calculateSimilarity(keyName, keyOnly) > 0.6) {
        suggestions.push(keyOnly);
      }
    });

    return suggestions.slice(0, 5);
  }

  /**
   * 기존 키 패턴 분석
   */
  private analyzeExistingKeyPatterns(keys: string[]): string[] {
    const patterns = new Set<string>();
    
    keys.forEach(key => {
      const keyOnly = key.replace(`${this.keyPrefix}.`, '');
      const parts = keyOnly.split('_');
      
      // 첫 단어 패턴
      if (parts.length > 0) {
        patterns.add(parts[0]);
      }
      
      // 마지막 단어 패턴
      if (parts.length > 1) {
        patterns.add(parts[parts.length - 1]);
      }
    });

    return Array.from(patterns);
  }

  /**
   * 단일 텍스트 로컬 키 생성
   */
  private generateSingleLocalKey(text: string): TranslationAnalysis {
    const cleanText = this.cleanText(text);
    const hasSpecialChars = /[\/\-&+|]/.test(text);

    // 특수문자 포함 시 배열 키 생성
    if (hasSpecialChars) {
      return this.generateArrayKey(text);
    }

    // 일반 키 생성
    const keyName = this.textToKeyName(cleanText);
    const basicTranslation = this.getBasicTranslation(cleanText);

    return {
      korean: text,
      english: { N: basicTranslation },
      partOfSpeech: 'N',
      keyOptions: [{
        keyName,
        confidence: 0.7,
        reasoning: '로컬 사전 기반 생성',
        category: this.categorizeText(text)
      }],
      isSpecialCharacter: false
    };
  }

  /**
   * 특수문자 배열 키 생성
   */
  private generateArrayKey(text: string): TranslationAnalysis {
    const parts = this.splitBySpecialChars(text);
    const arrayKey: string[] = [];

    parts.forEach(part => {
      if (/[\/\-&+|]/.test(part)) {
        arrayKey.push(`'${part}'`);
      } else {
        const cleanPart = this.cleanText(part);
        if (cleanPart) {
          const keyName = this.textToKeyName(cleanPart);
          arrayKey.push(`WATCHALL.WORD.${keyName}`);
        }
      }
    });

    return {
      korean: text,
      english: { N: this.getBasicTranslation(text) },
      partOfSpeech: 'N',
      keyOptions: [{
        keyName: 'ARRAY_KEY',
        confidence: 0.8,
        reasoning: '특수문자 포함으로 배열 키 생성'
      }],
      isSpecialCharacter: true,
      arrayKey
    };
  }

  /**
   * 텍스트를 키 이름으로 변환
   */
  private textToKeyName(text: string): string {
    const dictionary = this.getLocalDictionary();
    
    // 사전에서 찾기
    if (dictionary[text]) {
      return dictionary[text].toUpperCase().replace(/\s+/g, '_');
    }

    // 기본 변환 규칙
    return text
      .replace(/[가-힣]/g, match => this.koreanToEnglish(match))
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .toUpperCase();
  }

  /**
   * 기본 한영 사전
   */
  private getLocalDictionary(): Record<string, string> {
    return {
      '로그인': 'LOGIN',
      '로그아웃': 'LOGOUT',
      '저장': 'SAVE',
      '삭제': 'DELETE',
      '수정': 'EDIT',
      '추가': 'ADD',
      '확인': 'CONFIRM',
      '취소': 'CANCEL',
      '검색': 'SEARCH',
      '설정': 'SETTING',
      '사용자': 'USER',
      '관리자': 'ADMIN',
      '파일': 'FILE',
      '폴더': 'FOLDER',
      '이미지': 'IMAGE',
      '비디오': 'VIDEO',
      '오디오': 'AUDIO',
      '문서': 'DOCUMENT',
      '오류': 'ERROR',
      '경고': 'WARNING',
      '정보': 'INFO',
      '성공': 'SUCCESS',
      '실패': 'FAILURE',
      '로딩': 'LOADING',
      '완료': 'COMPLETE',
      '시작': 'START',
      '종료': 'END',
      '홈': 'HOME',
      '뒤로': 'BACK',
      '앞으로': 'FORWARD',
      '업로드': 'UPLOAD',
      '다운로드': 'DOWNLOAD',
      '전송': 'SEND',
      '수신': 'RECEIVE',
      '연결': 'CONNECT',
      '연결끊김': 'DISCONNECT'
    };
  }

  /**
   * 기본 번역 얻기
   */
  private getBasicTranslation(text: string): string {
    const dictionary = this.getLocalDictionary();
    return dictionary[text] || text;
  }

  /**
   * 텍스트 카테고리 분류
   */
  private categorizeText(text: string): string {
    if (/하기|시겠습니까|확인/.test(text)) return 'CONFIRM';
    if (/오류|에러|실패/.test(text)) return 'ERROR';
    if (/성공|완료/.test(text)) return 'SUCCESS';
    if (/로딩|대기/.test(text)) return 'LOADING';
    return 'GENERAL';
  }

  /**
   * 특수문자로 분할
   */
  private splitBySpecialChars(text: string): string[] {
    return text.split(/([\/\-&+|])/).filter(part => part.trim());
  }

  /**
   * 텍스트 정리
   */
  private cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * 한글을 영어로 변환 (음성학적)
   */
  private koreanToEnglish(char: string): string {
    // 기본적인 음성학적 변환 (실제로는 더 복잡한 로직 필요)
    const map: Record<string, string> = {
      '가': 'GA', '나': 'NA', '다': 'DA', '라': 'RA', '마': 'MA',
      '바': 'BA', '사': 'SA', '아': 'A', '자': 'JA', '차': 'CHA',
      '카': 'KA', '타': 'TA', '파': 'PA', '하': 'HA'
    };
    return map[char] || 'X';
  }

  /**
   * 문자열 유사도 계산
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 편집 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 응답 검증 및 정규화
   */
  private validateAndNormalizeResponse(response: any): KeyGenerationResponse {
    // 응답 구조 검증 및 정규화 로직
    if (!response.translations || !Array.isArray(response.translations)) {
      return this.createFallbackResponse();
    }

    return {
      translations: response.translations.map((t: any) => this.normalizeTranslation(t)),
      summary: response.summary || {
        total: response.translations.length,
        processed: response.translations.length,
        failed: 0
      }
    };
  }

  /**
   * 번역 정규화
   */
  private normalizeTranslation(translation: any): TranslationAnalysis {
    // keyOptions 정규화 및 WATCHALL.WORD 네임스페이스 강제 적용
    const normalizedKeyOptions = translation.keyOptions?.map((option: any) => {
      let keyName = option.keyName || '';
      
      // 기존 네임스페이스 제거 (LOGIN.SIGNUP → SIGNUP)
      keyName = keyName.replace(/^[A-Z_]+\./, '');
      
      // WATCHALL.WORD가 없으면 추가하지 않음 (FileUpdaterService에서 처리)
      // 단순히 키 이름만 정리
      
      return {
        ...option,
        keyName: keyName
      };
    }) || [];

    return {
      korean: translation.korean || '',
      english: translation.english || { N: translation.korean },
      partOfSpeech: translation.partOfSpeech || 'N',
      keyOptions: normalizedKeyOptions,
      isSpecialCharacter: translation.isSpecialCharacter || false,
      arrayKey: translation.arrayKey
    };
  }

  /**
   * 백업 응답 생성
   */
  private createFallbackResponse(): KeyGenerationResponse {
    return {
      translations: [],
      summary: { total: 0, processed: 0, failed: 0 }
    };
  }

  /**
   * 기존 키 목록 획득
   */
  private getExistingKeys(): string[] {
    // TODO: TranslationMatcherService와 연동하여 실제 키 목록 가져오기
    // 현재는 빈 배열 반환 (추후 구현)
    return [];
  }
} 