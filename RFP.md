# Vue.js 다국어 자동화 MCP 서버 RFP (수정판)
*단계별 구현 중심의 체계적 개발 계획*

## 1. 프로젝트 개요

### 1.1 프로젝트명
**Vue.js I18n Key Replacement MCP Server**

### 1.2 프로젝트 목적
GitHub Copilot Agent Mode를 통해 전달받은 Vue/JS 파일 컨텍스트에서 한글 텍스트를 자동으로 감지하고, 기존 다국어 키로 대체하는 MCP 서버 개발

### 1.3 핵심 기능 범위
- **한글 패턴 스캔**: Vue 템플릿/스크립트, JS/TS 파일의 한글 텍스트 추출
- **기존 번역 매칭**: ko.js, en.js 파일에서 일치하는 번역 키 검색
- **자동 코드 대체**: 한글 텍스트를 해당 i18n 키로 치환
- **미매칭 항목 리포트**: 기존 번역이 없는 한글 텍스트 별도 안내

### 1.4 개발 접근 방식
- **단계별 점진적 구현**: 각 단계별 완전한 기능 구현 및 테스트
- **MCP 표준 준수**: GitHub Copilot Agent Mode 완전 호환
- **컨텍스트 기반 처리**: Agent Mode에서 전달받은 파일 컨텍스트 활용

## 2. 기술 아키텍처

### 2.1 시스템 구조
```
┌─────────────────────────────────────────────────────────────┐
│             GitHub Copilot Agent Mode (VSCode)              │
│                    파일 컨텍스트 전달                         │
└─────────────────────────────────┬───────────────────────────┘
                                  │ MCP Protocol
┌─────────────────────────────────▼───────────────────────────┐
│              Vue I18n Key Replacement MCP Server            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────┐ │
│  │   Pattern   │  │ Translation │  │ Code        │  │Report│ │
│  │   Scanner   │→ │   Matcher   │→ │ Replacer    │→ │Gen.  │ │
│  │   Engine    │  │   Service   │  │   Service   │  │      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┘ │
└─────────────────────────────────┬───────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────┐
│                    Language Files                           │
│              ko.js / en.js (JSON 형태)                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 기술 스택
- **MCP Server**: TypeScript + @modelcontextprotocol/sdk
- **Parser**: @vue/compiler-sfc + @babel/parser
- **File Processing**: fs-extra, path
- **Integration**: GitHub Copilot Agent Mode

## 3. 단계별 구현 계획

## 단계 1: MCP 서버 기반 구현

### 3.1 주요 기능
- **MCP 서버 기본 구조** 구축
- **Agent Mode 연동** 설정
- **기본 도구 등록** 및 스키마 정의

### 3.2 구현 세부사항

#### 3.2.1 MCP 서버 핵심 구조
```typescript
// 필수 구현 사항
- Server 클래스 구현 (@modelcontextprotocol/sdk 기반)
- 환경변수 처리 (PROJECT_ROOT, LANG_FILES_PATH 등)
- 도구 등록 시스템 (ListToolsRequestSchema, CallToolRequestSchema)
- 에러 처리 및 로깅 시스템
```

#### 3.2.2 MCP 도구 정의
```typescript
// 단계 1에서 구현할 도구
1. process-korean-replacement: 메인 처리 도구
   - 입력: 파일 컨텍스트 (파일명, 내용)
   - 출력: 대체된 코드 + 미매칭 리포트
```

#### 3.2.3 프로젝트 구조 설정
```
vue-i18n-mcp-server/
├── src/
│   ├── index.ts                    # MCP 서버 진입점
│   ├── server/
│   │   ├── mcp-server.ts           # 메인 MCP 서버 클래스
│   │   └── tools/
│   │       └── process-korean-replacement.ts  # 메인 처리 도구
│   ├── services/                   # 각 단계별 서비스들
│   │   ├── pattern-scanner.ts     # 단계 2 구현
│   │   ├── translation-matcher.ts # 단계 3 구현
│   │   └── code-replacer.ts       # 단계 4 구현
│   ├── types/
│   │   └── index.ts                # 타입 정의
│   └── utils/
│       └── file-utils.ts           # 파일 처리 유틸
├── templates/
│   └── mcp.json                    # MCP 설정 템플릿
└── tests/
    └── unit/                       # 단위 테스트
```

### 3.3 테스트 계획

#### 3.3.1 단위 테스트
```typescript
// 테스트 대상
- MCP 서버 초기화 및 종료
- 도구 등록 및 스키마 검증
- 환경변수 로딩 검증
- 기본 에러 처리 검증
```

#### 3.3.2 통합 테스트
```typescript
// VSCode Agent Mode 연동 테스트
- .vscode/mcp.json 설정 동작 확인
- Agent Mode에서 서버 시작/중지
- 도구 목록 표시 확인
- 기본 도구 호출 테스트 (더미 데이터)
```

---

## 단계 2: 패턴 스캔 엔진 구현

### 3.4 주요 기능
- **Vue 파일 파싱**: `<template>`, `<script>` 섹션별 한글 추출
- **JS/TS 파일 파싱**: 문자열 리터럴의 한글 추출
- **주석 제외 로직**: 모든 주석 내용 필터링

### 3.5 구현 세부사항

#### 3.5.1 Vue 파일 한글 추출
```typescript
interface VueKoreanExtraction {
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

// 구현 요구사항
1. @vue/compiler-sfc를 사용한 SFC 파싱
2. template 섹션: HTML 텍스트 노드 및 속성값에서 한글 추출
3. script 섹션: AST 파싱으로 문자열 리터럴 한글 추출
4. 주석 완전 제외 (<!-- -->, //, /* */)
5. 중복 제거 및 정규화
```

#### 3.5.2 JS/TS 파일 한글 추출
```typescript
interface JSKoreanExtraction {
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

// 구현 요구사항
1. @babel/parser를 사용한 AST 파싱
2. StringLiteral, TemplateLiteral 노드에서 한글 추출
3. 주석 완전 제외 (//, /* */, JSDoc)
4. 정규식을 통한 한글 패턴 매칭 (/[가-힣]+/)
5. 컨텍스트 정보 수집 (변수명, 객체 키 등)
```

#### 3.5.3 한글 패턴 정의
```typescript
// 한글 추출 규칙
1. 순수 한글: "안녕하세요", "로그인"
2. 한글+공백: "회원 가입", "비밀번호 찾기"  
3. 한글+숫자: "1단계", "2번째"
4. 한글+기본 특수문자: "안녕하세요!", "로그인?"
5. 제외 패턴: 영문 포함, URL, 이메일, 파일명 등
```

### 3.6 테스트 계획

#### 3.6.1 단위 테스트
```typescript
// Vue 파일 테스트 케이스
1. 기본 template 텍스트 추출
2. v-bind 속성값 추출  
3. script 데이터 프로퍼티 추출
4. 주석 제외 검증
5. 중복 제거 검증

// JS/TS 파일 테스트 케이스
1. 문자열 리터럴 추출
2. 템플릿 리터럴 추출
3. 객체 프로퍼티 값 추출
4. 함수 인자 추출
5. 주석 제외 검증
```

#### 3.6.2 통합 테스트
```typescript
// 실제 파일 테스트
1. 복합 Vue 컴포넌트 파일 처리
2. TypeScript 파일 처리
3. 대용량 파일 처리 성능
4. Agent Mode에서 실제 파일 컨텍스트 처리
```

---

## 단계 3: 기존 번역 매칭 시스템

### 3.7 주요 기능
- **언어 파일 로딩**: ko.js, en.js 파일 파싱
- **한글-키 매칭**: 추출된 한글과 기존 번역 매칭
- **매칭 결과 분류**: 매칭 성공/실패 항목 분리

### 3.8 구현 세부사항

#### 3.8.1 언어 파일 파싱
```typescript
interface LanguageData {
  [key: string]: string;           // key: 번역문
}

interface LanguageFileInfo {
  koData: LanguageData;            // ko.js 데이터
  enData: LanguageData;            // en.js 데이터
  filePaths: {
    ko: string;
    en: string;
  };
  isValid: boolean;                // 파일 유효성
  errors: string[];                // 파싱 오류들
}

// 구현 요구사항
1. CommonJS/ES Module 형태 지원 (export default)
2. JSON 형태 객체 파싱
3. 파일 존재 여부 및 접근 권한 확인
4. 파싱 오류 처리 및 상세 에러 메시지
5. 실시간 파일 변경 감지 (선택적)
```

#### 3.8.2 매칭 알고리즘
```typescript
interface MatchingResult {
  exactMatches: Array<{
    korean: string;
    key: string;
    confidence: number;
  }>;
  noMatches: Array<{
    korean: string;
    suggestions?: string[];        // 유사한 키 제안
  }>;
  conflicts: Array<{               // 동일한 번역에 여러 키
    korean: string;
    keys: string[];
  }>;
}

// 매칭 로직
1. 정확 매칭: ko.js 값과 정확히 일치
2. 정규화 매칭: 공백, 특수문자 제거 후 비교
3. 유사도 매칭: 편집 거리 기반 유사 항목 제안
4. 중복 처리: 동일한 번역에 여러 키가 있는 경우
```

#### 3.8.3 매칭 최적화
```typescript
// 성능 최적화 방안
1. 인덱싱: 번역 텍스트 기반 해시맵 생성
2. 캐싱: 파일 변경 시에만 다시 로딩
3. 정규화: 매칭 전 텍스트 정규화 수행
4. 배치 처리: 여러 한글 텍스트 동시 매칭
```

### 3.9 테스트 계획

#### 3.9.1 단위 테스트
```typescript
// 언어 파일 파싱 테스트
1. 정상적인 ko.js, en.js 파일 파싱
2. 파일 없음 오류 처리
3. 잘못된 형식 파일 처리
4. 권한 없음 오류 처리

// 매칭 알고리즘 테스트
1. 정확 매칭 케이스
2. 정규화 매칭 케이스
3. 매칭 실패 케이스
4. 중복 키 처리 케이스
```

#### 3.9.2 통합 테스트
```typescript
// 실제 프로젝트 구조 테스트
1. 다양한 언어 파일 구조 지원
2. 대용량 번역 데이터 처리
3. Agent Mode에서 실제 프로젝트 매칭
```

---

## 단계 4: 코드 자동 대체 시스템

### 3.10 주요 기능
- **한글 텍스트 대체**: 매칭된 키로 한글 텍스트 교체
- **i18n 함수 적용**: Vue/JS 맞춤형 국제화 함수 적용
- **미매칭 항목 리포트**: 대체되지 않은 한글 텍스트 안내

### 3.11 구현 세부사항

#### 3.11.1 Vue 파일 코드 대체
```typescript
interface VueReplacement {
  original: string;                // 원본 코드
  modified: string;                // 수정된 코드
  changes: Array<{
    location: { line: number; column: number; };
    original: string;              // 원본 한글
    replacement: string;           // 대체 코드
    key: string;                   // 사용된 키
  }>;
}

// Vue 파일 대체 규칙
1. Template 섹션:
   - 텍스트 노드: "한글" → "{{ $t('key') }}"
   - 속성값: :title="'한글'" → :title="$t('key')"
   - v-bind: v-bind:placeholder="'한글'" → v-bind:placeholder="$t('key')"

2. Script 섹션:
   - 문자열 리터럴: "한글" → this.$t('key')
   - 객체 프로퍼티: { msg: "한글" } → { msg: this.$t('key') }
```

#### 3.11.2 JS/TS 파일 코드 대체
```typescript
interface JSReplacement {
  original: string;
  modified: string;
  changes: Array<{
    location: { line: number; column: number; };
    original: string;
    replacement: string;
    key: string;
    context: 'variable' | 'object' | 'function-arg';
  }>;
}

// JS/TS 파일 대체 규칙
1. 문자열 리터럴: "한글" → i18n.t('key')
2. 객체 프로퍼티: { title: "한글" } → { title: i18n.t('key') }
3. 함수 인자: alert("한글") → alert(i18n.t('key'))
4. 템플릿 리터럴: `제목: ${title}` → `${i18n.t('title')}: ${title}`
```

#### 3.11.3 안전한 코드 수정
```typescript
// 코드 수정 안전장치
1. AST 기반 수정: 문자열 직접 치환이 아닌 AST 노드 수정
2. 백업 생성: 원본 코드 보존
3. 구문 검증: 수정 후 구문 오류 확인
4. 선택적 적용: 사용자 확인 후 적용
```

### 3.12 미매칭 항목 리포트

#### 3.12.1 리포트 구조
```typescript
interface UnmatchedReport {
  summary: {
    totalKorean: number;           // 전체 한글 텍스트 수
    matched: number;               // 매칭 성공 수
    unmatched: number;             // 매칭 실패 수
    replacementRate: number;       // 대체율 (%)
  };
  unmatchedItems: Array<{
    text: string;                  // 매칭되지 않은 한글
    locations: Array<{
      file: string;
      line: number;
      context: string;
    }>;
    suggestions: string[];         // 유사한 기존 키 제안
  }>;
  recommendations: string[];       // 다음 단계 추천사항
}
```

#### 3.12.2 사용자 인터페이스
```typescript
// Agent Mode에서 표시할 정보
1. 성공 메시지: "N개 한글 텍스트가 기존 키로 대체되었습니다"
2. 대체된 코드: 수정 전/후 diff 표시
3. 미매칭 항목: "다음 N개 항목은 기존 번역이 없습니다"
4. 다음 단계 안내: "번역 API를 통한 자동 번역을 원하시면..."
```

### 3.13 테스트 계획

#### 3.13.1 단위 테스트
```typescript
// 코드 대체 테스트
1. Vue template 텍스트 대체
2. Vue script 문자열 대체
3. JS 문자열 리터럴 대체
4. 복잡한 표현식 내 대체
5. 대체 불가능한 케이스 처리

// 리포트 생성 테스트
1. 매칭 성공률 계산
2. 미매칭 항목 분류
3. 제안 사항 생성
```

#### 3.13.2 통합 테스트
```typescript
// End-to-End 테스트
1. 전체 워크플로우: 스캔 → 매칭 → 대체 → 리포트
2. 실제 Vue 프로젝트 처리
3. Agent Mode에서 완전한 시나리오 테스트
4. 다양한 파일 형식 및 구조 테스트
```

---

## 4. 전체 통합 및 최적화

### 4.1 성능 최적화
```typescript
// 최적화 대상
1. 파일 파싱 성능: 큰 파일 처리 최적화
2. 매칭 알고리즘: 인덱싱 및 캐싱 활용
3. 메모리 사용량: 대용량 코드 처리 시 메모리 관리
4. Agent Mode 응답 속도: 사용자 경험 개선
```

### 4.2 에러 처리 강화
```typescript
// 에러 처리 시나리오
1. 파일 접근 오류: 권한, 경로 문제
2. 파싱 오류: 잘못된 구문, 인코딩 문제
3. 매칭 오류: 언어 파일 손상, 형식 불일치
4. 대체 오류: 구문 오류 발생, 백업 실패
```

### 4.3 사용자 경험 개선
```typescript
// UX 개선 사항
1. 진행률 표시: 대용량 파일 처리 시 진행 상황
2. 상세한 피드백: 각 단계별 결과 명확히 표시
3. 선택적 적용: 사용자가 대체 여부 결정
4. 실행 취소: Agent Mode 표준 undo 지원
```

---

## 5. 테스트 전략

### 5.1 테스트 환경 구성
```bash
# 테스트 프로젝트 구조
test-projects/
├── simple-vue/                    # 기본 Vue 컴포넌트
├── complex-vue/                   # 복잡한 Vue 애플리케이션
├── typescript-project/            # TypeScript 프로젝트
├── mixed-project/                 # Vue + JS 혼합
└── edge-cases/                    # 엣지 케이스들
```

### 5.2 단계별 테스트 검증
```typescript
// 각 단계 완료 기준
단계 1 완료: MCP 서버 기본 동작 + Agent Mode 연동
단계 2 완료: 한글 패턴 정확 추출 + 주석 제외
단계 3 완료: 기존 번역 정확 매칭 + 오류 처리
단계 4 완료: 코드 안전 대체 + 리포트 생성
```

### 5.3 품질 보증
```typescript
// 품질 기준
1. 코드 커버리지: 90% 이상
2. 타입 안전성: TypeScript strict 모드
3. 성능: 1000줄 파일 3초 이내 처리
4. 안정성: 백업 및 복구 시스템 완비
```

---
