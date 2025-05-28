/**
 * 한영 혼용 문자열 처리 서비스
 * 한글과 영어가 섞인 문자열을 분석하여 적절한 i18n 변환 형태를 제공
 */

import { TranslationMatcherService } from './translation-matcher.js';

export interface MixedLanguageSegment {
  type: 'korean' | 'english' | 'other';
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface MixedLanguageAnalysis {
  originalText: string;
  segments: MixedLanguageSegment[];
  hasKorean: boolean;
  hasEnglish: boolean;
  isMixed: boolean;
  isSentence: boolean;
}

export interface MixedLanguageConversion {
  originalText: string;
  analysis: MixedLanguageAnalysis;
  conversionParts: string[];
  finalConversion: string;
  confidence: number;
}

/**
 * 한영 혼용 문자열 처리 서비스 클래스
 */
export class MixedLanguageProcessor {
  constructor(private translationMatcher: TranslationMatcherService) {}

  /**
   * 한영 혼용 문자열을 분석합니다
   */
  analyzeText(text: string): MixedLanguageAnalysis {
    const segments: MixedLanguageSegment[] = [];
    let currentIndex = 0;

    // 정규식으로 한글, 영어, 기타 부분을 순차적으로 찾기
    const patterns = [
      { type: 'korean' as const, regex: /[가-힣]+/g },
      { type: 'english' as const, regex: /[A-Za-z]+/g },
      { type: 'other' as const, regex: /[^가-힣A-Za-z]+/g }
    ];

    // 모든 매칭을 수집하고 위치별로 정렬
    const allMatches: Array<{ type: 'korean' | 'english' | 'other', match: RegExpMatchArray }> = [];
    
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, 'g');
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({ type: pattern.type, match });
      }
    });

    // 위치별로 정렬
    allMatches.sort((a, b) => a.match.index! - b.match.index!);

    // 연속된 세그먼트 생성
    let lastEndIndex = 0;
    
    allMatches.forEach(({ type, match }) => {
      const startIndex = match.index!;
      const endIndex = startIndex + match[0].length;
      
      // 이전 세그먼트와 현재 세그먼트 사이에 빈 공간이 있으면 건너뛰기
      if (startIndex > lastEndIndex) {
        // 빈 공간은 무시 (공백, 특수문자 등)
      }
      
      // 현재 세그먼트 추가
      segments.push({
        type,
        text: match[0],
        startIndex,
        endIndex
      });
      
      lastEndIndex = Math.max(lastEndIndex, endIndex);
    });

    // 중복 제거 및 정리
    const cleanSegments = this.cleanSegments(segments, text);
    
    const hasKorean = cleanSegments.some(s => s.type === 'korean');
    const hasEnglish = cleanSegments.some(s => s.type === 'english');
    const isMixed = hasKorean && hasEnglish;
    const isSentence = this.isSentence(text);

    return {
      originalText: text,
      segments: cleanSegments,
      hasKorean,
      hasEnglish,
      isMixed,
      isSentence
    };
  }

  /**
   * 문장인지 판별 (PatternScannerService와 동일한 로직)
   */
  private isSentence(text: string): boolean {
    // 문장 판별 기준들 (더 관대하게 수정)
    const sentenceIndicators = [
      // 1. 명확한 문장 종결 어미
      /습니다$|했습니다$|됩니다$|합니다$/,
      
      // 2. 물음표, 느낌표 포함
      /[?!]/, 
      
      // 3. 매우 긴 설명문 (20글자 이상이면서 공백 포함)
      text.length >= 20 && /\s/.test(text),
      
      // 4. 의문문 패턴
      /까요\?$|세요\?$|나요\?$|어요\?$/,
      
      // 5. 명령문 패턴 (긴 것만)
      /해주세요$|하십시오$/,
      
      // 6. 접속사나 부사로 시작하는 긴 문장
      text.length >= 15 && /^(그런데|하지만|따라서|또한|만약|예를 들어|즉|결국)/.test(text),
      
      // 7. 완전한 문장 형태 (주어+서술어, 긴 것만)
      text.length >= 15 && /[이가은는].*[다요음니]$/.test(text),
      
      // 8. 일반적인 긴 문장 패턴들
      /해야\s?합니다|할\s?수\s?있습니다|하지\s?마세요|하시겠습니까|하고\s?싶습니다/,
    ];

    return sentenceIndicators.some(indicator => {
      if (typeof indicator === 'boolean') {
        return indicator;
      }
      return indicator.test(text);
    });
  }

  /**
   * 세그먼트 정리 및 중복 제거
   */
  private cleanSegments(segments: MixedLanguageSegment[], originalText: string): MixedLanguageSegment[] {
    // 위치별로 정렬
    segments.sort((a, b) => a.startIndex - b.startIndex);
    
    const cleaned: MixedLanguageSegment[] = [];
    let lastEndIndex = 0;
    
    segments.forEach(segment => {
      // 겹치지 않는 세그먼트만 추가
      if (segment.startIndex >= lastEndIndex) {
        cleaned.push(segment);
        lastEndIndex = segment.endIndex;
      }
    });
    
    return cleaned;
  }

  /**
   * 한영 혼용 문자열을 i18n 형태로 변환합니다
   * 🎯 **핵심 개선**: 문장이 아닌 경우 기본적으로 개별 단어 분해
   */
  async convertToI18n(text: string, forceWordDecomposition: boolean = false): Promise<MixedLanguageConversion> {
    const analysis = this.analyzeText(text);
    
    // 🔧 **새 로직**: 문장이 아니거나 강제 분해 옵션이 true인 경우 개별 단어 분해
    const shouldDecompose = !analysis.isSentence || forceWordDecomposition;
    
    if (!analysis.isMixed) {
      // 혼용이 아닌 경우 기존 방식 사용 (개별 단어 분해 로직 포함)
      return this.handleNonMixedText(text, analysis, shouldDecompose);
    }

    // 혼용 문자열 처리
    const conversionParts: string[] = [];
    let totalConfidence = 0;
    let processedSegments = 0;

    for (const segment of analysis.segments) {
      if (segment.type === 'korean') {
        if (shouldDecompose) {
          // 개별 단어 분해 처리
          const words = segment.text.trim().split(/\s+/);
          
          for (const word of words) {
            if (word.trim().length === 0) continue;
            
            const matches = await this.translationMatcher.findMatches([word]);
            if (matches.length > 0) {
              const match = matches[0];
              conversionParts.push(match.keyPath);
              totalConfidence += match.confidence;
            } else {
              // 매칭되지 않는 한글 단어는 문자열 리터럴로 유지
              conversionParts.push(`'${word}'`);
              totalConfidence += 0; // 매칭 실패
            }
            processedSegments++;
          }
        } else {
          // 문장인 경우 전체를 하나로 처리
          const matches = await this.translationMatcher.findMatches([segment.text]);
          if (matches.length > 0) {
            const match = matches[0];
            conversionParts.push(match.keyPath);
            totalConfidence += match.confidence;
          } else {
            conversionParts.push(`'${segment.text}'`);
            totalConfidence += 0;
          }
          processedSegments++;
        }
      } else if (segment.type === 'english') {
        // 영어 부분은 문자열 리터럴로 유지
        conversionParts.push(`'${segment.text}'`);
        totalConfidence += 100; // 영어는 변환 불필요하므로 100%
        processedSegments++;
      }
      // 'other' 타입(공백, 특수문자)은 무시
    }

    const averageConfidence = processedSegments > 0 ? totalConfidence / processedSegments : 0;
    const finalConversion = `$localeMessage([${conversionParts.join(', ')}])`;

    return {
      originalText: text,
      analysis,
      conversionParts,
      finalConversion,
      confidence: Math.round(averageConfidence)
    };
  }

  /**
   * 한글 텍스트를 개별 단어로 분해하여 i18n 키로 변환합니다
   */
  private async decomposeKoreanText(text: string): Promise<{
    parts: string[];
    finalConversion: string;
    confidence: number;
  }> {
    // 한글 텍스트를 공백으로 분리하여 개별 단어로 분해
    const words = text.trim().split(/\s+/);
    
    const conversionParts: string[] = [];
    let totalConfidence = 0;
    let matchedWords = 0;

    for (const word of words) {
      if (word.trim().length === 0) continue;
      
      // 개별 단어를 번역 키로 변환 시도
      const matches = await this.translationMatcher.findMatches([word]);
      if (matches.length > 0) {
        const match = matches[0];
        conversionParts.push(match.keyPath);
        totalConfidence += match.confidence;
        matchedWords++;
      } else {
        // 매칭되지 않는 단어는 문자열 리터럴로 유지
        conversionParts.push(`'${word}'`);
        totalConfidence += 0; // 매칭 실패
        matchedWords++;
      }
    }

    const averageConfidence = matchedWords > 0 ? totalConfidence / matchedWords : 0;
    
    // 단일 키인 경우와 배열 키인 경우 구분
    let finalConversion: string;
    if (conversionParts.length === 1) {
      const singlePart = conversionParts[0];
      if (singlePart.startsWith("'") && singlePart.endsWith("'")) {
        // 매칭되지 않은 단일 문자열
        finalConversion = singlePart;
      } else {
        // 매칭된 단일 키
        finalConversion = `$localeMessage(${singlePart})`;
      }
    } else {
      // 여러 단어로 구성된 경우 배열 형태
      finalConversion = `$localeMessage([${conversionParts.join(', ')}])`;
    }

    return {
      parts: conversionParts,
      finalConversion,
      confidence: Math.round(averageConfidence)
    };
  }

  /**
   * 혼용이 아닌 텍스트 처리 (개선된 버전)
   * 🎯 **핵심 개선**: shouldDecompose 파라미터 추가
   */
  private async handleNonMixedText(text: string, analysis: MixedLanguageAnalysis, shouldDecompose: boolean = false): Promise<MixedLanguageConversion> {
    if (analysis.hasKorean && !analysis.hasEnglish) {
      // 순수 한글인 경우
      if (shouldDecompose) {
        // 개별 단어로 분해하여 처리
        const decomposed = await this.decomposeKoreanText(text);
        
        return {
          originalText: text,
          analysis,
          conversionParts: decomposed.parts,
          finalConversion: decomposed.finalConversion,
          confidence: decomposed.confidence
        };
      } else {
        // 문장인 경우 전체를 하나로 처리
        const matches = await this.translationMatcher.findMatches([text]);
        if (matches.length > 0) {
          const match = matches[0];
          return {
            originalText: text,
            analysis,
            conversionParts: [match.keyPath],
            finalConversion: `$localeMessage(${match.keyPath})`,
            confidence: match.confidence
          };
        } else {
          return {
            originalText: text,
            analysis,
            conversionParts: [`'${text}'`],
            finalConversion: `'${text}'`,
            confidence: 0
          };
        }
      }
    } else if (analysis.hasEnglish && !analysis.hasKorean) {
      // 순수 영어인 경우 - 변환하지 않음
      return {
        originalText: text,
        analysis,
        conversionParts: [`'${text}'`],
        finalConversion: `'${text}'`,
        confidence: 100 // 영어는 변환 불필요
      };
    } else {
      // 한글도 영어도 없는 경우 (숫자, 특수문자만)
      return {
        originalText: text,
        analysis,
        conversionParts: [`'${text}'`],
        finalConversion: `'${text}'`,
        confidence: 100
      };
    }
  }

  /**
   * 여러 텍스트를 일괄 처리합니다
   * 🎯 **개선**: forceWordDecomposition 파라미터 추가
   */
  async convertMultipleTexts(texts: string[], forceWordDecomposition: boolean = false): Promise<MixedLanguageConversion[]> {
    const results: MixedLanguageConversion[] = [];
    
    for (const text of texts) {
      const conversion = await this.convertToI18n(text, forceWordDecomposition);
      results.push(conversion);
    }
    
    return results;
  }

  /**
   * 변환 결과를 요약합니다
   */
  summarizeConversions(conversions: MixedLanguageConversion[]): {
    total: number;
    mixed: number;
    pureKorean: number;
    pureEnglish: number;
    averageConfidence: number;
  } {
    const total = conversions.length;
    const mixed = conversions.filter(c => c.analysis.isMixed).length;
    const pureKorean = conversions.filter(c => c.analysis.hasKorean && !c.analysis.hasEnglish).length;
    const pureEnglish = conversions.filter(c => c.analysis.hasEnglish && !c.analysis.hasKorean).length;
    
    const totalConfidence = conversions.reduce((sum, c) => sum + c.confidence, 0);
    const averageConfidence = total > 0 ? Math.round(totalConfidence / total) : 0;

    return {
      total,
      mixed,
      pureKorean,
      pureEnglish,
      averageConfidence
    };
  }
} 