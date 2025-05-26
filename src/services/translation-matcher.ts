/**
 * 번역 매칭 서비스 - 최적화된 버전
 * 대용량 파일에서 WATCHALL.WORD 부분만 추출하여 빠른 검색 제공
 */

import fs from 'fs-extra';
import { MCPServerConfig } from '../types/index.js';

export interface TranslationMatch {
  korean: string;
  english: string;
  keyPath: string;
  confidence: number;
}

/**
 * 최적화된 번역 매칭 서비스 클래스
 */
export class TranslationMatcherService {
  private koWordIndex: Map<string, string> = new Map(); // 한글 → 키경로
  private enWordIndex: Map<string, string> = new Map(); // 키경로 → 영문
  private lastModified: Map<string, number> = new Map(); // 파일 → 수정시간
  private loaded = false;

  constructor(private config: MCPServerConfig) {}

  /**
   * 언어 파일들을 최적화된 방식으로 로드합니다
   */
  async loadTranslations(): Promise<void> {
    try {
      const koPath = this.config.langFilePath.ko;
      const enPath = this.config.langFilePath.en;

      console.error(`🔍 번역 파일 경로 확인:`);
      console.error(`  - ko.js: ${koPath}`);
      console.error(`  - en.js: ${enPath}`);

      // ko.js 파일 로드 및 인덱싱
      if (await fs.pathExists(koPath)) {
        if (await this.needsReload(koPath, 'ko')) {
          const koWordSection = await this.extractWordSection(koPath);
          this.koWordIndex = this.buildKoreanIndex(koWordSection);
          await this.updateLastModified(koPath, 'ko');
          console.error(`✅ ko.js 최적화 로드 성공: ${this.koWordIndex.size}개 단어`);
        } else {
          console.error(`📋 ko.js 캐시 사용: ${this.koWordIndex.size}개 단어`);
        }
      } else {
        console.error(`❌ ko.js 파일을 찾을 수 없습니다: ${koPath}`);
      }

      // en.js 파일 로드 및 인덱싱
      if (await fs.pathExists(enPath)) {
        if (await this.needsReload(enPath, 'en')) {
          const enWordSection = await this.extractWordSection(enPath);
          this.enWordIndex = this.buildEnglishIndex(enWordSection);
          await this.updateLastModified(enPath, 'en');
          console.error(`✅ en.js 최적화 로드 성공: ${this.enWordIndex.size}개 단어`);
        } else {
          console.error(`📋 en.js 캐시 사용: ${this.enWordIndex.size}개 단어`);
        }
      } else {
        console.error(`❌ en.js 파일을 찾을 수 없습니다: ${enPath}`);
      }

      this.loaded = true;
      console.error(`✅ 최적화된 번역 파일 로드 완료: ko=${this.koWordIndex.size}, en=${this.enWordIndex.size}`);
      
    } catch (error) {
      console.error('❌ 번역 파일 로드 실패:', error);
    }
  }

  /**
   * 파일에서 WATCHALL.WORD 섹션만 추출합니다
   */
  private async extractWordSection(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // WATCHALL.WORD 섹션을 정규식으로 추출 (더 정교한 패턴)
      const wordSectionRegex = /WORD:\s*\{([\s\S]*?)\n\s*\},?\s*\n/;
      const match = content.match(wordSectionRegex);
      
      if (!match) {
        console.error(`⚠️ WATCHALL.WORD 섹션을 찾을 수 없습니다: ${filePath}`);
        return {};
      }

      // 추출된 WORD 섹션을 안전하게 파싱
      const wordContent = `{${match[1]}}`;
      
      // 직접 eval 사용 (복잡한 구조이므로 JSON 변환 건너뛰기)
      try {
        console.error(`🔧 ${filePath} WORD 섹션 직접 파싱 시도...`);
        return eval(`(${wordContent})`);
      } catch (evalError) {
        console.error(`❌ eval 파싱도 실패: ${evalError instanceof Error ? evalError.message : String(evalError)}`);
        
        // 마지막 시도: 더 간단한 정규식으로 키-값 쌍 추출
        return this.parseWordSectionManually(wordContent);
      }
      
    } catch (error) {
      console.error(`❌ WORD 섹션 추출 실패 (${filePath}):`, error);
      return {};
    }
  }

  /**
   * 수동으로 WORD 섹션 파싱 (마지막 수단)
   */
  private parseWordSectionManually(content: string): any {
    try {
      const result: any = {};
      
      // 키: { ... } 패턴을 찾아서 파싱 (중첩 구조 고려)
      const keyValueRegex = /([A-Z_0-9]+):\s*\{([\s\S]*?)\n\s*\},?/g;
      let match;
      
      while ((match = keyValueRegex.exec(content)) !== null) {
        const key = match[1];
        const valueContent = match[2];
        
        // N: 'value' 패턴 찾기
        const nValueMatch = valueContent.match(/N:\s*'([^']*)'|N:\s*"([^"]*)"/);
        if (nValueMatch) {
          const value = nValueMatch[1] || nValueMatch[2];
          result[key] = { N: value };
        } else {
          // 단순 문자열 값인 경우
          const simpleValueMatch = valueContent.match(/'([^']*)'|"([^"]*)"/);
          if (simpleValueMatch) {
            const value = simpleValueMatch[1] || simpleValueMatch[2];
            result[key] = value;
          }
        }
      }
      
      console.error(`🔧 수동 파싱 완료: ${Object.keys(result).length}개 키 추출`);
      return result;
      
    } catch (error) {
      console.error('수동 파싱 실패:', error);
      return {};
    }
  }

  /**
   * 한글 인덱스 생성 (한글 값 → 키 경로)
   */
  private buildKoreanIndex(wordSection: any): Map<string, string> {
    const index = new Map<string, string>();
    
    for (const [key, value] of Object.entries(wordSection)) {
      if (typeof value === 'string') {
        index.set(value, `WATCHALL.WORD.${key}`);
      } else if (typeof value === 'object' && value !== null) {
        // N, V 등의 하위 속성이 있는 경우
        for (const [subKey, subValue] of Object.entries(value)) {
          if (typeof subValue === 'string') {
            index.set(subValue, `WATCHALL.WORD.${key}`);
          }
        }
      }
    }
    
    return index;
  }

  /**
   * 영문 인덱스 생성 (키 경로 → 영문 값)
   */
  private buildEnglishIndex(wordSection: any): Map<string, string> {
    const index = new Map<string, string>();
    
    for (const [key, value] of Object.entries(wordSection)) {
      const keyPath = `WATCHALL.WORD.${key}`;
      
      if (typeof value === 'string') {
        index.set(keyPath, value);
      } else if (typeof value === 'object' && value !== null) {
        // N 속성을 우선적으로 사용
        const nValue = (value as any).N;
        if (typeof nValue === 'string') {
          index.set(keyPath, nValue);
        }
      }
    }
    
    return index;
  }

  /**
   * 파일 재로드가 필요한지 확인
   */
  private async needsReload(filePath: string, type: 'ko' | 'en'): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const cacheKey = `${type}_${filePath}`;
      const lastMod = this.lastModified.get(cacheKey) || 0;
      return stats.mtime.getTime() > lastMod;
    } catch (error) {
      return true; // 오류 시 재로드
    }
  }

  /**
   * 파일 수정시간 업데이트
   */
  private async updateLastModified(filePath: string, type: 'ko' | 'en'): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const cacheKey = `${type}_${filePath}`;
      this.lastModified.set(cacheKey, stats.mtime.getTime());
    } catch (error) {
      console.error(`파일 수정시간 업데이트 실패: ${filePath}`, error);
    }
  }

  /**
   * 한글 텍스트와 매칭되는 번역 키를 찾습니다 (최적화된 버전)
   */
  async findMatches(koreanTexts: string[]): Promise<TranslationMatch[]> {
    if (!this.loaded) {
      await this.loadTranslations();
    }

    const matches: TranslationMatch[] = [];

    for (const koreanText of koreanTexts) {
      // 1. 먼저 직접 매칭 시도 (O(1) 검색)
      const directMatch = this.koWordIndex.get(koreanText);
      
      if (directMatch) {
        const englishValue = this.enWordIndex.get(directMatch) || '';
        
        matches.push({
          korean: koreanText,
          english: englishValue,
          keyPath: directMatch,
          confidence: 1.0
        });
      } else {
        // 2. 직접 매칭 실패 시 공백 분리 매칭 시도
        const wordMatch = this.findWordCombinationMatch(koreanText);
        if (wordMatch) {
          matches.push(wordMatch);
        }
      }
    }

    return matches;
  }

  /**
   * 공백이나 특수문자로 분리된 단어들을 개별 매칭하여 조합 키 생성 (부분 매칭 지원)
   */
  private findWordCombinationMatch(koreanText: string): TranslationMatch | null {
    // 특수문자와 공백으로 분리 (특수문자는 별도 요소로 유지)
    const parts = koreanText.split(/(\s+|[\/\-&+|])/).filter(part => part.trim().length > 0);
    
    // 단순 단어가 하나뿐이면 개별 매칭 시도
    if (parts.length === 1) {
      const keyPath = this.koWordIndex.get(parts[0]);
      if (keyPath) {
        const englishValue = this.enWordIndex.get(keyPath) || '';
        return {
          korean: koreanText,
          english: englishValue,
          keyPath: keyPath,
          confidence: 1.0
        };
      }
      return null;
    }

    // 여러 요소인 경우 개별 매칭 후 배열 형태로 키 생성
    const processedParts: Array<{
      original: string, 
      keyPath: string, 
      english: string, 
      isMatched: boolean,
      isSpecialChar: boolean
    }> = [];
    let matchedCount = 0;
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      
      // 특수문자인지 확인 (공백 제외)
      if (/^[\/\-&+|]$/.test(trimmedPart)) {
        // 특수문자는 그대로 유지
        processedParts.push({
          original: trimmedPart,
          keyPath: `'${trimmedPart}'`,
          english: trimmedPart,
          isMatched: false,
          isSpecialChar: true
        });
      } else if (trimmedPart.length > 0) {
        // 한글 단어인 경우 번역 키 찾기
        const keyPath = this.koWordIndex.get(trimmedPart);
        if (keyPath) {
          const englishValue = this.enWordIndex.get(keyPath) || '';
          processedParts.push({
            original: trimmedPart,
            keyPath: keyPath,
            english: englishValue,
            isMatched: true,
            isSpecialChar: false
          });
          matchedCount++;
        } else {
          // 매칭되지 않은 한글은 그대로 유지
          processedParts.push({
            original: trimmedPart,
            keyPath: `'${trimmedPart}'`,
            english: trimmedPart,
            isMatched: false,
            isSpecialChar: false
          });
        }
      }
    }

    // 특수문자가 포함되어 있거나 최소 하나 이상의 단어가 매칭되었으면 결과 생성
    const hasSpecialChar = processedParts.some(p => p.isSpecialChar);
    const hasMatchedWord = matchedCount > 0;
    
    if (hasSpecialChar || hasMatchedWord) {
      const keyPaths = processedParts.map(p => p.keyPath);
      const combinedEnglish = processedParts.map(p => p.english).join('');
      
      // 신뢰도 계산
      let confidence = 0.5; // 기본값
      if (hasSpecialChar) {
        // 특수문자가 있으면서 일부 단어가 매칭된 경우
        const totalWords = processedParts.filter(p => !p.isSpecialChar).length;
        if (totalWords > 0) {
          confidence = 0.7 + (matchedCount / totalWords) * 0.2; // 0.7~0.9
        } else {
          confidence = 0.6; // 특수문자만 있는 경우
        }
      } else if (matchedCount === processedParts.length) {
        // 모든 단어가 매칭된 경우
        confidence = 0.8;
      } else if (matchedCount > 0) {
        // 일부 단어만 매칭된 경우
        confidence = 0.6;
      }
      
      return {
        korean: koreanText,
        english: combinedEnglish,
        keyPath: `[${keyPaths.join(', ')}]`, // 배열 형태로 키 표현
        confidence: confidence
      };
    }

    return null;
  }

  /**
   * 사용 가능한 모든 번역 키 목록을 반환 (최적화된 버전)
   */
  getAvailableKeys(): string[] {
    return Array.from(this.koWordIndex.values());
  }

  /**
   * 매칭되지 않은 한글 텍스트 목록 반환
   */
  async getUnmatchedTexts(koreanTexts: string[]): Promise<string[]> {
    const matches = await this.findMatches(koreanTexts);
    const matchedTexts = new Set(matches.map(m => m.korean));
    
    return koreanTexts.filter(text => !matchedTexts.has(text));
  }
} 