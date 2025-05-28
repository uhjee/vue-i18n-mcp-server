# 테스트 파일 가이드

이 디렉토리는 Vue.js i18n MCP 서버의 테스트 파일들을 포함합니다.

## 📋 테스트 파일 목록

### 🎯 **핵심 기능 테스트**

#### `test-sentence-auto-decomposition.mjs`
- **목적**: 문장 자동 판별 및 개별 단어 분해 기능 테스트
- **기능**: 
  - 문장이 아닌 텍스트 자동 개별 단어 분해
  - 문장인 텍스트 전체 유지
  - 강제 분해 모드와 자동 모드 비교
- **실행**: `node tests/test-sentence-auto-decomposition.mjs`
- **상태**: ✅ 최신 (사용자 요구사항 완전 구현)

#### `performance-test.mjs`
- **목적**: 시스템 성능 및 처리 속도 테스트
- **기능**:
  - 대용량 파일 처리 성능 측정
  - 메모리 사용량 모니터링
  - 처리 시간 벤치마크
- **실행**: `node tests/performance-test.mjs`
- **상태**: ✅ 활성

#### `test-comprehensive-i18n.js`
- **목적**: 종합적인 i18n 기능 테스트
- **기능**: 전체 시스템 통합 테스트
- **실행**: `node tests/test-comprehensive-i18n.js`
- **상태**: ✅ 활성

### 📁 **샘플 파일**

#### `sample-files/`
- **목적**: 테스트용 샘플 Vue/JS/TS 파일들
- **내용**: 다양한 패턴의 한글 텍스트가 포함된 예제 파일들

## 🚀 테스트 실행 방법

### 1. 전체 테스트 실행
```bash
# 프로젝트 루트에서
npm test
```

### 2. 개별 테스트 실행
```bash
# 문장 자동 판별 테스트
node tests/test-sentence-auto-decomposition.mjs

# 성능 테스트
node tests/performance-test.mjs

# 종합 테스트
node tests/test-comprehensive-i18n.js
```

### 3. 빌드 후 테스트
```bash
npm run build
node tests/test-sentence-auto-decomposition.mjs
```

## 📊 테스트 결과 해석

### 성공 지표
- ✅ 한글 텍스트 정확 감지
- ✅ 문장/단어 자동 판별
- ✅ 개별 단어 분해 성공
- ✅ i18n 키 매칭 성공
- ✅ 처리 시간 < 100ms (일반적인 파일)

### 주요 메트릭
- **감지율**: 한글 텍스트 감지 정확도
- **분해율**: 개별 단어 분해 성공률
- **매칭율**: 기존 번역 키 매칭 비율
- **처리 속도**: 파일당 처리 시간
- **신뢰도**: 변환 결과 신뢰도 점수

## 🔧 테스트 환경 설정

### 필수 파일
- `lang/ko.js`: 한국어 번역 파일
- `lang/en.js`: 영어 번역 파일
- `dist/`: 빌드된 TypeScript 파일들

### 환경 변수
```bash
# i18n 함수 설정 (선택사항)
I18N_FUNCTION_TYPE=DEFAULT
```

## 📝 새 테스트 추가 가이드

### 1. 테스트 파일 명명 규칙
- `test-[기능명].mjs` 형식 사용
- 설명적이고 명확한 이름 사용

### 2. 테스트 파일 구조
```javascript
import { ProcessKoreanReplacementTool } from '../dist/server/tools/process-korean-replacement.js';

// 테스트 데이터
const testData = `...`;

// 테스트 함수
async function testFeatureName() {
  try {
    // 테스트 로직
    console.log('✅ 테스트 성공');
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testFeatureName();
```

### 3. 테스트 결과 형식
- ✅ 성공 표시
- ❌ 실패 표시  
- 📊 통계 정보
- 🎯 핵심 결과

## 🐛 문제 해결

### 일반적인 문제
1. **빌드 오류**: `npm run build` 실행
2. **모듈 없음**: `npm install` 실행
3. **번역 파일 없음**: `lang/` 디렉토리 확인

### 디버깅 팁
- `console.error()` 로그 확인
- 처리 시간이 긴 경우 파일 크기 확인
- 신뢰도가 낮은 경우 번역 파일 키 추가 검토

---

**마지막 업데이트**: 2024년 12월
**버전**: 1.0.0
**상태**: 프로덕션 준비 완료 