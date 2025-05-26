/**
 * 파일 업데이트 서비스
 * ko.js, en.js 번역 파일에 새로운 키를 추가하고 관리
 */

import fs from 'fs-extra';
import path from 'path';
import { MCPServerConfig } from '../types/index.js';
import { TranslationAnalysis } from './key-generator.js';

export interface TranslationUpdate {
  keyName: string;
  korean: string;
  english: {
    N?: string;
    V?: string;
  };
  partOfSpeech: 'N' | 'V';
  isArrayKey?: boolean;
  arrayKey?: string[];
}

export interface UpdateResult {
  success: boolean;
  updatedKeys: string[];
  errors: string[];
  backupPath?: string;
}

export interface FileInsertionPoint {
  line: number;
  column: number;
  indent: string;
}

/**
 * 번역 파일 업데이트 서비스
 */
export class FileUpdaterService {
  private config: MCPServerConfig;
  private backupDir: string;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.backupDir = path.join(config.projectRoot, '.translation-backups');
  }

  /**
   * 새로운 번역 키들을 파일에 추가
   */
  async addTranslationKeys(analyses: TranslationAnalysis[]): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      updatedKeys: [],
      errors: []
    };

    try {
      // 백업 생성
      result.backupPath = await this.createBackup();

      // 각 분석 결과를 업데이트로 변환
      const updates: TranslationUpdate[] = analyses.map(analysis => 
        this.analysisToUpdate(analysis)
      );

      // 파일 업데이트 실행
      for (const update of updates) {
        try {
          await this.insertSingleTranslation(update);
          result.updatedKeys.push(update.keyName);
        } catch (error) {
          result.errors.push(`${update.keyName}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`전체 업데이트 실패: ${error}`);
    }

    return result;
  }

  /**
   * 단일 번역 키 삽입
   */
  async insertSingleTranslation(update: TranslationUpdate): Promise<void> {
    // 배열 키인 경우 특별 처리
    if (update.isArrayKey && update.arrayKey) {
      await this.insertArrayKey(update);
      return;
    }

    // 일반 키 삽입
    await this.insertRegularKey(update);
  }

  /**
   * 일반 키 삽입
   */
  private async insertRegularKey(update: TranslationUpdate): Promise<void> {
    // ko.js 업데이트
    await this.updateKoreanFile(update);
    
    // en.js 업데이트
    await this.updateEnglishFile(update);
  }

  /**
   * 배열 키 삽입 (특수문자 케이스)
   */
  private async insertArrayKey(update: TranslationUpdate): Promise<void> {
    // 배열 키는 ko.js에만 추가하고, en.js에는 개별 키들을 확인
    const koContent = await fs.readFile(this.config.langFilePath.ko, 'utf8');
    const updatedKo = this.insertArrayKeyIntoContent(koContent, update);
    await fs.writeFile(this.config.langFilePath.ko, updatedKo);

    // en.js에 필요한 개별 키들 추가
    if (update.arrayKey) {
      for (const keyPart of update.arrayKey) {
        if (keyPart.startsWith('WATCHALL.WORD.')) {
          const individualKey = keyPart.replace('WATCHALL.WORD.', '');
          // 개별 키가 존재하지 않으면 추가
          await this.ensureIndividualKeyExists(individualKey);
        }
      }
    }
  }

  /**
   * 한국어 파일 업데이트
   */
  private async updateKoreanFile(update: TranslationUpdate): Promise<void> {
    const filePath = this.config.langFilePath.ko;
    const content = await fs.readFile(filePath, 'utf8');
    
    const insertionPoint = this.findWatchallWordInsertionPoint(content);
    const newEntry = this.formatKoreanEntry(update);
    
    const updatedContent = this.insertAtPoint(content, insertionPoint, newEntry);
    await fs.writeFile(filePath, updatedContent);
  }

  /**
   * 영어 파일 업데이트
   */
  private async updateEnglishFile(update: TranslationUpdate): Promise<void> {
    const filePath = this.config.langFilePath.en;
    const content = await fs.readFile(filePath, 'utf8');
    
    const insertionPoint = this.findWatchallWordInsertionPoint(content);
    const newEntry = this.formatEnglishEntry(update);
    
    const updatedContent = this.insertAtPoint(content, insertionPoint, newEntry);
    await fs.writeFile(filePath, updatedContent);
  }

  /**
   * WATCHALL.WORD 섹션의 삽입 위치 찾기
   */
  private findWatchallWordInsertionPoint(content: string): FileInsertionPoint {
    const lines = content.split('\n');
    let watchallStartLine = -1;
    let wordStartLine = -1;
    let wordEndLine = -1;
    let braceDepth = 0;
    let wordSectionDepth = -1;

    // WATCHALL.WORD 섹션 찾기
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // WATCHALL 시작 찾기
      if (line.includes('WATCHALL:') && watchallStartLine === -1) {
        watchallStartLine = i;
        braceDepth = 0;
        continue;
      }

      // WATCHALL 섹션 내에서 브레이스 깊이 추적
      if (watchallStartLine !== -1) {
        // 열린 브레이스 카운트
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        braceDepth += openBraces - closeBraces;

        // WORD 시작 찾기
        if (line.includes('WORD:') && wordStartLine === -1) {
          wordStartLine = i;
          wordSectionDepth = braceDepth;
          continue;
        }

        // WORD 섹션 내에서 끝 찾기
        if (wordStartLine !== -1 && wordSectionDepth !== -1) {
          // WORD 섹션이 끝나는 조건: 브레이스 깊이가 WORD 시작 시점보다 낮아지는 경우
          if (braceDepth < wordSectionDepth) {
            wordEndLine = i - 1; // 이전 라인이 WORD 섹션의 마지막
            break;
          }
        }
      }
    }

    if (wordStartLine === -1) {
      throw new Error('WATCHALL.WORD 섹션을 찾을 수 없습니다');
    }

    if (wordEndLine === -1) {
      // WORD 섹션의 끝을 찾지 못한 경우, 파일 끝에서 찾기
      for (let i = lines.length - 1; i >= wordStartLine; i--) {
        if (lines[i].trim().includes('}')) {
          wordEndLine = i - 1;
          break;
        }
      }
    }

    // WORD 섹션 내 마지막 키 찾기 (더 정확한 방법)
    let lastKeyLine = wordStartLine;
    let indentLevel = '      '; // WORD 섹션 내부의 기본 들여쓰기
    
    for (let i = wordStartLine + 1; i < wordEndLine; i++) {
      const line = lines[i];
      
      // WORD 섹션 내의 키 패턴 찾기 (들여쓰기 + 대문자_언더스코어 키 + 콜론)
      const keyMatch = line.match(/^(\s+)([A-Z][A-Z0-9_]*)\s*:\s*/);
      if (keyMatch) {
        lastKeyLine = i;
        indentLevel = keyMatch[1]; // 기존 키와 같은 들여쓰기 사용
      }
    }

    return {
      line: lastKeyLine,
      column: 0,
      indent: indentLevel
    };
  }

  /**
   * 한국어 엔트리 포맷
   */
  private formatKoreanEntry(update: TranslationUpdate): string {
    return `    ${update.keyName}: '${update.korean}',`;
  }

  /**
   * 영어 엔트리 포맷
   */
  private formatEnglishEntry(update: TranslationUpdate): string {
    const { keyName, english, partOfSpeech } = update;
    
    if (partOfSpeech === 'N' && english.N) {
      return `    ${keyName}: {\n      N: '${english.N}'\n    },`;
    } else if (partOfSpeech === 'V' && english.V) {
      return `    ${keyName}: {\n      V: '${english.V}'\n    },`;
    } else {
      // 기본값으로 명사 처리
      const defaultValue = english.N || english.V || update.korean;
      return `    ${keyName}: {\n      N: '${defaultValue}'\n    },`;
    }
  }

  /**
   * 배열 키를 내용에 삽입
   */
  private insertArrayKeyIntoContent(content: string, update: TranslationUpdate): string {
    if (!update.arrayKey) return content;

    const insertionPoint = this.findWatchallWordInsertionPoint(content);
    const arrayKeyString = `[${update.arrayKey.join(', ')}]`;
    const newEntry = `    ${update.keyName}: ${arrayKeyString},`;
    
    return this.insertAtPoint(content, insertionPoint, newEntry);
  }

  /**
   * 지정된 위치에 텍스트 삽입
   */
  private insertAtPoint(content: string, point: FileInsertionPoint, newEntry: string): string {
    const lines = content.split('\n');
    
    // 삽입할 위치에 새 엔트리 추가
    lines.splice(point.line + 1, 0, newEntry);
    
    return lines.join('\n');
  }

  /**
   * 개별 키 존재 확인 및 추가
   */
  private async ensureIndividualKeyExists(keyName: string): Promise<void> {
    const enContent = await fs.readFile(this.config.langFilePath.en, 'utf8');
    
    // 키가 이미 존재하는지 확인
    if (enContent.includes(`${keyName}:`)) {
      return; // 이미 존재함
    }

    // 키 추가 (기본값으로 키 이름 사용)
    const update: TranslationUpdate = {
      keyName,
      korean: keyName,
      english: { N: keyName },
      partOfSpeech: 'N'
    };

    await this.updateEnglishFile(update);
  }

  /**
   * TranslationAnalysis를 TranslationUpdate로 변환
   */
  private analysisToUpdate(analysis: TranslationAnalysis): TranslationUpdate {
    const bestOption = analysis.keyOptions[0]; // 첫 번째 옵션 사용
    
    return {
      keyName: bestOption?.keyName || 'UNKNOWN_KEY',
      korean: analysis.korean,
      english: analysis.english,
      partOfSpeech: analysis.partOfSpeech,
      isArrayKey: analysis.isSpecialCharacter,
      arrayKey: analysis.arrayKey
    };
  }

  /**
   * 백업 생성
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
    
    await fs.ensureDir(backupPath);

    // ko.js 백업
    if (await fs.pathExists(this.config.langFilePath.ko)) {
      await fs.copy(
        this.config.langFilePath.ko, 
        path.join(backupPath, 'ko.js')
      );
    }

    // en.js 백업
    if (await fs.pathExists(this.config.langFilePath.en)) {
      await fs.copy(
        this.config.langFilePath.en, 
        path.join(backupPath, 'en.js')
      );
    }

    return backupPath;
  }

  /**
   * 백업 복원
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    const koBackup = path.join(backupPath, 'ko.js');
    const enBackup = path.join(backupPath, 'en.js');

    if (await fs.pathExists(koBackup)) {
      await fs.copy(koBackup, this.config.langFilePath.ko);
    }

    if (await fs.pathExists(enBackup)) {
      await fs.copy(enBackup, this.config.langFilePath.en);
    }
  }

  /**
   * 파일 구조 검증
   */
  async validateFileStructure(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // ko.js 검증
    try {
      const koContent = await fs.readFile(this.config.langFilePath.ko, 'utf8');
      if (!koContent.includes('WATCHALL') || !koContent.includes('WORD')) {
        errors.push('ko.js에 WATCHALL.WORD 구조가 없습니다');
      }
    } catch (error) {
      errors.push(`ko.js 읽기 오류: ${error}`);
    }

    // en.js 검증
    try {
      const enContent = await fs.readFile(this.config.langFilePath.en, 'utf8');
      if (!enContent.includes('WATCHALL') || !enContent.includes('WORD')) {
        errors.push('en.js에 WATCHALL.WORD 구조가 없습니다');
      }
    } catch (error) {
      errors.push(`en.js 읽기 오류: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 백업 목록 조회
   */
  async listBackups(): Promise<string[]> {
    if (!(await fs.pathExists(this.backupDir))) {
      return [];
    }

    const items = await fs.readdir(this.backupDir);
    return items
      .filter(item => item.startsWith('backup-'))
      .sort()
      .reverse(); // 최신 순
  }

  /**
   * 오래된 백업 정리
   */
  async cleanupOldBackups(keepCount: number = 10): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        const backupPath = path.join(this.backupDir, backup);
        await fs.remove(backupPath);
      }
    }
  }
} 