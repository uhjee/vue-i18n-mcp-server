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
    text: string;
    location: {
        section: 'template' | 'script';
        line: number;
        column: number;
    };
    context: {
        elementType?: string;
        attributeType?: string;
        variableContext?: string;
    };
}
/**
 * JS/TS 파일 한글 추출 결과 (RFP 2단계)
 */
export interface JSKoreanExtraction {
    text: string;
    location: {
        line: number;
        column: number;
        function?: string;
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
    text: string;
    location: {
        file: string;
        line: number;
        column: number;
        section: 'template' | 'script' | 'style';
    };
    context: {
        type: 'ui-label' | 'button-text' | 'error-message' | 'placeholder' | 'title' | 'description';
        component?: string;
        element?: string;
        attribute?: string;
    };
    priority: 'high' | 'medium' | 'low';
    confidence: number;
}
/**
 * 번역 결과
 */
export interface TranslationResult {
    original: string;
    translation: string;
    key: string;
    confidence: number;
    alternatives: TranslationOption[];
    context: {
        domain: 'ui' | 'business' | 'technical' | 'message';
        tone: 'formal' | 'casual' | 'professional';
        usage: string;
    };
    keyConflict?: KeyConflict;
}
/**
 * 번역 대안 옵션
 */
export interface TranslationOption {
    translation: string;
    key: string;
    score: number;
    reason: string;
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
    warnings: string[];
    recommendations: string[];
}
/**
 * 파일 변경 정보
 */
export interface FileChange {
    filePath: string;
    changeType: 'vue-update' | 'lang-add';
    originalContent: string;
    modifiedContent: string;
    diff: string;
    changeCount: number;
    preview: string;
}
/**
 * 배치 처리 설정
 */
export interface BatchProcessConfig {
    filePattern: string;
    excludePattern: string;
    maxFiles: number;
    concurrency: number;
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
//# sourceMappingURL=index.d.ts.map