/**
 * 번역 매칭 서비스 - RFP 3단계 구현
 * 기존 ko.js, en.js 파일에서 한글 텍스트와 매칭되는 키를 찾습니다
 */

import fs from 'fs-extra';
import path from 'path';
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
export class TranslationMatcherService {
  private koTranslations: any = {};
  private enTranslations: any = {};
  private loaded = false;

  constructor(private config: MCPServerConfig) {}

  /**
   * 언어 파일들을 로드합니다
   */
  async loadTranslations(): Promise<void> {
    try {
      const koPath = this.config.langFilePath.ko;
      const enPath = this.config.langFilePath.en;

      console.error(`🔍 번역 파일 경로 확인:`);
      console.error(`  - ko.js: ${koPath}`);
      console.error(`  - en.js: ${enPath}`);

      // ko.js 파일 로드
      if (await fs.pathExists(koPath)) {
        const koContent = await fs.readFile(koPath, 'utf-8');
        this.koTranslations = this.parseJSFile(koContent);
        console.error(`✅ ko.js 로드 성공: ${Object.keys(this.koTranslations).length}개 최상위 키`);
      } else {
        console.error(`❌ ko.js 파일을 찾을 수 없습니다: ${koPath}`);
      }

      // en.js 파일 로드
      if (await fs.pathExists(enPath)) {
        const enContent = await fs.readFile(enPath, 'utf-8');
        this.enTranslations = this.parseJSFile(enContent);
        console.error(`✅ en.js 로드 성공: ${Object.keys(this.enTranslations).length}개 최상위 키`);
      } else {
        console.error(`❌ en.js 파일을 찾을 수 없습니다: ${enPath}`);
      }

      this.loaded = true;
      
      // 사용 가능한 키 확인
      const availableKeys = this.getAvailableKeys();
      console.error(`✅ 번역 파일 로드 완료: ko=${Object.keys(this.koTranslations).length}, en=${Object.keys(this.enTranslations).length}`);
      console.error(`✅ 사용 가능한 번역 키: ${availableKeys.length}개`);
      if (availableKeys.length > 0) {
        console.error(`처음 5개: ${availableKeys.slice(0, 5).join(', ')}`);
      }
    } catch (error) {
      console.error('❌ 번역 파일 로드 실패:', error);
    }
  }

  /**
   * JS 파일 내용을 파싱하여 객체로 변환
   */
  private parseJSFile(content: string): any {
    try {
      // export default를 제거하고 객체만 추출
      const cleanContent = content
        .replace(/export\s+default\s+/, '')
        .replace(/;?\s*$/, '');
      
      // eval을 사용하여 객체 파싱 (보안상 위험하지만 개발 환경에서 사용)
      // 실제 프로덕션에서는 더 안전한 파서 사용 권장
      return eval(`(${cleanContent})`);
    } catch (error) {
      console.error('JS 파일 파싱 오류:', error);
      return {};
    }
  }

  /**
   * 한글 텍스트와 매칭되는 번역 키를 찾습니다
   */
  async findMatches(koreanTexts: string[]): Promise<TranslationMatch[]> {
    if (!this.loaded) {
      await this.loadTranslations();
    }

    const matches: TranslationMatch[] = [];
    const wordSection = this.koTranslations?.WATCHALL?.WORD || {};
    const enWordSection = this.enTranslations?.WATCHALL?.WORD || {};

    for (const koreanText of koreanTexts) {
      // 1. 먼저 전체 텍스트로 정확한 매칭 시도
      const exactMatch = this.findKeyByValue(wordSection, koreanText, 'WATCHALL.WORD');
      
      if (exactMatch) {
        const englishValue = this.getValueByPath(enWordSection, exactMatch.relativePath);
        
        matches.push({
          korean: koreanText,
          english: englishValue || '',
          keyPath: exactMatch.fullPath,
          confidence: this.calculateConfidence(koreanText, exactMatch.foundValue)
        });
      } else {
        // 2. 전체 매칭이 실패하면 공백으로 분리하여 개별 단어 매칭 시도
        const wordMatch = this.findWordCombinationMatch(koreanText, wordSection, enWordSection);
        if (wordMatch) {
          matches.push(wordMatch);
        }
      }
    }

    return matches;
  }

  /**
   * 공백으로 분리된 단어들을 개별 매칭하여 조합 키 생성
   */
  private findWordCombinationMatch(
    koreanText: string, 
    wordSection: any, 
    enWordSection: any
  ): TranslationMatch | null {
    // 공백으로 단어 분리
    const words = koreanText.split(' ').filter(word => word.trim().length > 0);
    
    // 단어가 하나뿐이면 개별 매칭 시도
    if (words.length === 1) {
      const match = this.findKeyByValue(wordSection, words[0], 'WATCHALL.WORD');
      if (match) {
        const englishValue = this.getValueByPath(enWordSection, match.relativePath);
        return {
          korean: koreanText,
          english: englishValue || '',
          keyPath: match.fullPath,
          confidence: this.calculateConfidence(koreanText, match.foundValue)
        };
      }
      return null;
    }

    // 여러 단어인 경우 개별 매칭 후 배열 형태로 키 생성
    const matchedWords: Array<{korean: string, keyPath: string, english: string}> = [];
    
    for (const word of words) {
      const match = this.findKeyByValue(wordSection, word, 'WATCHALL.WORD');
      if (match) {
        const englishValue = this.getValueByPath(enWordSection, match.relativePath);
        matchedWords.push({
          korean: word,
          keyPath: match.fullPath,
          english: englishValue || ''
        });
      }
    }

    // 모든 단어가 매칭되었으면 배열 형태 키 생성
    if (matchedWords.length === words.length) {
      const keyPaths = matchedWords.map(w => w.keyPath);
      const combinedEnglish = matchedWords.map(w => w.english).join(' ');
      
      return {
        korean: koreanText,
        english: combinedEnglish,
        keyPath: `[${keyPaths.join(', ')}]`, // 배열 형태로 키 표현
        confidence: 0.8 // 조합 매칭은 0.8 신뢰도
      };
    }

    // 부분 매칭된 경우도 처리
    if (matchedWords.length > 0) {
      const matchedKorean = matchedWords.map(w => w.korean).join(' ');
      const keyPaths = matchedWords.map(w => w.keyPath);
      const combinedEnglish = matchedWords.map(w => w.english).join(' ');
      
      return {
        korean: koreanText,
        english: `${combinedEnglish} (부분매칭: ${matchedKorean})`,
        keyPath: `[${keyPaths.join(', ')}] + [NEW_KEYS_NEEDED]`,
        confidence: 0.6 // 부분 매칭은 0.6 신뢰도
      };
    }

    return null;
  }

  /**
   * 객체에서 값으로 키 경로를 찾습니다
   */
  private findKeyByValue(
    obj: any, 
    targetValue: string, 
    currentPath: string = ''
  ): { fullPath: string; relativePath: string; foundValue: string } | null {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (typeof value === 'string') {
        if (this.isMatch(value, targetValue)) {
          return {
            fullPath: newPath,
            relativePath: key,
            foundValue: value
          };
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = this.findKeyByValue(value, targetValue, newPath);
        if (result) {
          return result;
        }
      }
    }
    
    return null;
  }

  /**
   * 경로로 값을 가져옵니다
   */
  private getValueByPath(obj: any, path: string): string {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return '';
      }
    }
    
    return typeof current === 'string' ? current : '';
  }

  /**
   * 두 문자열이 매칭되는지 확인
   */
  private isMatch(value: string, target: string): boolean {
    // 정확한 매치만 허용
    if (value === target) return true;
    
    // 공백 제거 후 매치
    if (value.replace(/\s/g, '') === target.replace(/\s/g, '')) return true;
    
    // 부분 매치는 공백 분리 매칭에서 처리하므로 여기서는 비활성화
    // if (target.length >= 3 && value.includes(target)) return true;
    // if (target.length >= 3 && target.includes(value)) return true;
    
    return false;
  }

  /**
   * 매칭 신뢰도 계산
   */
  private calculateConfidence(target: string, found: string): number {
    if (target === found) return 1.0;
    if (target.replace(/\s/g, '') === found.replace(/\s/g, '')) return 0.95;
    
    const longer = target.length > found.length ? target : found;
    const shorter = target.length > found.length ? found : target;
    
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }
    
    return 0.7; // 기본 부분 매치 신뢰도
  }

  /**
   * 사용 가능한 모든 번역 키 목록을 반환
   */
  getAvailableKeys(): string[] {
    const keys: string[] = [];
    
    const collectKeys = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'string') {
          keys.push(fullKey);
        } else if (typeof value === 'object' && value !== null) {
          collectKeys(value, fullKey);
        }
      }
    };
    
    if (this.koTranslations?.WATCHALL?.WORD) {
      collectKeys(this.koTranslations.WATCHALL.WORD, 'WATCHALL.WORD');
    }
    
    return keys;
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