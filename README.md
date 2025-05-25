# 🚀 Vue I18n MCP Server

GitHub Copilot Agent Mode와 완전 호환되는 Vue.js 다국어 자동화 도구입니다.

## 📖 이 도구가 하는 일

Vue 파일에서 **한글 텍스트를 자동으로 찾아서** i18n 키로 변환해주는 MCP 서버입니다.

**Before (변환 전):**
```vue
<template>
  <h1>사용자 프로필</h1>
  <button>저장</button>
</template>
```

**After (변환 후):**
```vue
<template>
  <h1>{{ $localeMessage('WATCHALL.WORD.USER_PROFILE') }}</h1>
  <button>{{ $localeMessage('WATCHALL.WORD.SAVE') }}</button>
</template>
```

## 🚀 빠른 시작

### 1. 설치 및 빌드

```bash
# 의존성 설치
npm install

# TypeScript 빌드
npm run build
```

### 2. MCP 서버 설정

```bash
# 자동 설정 스크립트 실행
npm run setup
```

**Windows 사용자 주의사항:**
- PowerShell 또는 Command Prompt에서 실행하세요
- 경로에 한글이 포함된 경우 문제가 발생할 수 있으니 영문 경로를 사용하세요
- Git Bash 사용 시 경로 구분자 문제가 있을 수 있으니 PowerShell 사용을 권장합니다

**Windows 전용 설정 (권장):**
```powershell
# Windows 환경에 최적화된 설정 스크립트
npm run setup:win
```

### 3. VSCode에서 MCP 활성화

1. **VSCode 열기**: Vue 프로젝트를 VSCode로 열기
2. **MCP 활성화**: `Cmd+Shift+P` → "GitHub Copilot: Enable MCP" 실행
3. **Copilot 채팅에서 사용**:

```
@vue-i18n-automation 이 파일의 한글을 분석해줘
```

## 🎯 실제 사용 예시

### 입력 (Vue 파일)
```vue
<template>
  <div>
    <h1>로그인</h1>
    <input placeholder="아이디" />
    <button>비밀번호 찾기</button>
  </div>
</template>
```

### 출력 (Copilot 분석 결과)
```
📊 분석 결과
- 발견된 한글: 3개
- 매칭된 번역: 3개 (100%)

✅ 매칭된 번역:
1. "로그인" → WATCHALL.WORD.LOGIN
2. "아이디" → WATCHALL.WORD.ID  
3. "비밀번호 찾기" → [WATCHALL.WORD.PASSWORD, WATCHALL.WORD.FIND]

📝 변환 예시:
- {{ $localeMessage('WATCHALL.WORD.LOGIN') }}
- {{ $localeMessage('WATCHALL.WORD.ID') }}
- {{ $localeMessage([WATCHALL.WORD.PASSWORD, WATCHALL.WORD.FIND]) }}
```

## 📁 필수 파일 구조

MCP 서버가 작동하려면 Vue 프로젝트에 언어 파일이 있어야 합니다:

```
your-vue-project/
├── src/
│   └── locales/          👈 LOCALES_PATH에서 지정한 폴더
│       ├── ko.js         👈 한글 번역 파일
│       └── en.js         👈 영문 번역 파일
└── .vscode/
    └── mcp.json          👈 MCP 설정 파일
```

**ko.js 예시:**
```javascript
export default {
  WATCHALL: {
    WORD: {
      LOGIN: '로그인',
      ID: '아이디',
      PASSWORD: '비밀번호',
      FIND: '찾기'
    }
  }
};
```

**en.js 예시:**
```javascript
export default {
  WATCHALL: {
    WORD: {
      LOGIN: 'Login',
      ID: 'ID',
      PASSWORD: 'Password',
      FIND: 'Find'
    }
  }
};
```

## ⚙️ 고급 설정

### i18n 함수 커스터마이징

`I18N_FUNCTION_TYPE` 환경변수로 사용할 함수를 변경할 수 있습니다:

| 설정값 | Template | Script | JavaScript |
|--------|----------|--------|------------|
| `VUE_I18N_WATCHALL` | `$localeMessage` | `this.$localeMessage` | `i18n.localeMessage` |
| `DEFAULT` | `$t` | `this.$t` | `i18n.t` |
| `VUE_I18N_COMPOSABLE` | `t` | `t` | `i18n.global.t` |

### 프로젝트 루트 자동 탐지 문제 해결

MCP 서버가 잘못된 경로에서 실행되는 경우:

**증상:**
```
프로젝트 루트 자동 탐지 시작: /Users/사용자명
프로젝트 루트를 찾을 수 없어서 현재 디렉토리 사용: /Users/사용자명
```

**해결책:**
`.vscode/mcp.json`에 `PROJECT_ROOT` 명시적 설정:
```json
"env": {
  "PROJECT_ROOT": "/Users/사용자명/Dev/your-vue-project"
}
```

**Windows 환경 추가 고려사항:**
- **경로 구분자**: Windows에서는 `\` 대신 `/` 또는 `\\`를 사용하세요
- **드라이브 문자**: `C:\Users\사용자명\Projects\your-vue-project` 형태로 절대 경로 지정
- **PowerShell 권장**: Git Bash보다는 PowerShell이나 Command Prompt 사용 권장
- **관리자 권한**: 일부 경로에서는 관리자 권한이 필요할 수 있습니다

## 🧪 테스트

설치가 제대로 되었는지 확인:

```bash
# 기능 테스트
npm run test:full

# 개별 테스트
npm run test:pattern     # 한글 추출 테스트
npm run test:translation # 번역 매칭 테스트
```

**Windows 환경에서 테스트:**
```powershell
# PowerShell에서 실행
npm run test:full

# 또는 Command Prompt에서
npm run test:full
```

## 🔧 문제 해결

### 1. MCP 서버가 시작 안 될 때

```bash
# 빌드 다시 실행
npm run build

# 수동 실행으로 오류 확인
node dist/src/index.js
```

### 2. 한글이 인식 안 될 때

1. **언어 파일 경로 확인**: `ko.js`, `en.js` 파일이 `LOCALES_PATH`에 있는지 확인
2. **파일 형식 확인**: `export default { ... }` 형식인지 확인
3. **인코딩 확인**: UTF-8 인코딩인지 확인

### 3. VSCode에서 연결 안 될 때

1. **절대 경로 사용**: `.vscode/mcp.json`에서 상대 경로 대신 절대 경로 사용
2. **VSCode 재시작**: 완전 종료 후 다시 열기
3. **MCP 재활성화**: `Cmd+Shift+P` → "GitHub Copilot: Enable MCP"

### 4. 설정 다시 하고 싶을 때

```bash
npm run setup  # 기존 설정을 덮어씁니다
```

## 🎉 완료!

이제 Copilot에서 `@vue-i18n-automation`을 사용해서 한글 텍스트를 자동으로 i18n 키로 변환할 수 있습니다!

**Happy Coding! 🚀**

---

## 📞 지원

- **Node.js 버전**: 16.0.0 이상 필요
- **문제 발생 시**: MCP 서버 로그 확인 (`console.error` 출력)
- **이슈 리포트**: GitHub Issues에 로그와 함께 제보 