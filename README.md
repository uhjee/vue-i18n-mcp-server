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

### 2. VS Code MCP 설정 (최신 방식)

#### 방법 1: 워크스페이스 설정 (권장)

Vue 프로젝트 루트에 `.vscode/mcp.json` 파일을 생성하고 다음 내용을 추가하세요:

```json
{
  // 💡 입력값들은 서버 첫 시작 시 프롬프트되며, VS Code에 안전하게 저장됩니다.
  "inputs": [
    {
      "type": "promptString",
      "id": "project-root",
      "description": "프로젝트 루트 경로",
      "password": false
    },
    {
      "type": "promptString", 
      "id": "locales-path",
      "description": "번역 파일 디렉토리 경로 (프로젝트 루트 기준 상대경로)",
      "password": false
    }
  ],
  "servers": {
    "vueI18nAutomation": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/절대경로/vue-i18n-mcp-server/dist/src/index.js"
      ],
      "env": {
        "PROJECT_ROOT": "${input:project-root}",
        "LOCALES_PATH": "${input:locales-path}",
        "I18N_FUNCTION_TYPE": "VUE_I18N_WATCHALL"
      }
    }
  }
}
```

**중요**: `/절대경로/vue-i18n-mcp-server/dist/src/index.js`를 실제 경로로 변경하세요.

#### 방법 2: 사용자 설정

VS Code 설정(`settings.json`)에 추가:

```json
{
  "mcp": {
    "servers": {
      "vueI18nAutomation": {
        "type": "stdio",
        "command": "node",
        "args": ["/절대경로/vue-i18n-mcp-server/dist/src/index.js"],
        "env": {
          "PROJECT_ROOT": "/your/project/path",
          "LOCALES_PATH": "src/locales",
          "I18N_FUNCTION_TYPE": "VUE_I18N_WATCHALL"
        }
      }
    }
  }
}
```

### 3. VS Code에서 MCP 활성화

1. **MCP 기능 활성화**: VS Code 설정에서 `chat.mcp.enabled`를 `true`로 설정
2. **서버 시작**: `.vscode/mcp.json` 파일에서 **Start** 버튼 클릭
3. **서버 상태 확인**: Command Palette에서 **MCP: List Servers** 실행

### 4. Copilot Chat에서 사용

1. **Copilot Chat 열기**: `Ctrl+Alt+I` (Windows/Linux) 또는 `⌃⌘I` (Mac)
2. **Agent 모드 선택**: 채팅 박스에서 **Agent** 선택
3. **도구 확인**: **Tools** 버튼을 클릭하여 Vue i18n 도구가 활성화되어 있는지 확인
4. **사용 예시**:

```
Vue 파일에서 한글 텍스트를 찾아서 i18n으로 변환해줘
```

**Windows 사용자 주의사항:**
- PowerShell 또는 Command Prompt에서 실행하세요
- 경로에 한글이 포함된 경우 문제가 발생할 수 있으니 영문 경로를 사용하세요
- Git Bash 사용 시 경로 구분자 문제가 있을 수 있으니 PowerShell 사용을 권장합니다

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
- {{ $localeMessage(['WATCHALL.WORD.PASSWORD', 'WATCHALL.WORD.FIND']) }}
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
    └── mcp.json          👈 MCP 설정 파일 (새로운 방식)
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

### 입력 변수 활용

최신 MCP 설정에서는 `inputs` 섹션을 통해 안전하게 설정값을 관리할 수 있습니다:

- **프로젝트 루트**: 서버 첫 시작 시 프롬프트로 입력받아 VS Code에 안전하게 저장
- **번역 파일 경로**: 프로젝트별로 다른 경로 설정 가능
- **보안**: 민감한 정보는 `"password": true` 옵션으로 숨김 처리 가능

### 자동 탐지 기능

MCP 서버는 다음과 같은 자동 탐지 기능을 제공합니다:

- **Claude Desktop 설정 자동 발견**: `chat.mcp.discovery.enabled` 설정으로 기존 Claude 설정 재사용
- **워크스페이스 폴더 자동 전달**: VS Code가 현재 워크스페이스 정보를 서버에 자동 전달
- **파일 수정시간 기반 캐싱**: 번역 파일이 변경된 경우에만 다시 로드

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

# MCP 서버 상태 확인
# VS Code Command Palette → "MCP: List Servers"
```

### 2. 도구가 Copilot Chat에서 보이지 않을 때

1. **Agent 모드 확인**: Copilot Chat에서 **Agent** 모드가 선택되어 있는지 확인
2. **도구 활성화**: **Tools** 버튼을 클릭하여 Vue i18n 도구가 체크되어 있는지 확인
3. **서버 재시작**: `.vscode/mcp.json`에서 서버를 중지 후 다시 시작

### 3. 경로 문제 해결

**Windows 환경:**
- **경로 구분자**: `\` 대신 `/` 또는 `\\` 사용
- **드라이브 문자**: `C:/Users/사용자명/Projects/your-vue-project` 형태
- **공백 포함 경로**: 따옴표로 감싸기: `"C:/Program Files/project"`

**macOS/Linux 환경:**
- **절대 경로**: `/Users/사용자명/Projects/your-vue-project` 형태
- **홈 디렉토리**: `~` 기호 사용 가능

### 4. 번역 파일 인식 문제

번역 파일이 인식되지 않는 경우:

1. **파일 구조 확인**: `LOCALES_PATH/ko.js`, `LOCALES_PATH/en.js` 파일 존재 확인
2. **파일 형식 확인**: `export default { WATCHALL: { WORD: { ... } } }` 구조 확인
3. **권한 확인**: 파일 읽기 권한 확인

## 🚀 성능 최적화

- **인덱스 기반 검색**: O(1) 시간복잡도로 빠른 번역 키 검색
- **부분 파일 로딩**: WATCHALL.WORD 섹션만 추출하여 메모리 효율성 향상
- **스마트 캐싱**: 파일 수정시간 기반 캐싱으로 불필요한 재로딩 방지
- **최적화된 정규식**: 대용량 파일에서도 빠른 섹션 추출

## 📝 라이선스

MIT License

## 🤝 기여

이슈 리포트나 풀 리퀘스트를 환영합니다! 