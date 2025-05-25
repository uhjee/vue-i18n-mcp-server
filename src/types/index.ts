/**
 * Vue I18n MCP Server - 핵심 타입 정의
 */

/**
 * MCP 서버 설정
 */
export interface MCPServerConfig {
  projectRoot: string;
  langFilePath: {
    ko: string;
    en: string;
  };
}

/**
 * Vue 파일 한글 추출 결과 (RFP 2단계)
 */
export interface VueKoreanExtraction {
  text: string;                    // 추출된 한글 텍스트
  location: {
    section: 'template' | 'script';
    line: number;
    column: number;
  };
  context: {
    elementType?: string;          // div, button, span 등
    attributeType?: string;        // title, placeholder 등
    variableContext?: string;      // data, computed, methods 등
  };
}

/**
 * JS/TS 파일 한글 추출 결과 (RFP 2단계)
 */
export interface JSKoreanExtraction {
  text: string;                    // 추출된 한글 텍스트
  location: {
    line: number;
    column: number;
    function?: string;             // 함수명 컨텍스트
  };
  context: {
    literalType: 'string' | 'template';
    variableName?: string;
    objectKey?: string;
  };
}

/**
 * 한글 텍스트 추출 결과
 */
export interface KoreanTextExtraction {
  text: string;                    // 추출된 한글 텍스트
  location: {
    file: string;                  // 파일 경로
    line: number;                  // 라인 번호
    column: number;                // 컬럼 위치
    section: 'template' | 'script' | 'style';
  };
  context: {
    type: 'ui-label' | 'button-text' | 'error-message' | 'placeholder' | 'title' | 'description';
    component?: string;            // 상위 컴포넌트명
    element?: string;              // HTML 엘리먼트 타입
    attribute?: string;            // 속성명 (v-bind:title 등)
  };
  priority: 'high' | 'medium' | 'low';
  confidence: number;              // 추출 신뢰도 (0-1)
}

/**
 * 번역 결과
 */
export interface TranslationResult {
  original: string;                // 원본 한글
  translation: string;             // 번역된 영문
  key: string;                     // 생성된 스네이크 케이스 키
  confidence: number;              // 번역 신뢰도 (0-1)
  alternatives: TranslationOption[];
  context: {
    domain: 'ui' | 'business' | 'technical' | 'message';
    tone: 'formal' | 'casual' | 'professional';
    usage: string;                 // 사용 맥락 설명
  };
  keyConflict?: KeyConflict;       // 키 충돌 정보
}

/**
 * 번역 대안 옵션
 */
export interface TranslationOption {
  translation: string;
  key: string;
  score: number;                   // 품질 점수 (0-1)
  reason: string;                  // 선택 이유
}

/**
 * 키 충돌 정보
 */
export interface KeyConflict {
  existingKey: string;
  existingValue: string;
  conflictType: 'duplicate_key' | 'similar_meaning' | 'same_translation';
  resolution: 'reuse' | 'create_variant' | 'manual' | 'merge';
  suggestedKey?: string;
}

/**
 * 언어 파일 엔트리
 */
export interface LangEntry {
  key: string;
  korean: string;
  english: string;
  context?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 파일 변경사항 미리보기
 */
export interface ChangePreview {
  summary: {
    totalFiles: number;
    totalTranslations: number;
    newKeys: number;
    conflicts: number;
    estimatedTime: string;
  };
  fileChanges: FileChange[];
  warnings: string[];              // 주의사항
  recommendations: string[];       // AI 추천사항
}

/**
 * 파일 변경 정보
 */
export interface FileChange {
  filePath: string;
  changeType: 'vue-update' | 'lang-add';
  originalContent: string;
  modifiedContent: string;
  diff: string;                    // Unified diff format
  changeCount: number;
  preview: string;                 // 주요 변경사항 요약
}

/**
 * 배치 처리 설정
 */
export interface BatchProcessConfig {
  filePattern: string;             // 처리할 파일 패턴
  excludePattern: string;          // 제외할 파일 패턴
  maxFiles: number;                // 최대 처리 파일 수
  concurrency: number;             // 동시 처리 수
}

/**
 * 배치 처리 결과
 */
export interface BatchProcessResult {
  processedFiles: number;
  totalTranslations: number;
  errors: ProcessError[];
  summary: {
    byFileType: Record<string, number>;
    byStatus: Record<'success' | 'warning' | 'error', number>;
  };
}

/**
 * 처리 오류 정보
 */
export interface ProcessError {
  filePath: string;
  error: string;
  severity: 'warning' | 'error';
  suggestion?: string;
}

/**
 * MCP 도구 실행 컨텍스트
 */
export interface ToolContext {
  projectRoot: string;
  currentFile?: string;
  workspaceFiles: string[];
  config: MCPServerConfig;
}

/**
 * 분석 결과
 */
export interface AnalysisResult {
  totalPatterns: number;
  byPriority: Record<'high' | 'medium' | 'low', number>;
  byContext: Record<string, number>;
  existingTranslations: number;
  conflicts: KeyConflict[];
  suggestions: string[];
}