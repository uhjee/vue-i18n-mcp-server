/**
 * MCP 도구 기본 클래스
 * 모든 도구들이 상속받는 추상 클래스
 */

import { ToolContext } from '../../types/index.js';
import path from 'path';

/**
 * MCP 도구 인터페이스
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  
  execute(args: any): Promise<any>;
  getDescription(): string;
  getInputSchema(): any;
  updateContext(context: ToolContext): void;
}

/**
 * 도구 기본 추상 클래스
 */
export abstract class BaseTool implements MCPTool {
  protected context: ToolContext;
  
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: any;

  constructor(context: ToolContext) {
    this.context = context;
  }

  /**
   * 도구 실행 (각 도구에서 구현)
   */
  abstract execute(args: any): Promise<any>;

  /**
   * 도구 설명 반환
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * 입력 스키마 반환
   */
  getInputSchema(): any {
    return this.inputSchema;
  }

  /**
   * 컨텍스트 업데이트
   */
  updateContext(context: ToolContext): void {
    this.context = context;
  }

  /**
   * 공통 유틸리티: 현재 파일 경로 해결
   */
  protected resolveFilePath(filePath?: string): string {
    if (filePath) {
      // 절대 경로인지 확인 (Windows와 Unix 모두 지원)
      if (path.isAbsolute(filePath)) {
        return filePath;
      }
      // 상대 경로를 절대 경로로 변환
      return path.join(this.context.projectRoot, filePath);
    }

    // filePath가 없으면 현재 파일 사용
    if (this.context.currentFile) {
      return this.context.currentFile;
    }

    throw new Error('파일 경로가 지정되지 않았고 현재 파일도 확인할 수 없습니다.');
  }

  /**
   * 공통 유틸리티: 에러 형식화
   */
  protected formatError(error: unknown, context: string): string {
    const message = error instanceof Error ? error.message : String(error);
    return `${context} 중 오류 발생: ${message}`;
  }

  /**
   * 공통 유틸리티: 성공 메시지 형식화
   */
  protected formatSuccess(message: string, details?: any): any {
    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    };
  }

  /**
   * 공통 유틸리티: 유효성 검사
   */
  protected validateArgs(args: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!(field in args) || args[field] === undefined || args[field] === null) {
        throw new Error(`필수 인자가 누락되었습니다: ${field}`);
      }
    }
  }

  /**
   * 공통 유틸리티: 안전한 JSON 파싱
   */
  protected safeJsonParse(jsonString: string, defaultValue: any = null): any {
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 공통 유틸리티: 파일 존재 확인
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs-extra');
      return await fs.pathExists(filePath);
    } catch {
      return false;
    }
  }

  /**
   * 공통 유틸리티: 진행률 표시용 로그
   */
  protected logProgress(step: string, current: number, total: number): void {
    const percentage = Math.round((current / total) * 100);
    console.error(`[${this.name}] ${step}: ${current}/${total} (${percentage}%)`);
  }
}