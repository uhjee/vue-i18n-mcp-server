#!/usr/bin/env node

/**
 * Vue I18n MCP 서버 종합 다국어 처리 테스트
 * Vue Template, Script, JS 파일의 모든 케이스 테스트
 */

import { PatternScannerService } from '../dist/services/pattern-scanner.js';
import { TranslationMatcherService } from '../dist/services/translation-matcher.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 테스트용 확장된 번역 파일 생성
async function createExtendedTranslationFiles() {
  const testDir = path.join(__dirname, 'temp-translations-comprehensive');
  await fs.ensureDir(testDir);
  
  const koContent = `export default {
  WATCHALL: {
    WORD: {
      // 기본 단어들
      LOGIN: '로그인',
      PASSWORD: '비밀번호',
      USER: '사용자',
      PROFILE: '프로필',
      SAVE: '저장',
      DELETE: '삭제',
      CONFIRM: '확인',
      CANCEL: '취소',
      SEARCH: '검색',
      SETTING: '설정',
      HOME: '홈',
      BACK: '뒤로가기',
      
      // 추가 단어들
      WELCOME: '환영합니다',
      HELLO: '안녕하세요',
      GOODBYE: '안녕히가세요',
      THANK_YOU: '감사합니다',
      SORRY: '죄송합니다',
      YES: '예',
      NO: '아니오',
      OK: '확인',
      ERROR: '오류',
      SUCCESS: '성공',
      LOADING: '로딩중',
      COMPLETE: '완료',
      START: '시작',
      END: '종료',
      NEW: '새로운',
      EDIT: '편집',
      UPDATE: '업데이트',
      REMOVE: '제거',
      ADD: '추가',
      MODIFY: '수정',
      VIEW: '보기',
      LIST: '목록',
      DETAIL: '상세',
      INFO: '정보',
      HELP: '도움말',
      ABOUT: '소개',
      CONTACT: '연락처',
      ADMIN: '관리자',
      MEMBER: '회원',
      GUEST: '게스트',
      PUBLIC: '공개',
      PRIVATE: '비공개',
      SEND: '전송',
      RECEIVE: '수신',
      MESSAGE: '메시지',
      NOTIFICATION: '알림',
      WARNING: '경고',
      DOWNLOAD: '다운로드',
      UPLOAD: '업로드',
      FILE: '파일',
      FOLDER: '폴더',
      IMAGE: '이미지',
      VIDEO: '비디오',
      AUDIO: '오디오',
      DOCUMENT: '문서'
    }
  }
};`;

  const enContent = `export default {
  WATCHALL: {
    WORD: {
      // 기본 단어들
      LOGIN: 'Login',
      PASSWORD: 'Password',
      USER: 'User',
      PROFILE: 'Profile',
      SAVE: 'Save',
      DELETE: 'Delete',
      CONFIRM: 'Confirm',
      CANCEL: 'Cancel',
      SEARCH: 'Search',
      SETTING: 'Setting',
      HOME: 'Home',
      BACK: 'Back',
      
      // 추가 단어들
      WELCOME: 'Welcome',
      HELLO: 'Hello',
      GOODBYE: 'Goodbye',
      THANK_YOU: 'Thank you',
      SORRY: 'Sorry',
      YES: 'Yes',
      NO: 'No',
      OK: 'OK',
      ERROR: 'Error',
      SUCCESS: 'Success',
      LOADING: 'Loading',
      COMPLETE: 'Complete',
      START: 'Start',
      END: 'End',
      NEW: 'New',
      EDIT: 'Edit',
      UPDATE: 'Update',
      REMOVE: 'Remove',
      ADD: 'Add',
      MODIFY: 'Modify',
      VIEW: 'View',
      LIST: 'List',
      DETAIL: 'Detail',
      INFO: 'Info',
      HELP: 'Help',
      ABOUT: 'About',
      CONTACT: 'Contact',
      ADMIN: 'Admin',
      MEMBER: 'Member',
      GUEST: 'Guest',
      PUBLIC: 'Public',
      PRIVATE: 'Private',
      SEND: 'Send',
      RECEIVE: 'Receive',
      MESSAGE: 'Message',
      NOTIFICATION: 'Notification',
      WARNING: 'Warning',
      DOWNLOAD: 'Download',
      UPLOAD: 'Upload',
      FILE: 'File',
      FOLDER: 'Folder',
      IMAGE: 'Image',
      VIDEO: 'Video',
      AUDIO: 'Audio',
      DOCUMENT: 'Document'
    }
  }
};`;

  await fs.writeFile(path.join(testDir, 'ko.js'), koContent);
  await fs.writeFile(path.join(testDir, 'en.js'), enContent);
  
  return testDir;
}

// 통계 객체
class TestStats {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.details = [];
  }

  addResult(testName, success, details = {}) {
    this.total++;
    if (success) {
      this.passed++;
    } else {
      this.failed++;
    }
    
    this.details.push({
      testName,
      success,
      ...details
    });
  }

  getSuccessRate() {
    return this.total > 0 ? (this.passed / this.total * 100).toFixed(1) : 0;
  }

  printSummary() {
    console.log(`\n📊 테스트 통계:`);
    console.log(`  총 테스트: ${this.total}개`);
    console.log(`  성공: ${this.passed}개`);
    console.log(`  실패: ${this.failed}개`);
    console.log(`  성공률: ${this.getSuccessRate()}%`);
  }
}

async function testComprehensiveI18n() {
  console.log('🧪 Vue I18n MCP 서버 종합 다국어 처리 테스트 시작\n');

  const stats = new TestStats();
  const scanner = new PatternScannerService();
  
  // 테스트용 번역 파일 생성
  const testDir = await createExtendedTranslationFiles();
  
  const config = {
    projectRoot: testDir,
    langFilePath: {
      ko: path.join(testDir, 'ko.js'),
      en: path.join(testDir, 'en.js')
    }
  };
  
  const translationMatcher = new TranslationMatcherService(config);
  await translationMatcher.loadTranslations();

  try {
    // 1. Vue Template 섹션 테스트
    await testVueTemplate(scanner, translationMatcher, stats);
    
    // 2. Vue Script 섹션 테스트  
    await testVueScript(scanner, translationMatcher, stats);
    
    // 3. JavaScript 파일 테스트
    await testJavaScriptFiles(scanner, translationMatcher, stats);
    
    // 4. 특수 케이스 테스트
    await testSpecialCases(scanner, translationMatcher, stats);
    
    // 5. 성능 테스트
    await testPerformance(scanner, translationMatcher, stats);
    
  } finally {
    // 정리
    await fs.remove(testDir);
  }

  // 최종 결과
  stats.printSummary();
  
  if (stats.failed > 0) {
    console.log(`\n❌ 실패한 테스트들:`);
    stats.details.filter(d => !d.success).forEach((detail, index) => {
      console.log(`${index + 1}. ${detail.testName}`);
      if (detail.error) {
        console.log(`   오류: ${detail.error}`);
      }
    });
  }

  return stats.passed === stats.total;
}

async function testVueTemplate(scanner, translationMatcher, stats) {
  console.log('📋 1. Vue Template 섹션 테스트\n');

  const testCases = [
    {
      name: 'HTML 텍스트 노드',
      vueContent: `
<template>
  <div>
    <h1>환영합니다</h1>
    <h2>사용자 프로필</h2>
    <p>안녕하세요, 회원님!</p>
    <span>로딩중...</span>
    <button>저장</button>
    <a href="#">도움말</a>
  </div>
</template>

<script>
export default {
  name: 'TestComponent'
}
</script>
`,
      expectedTexts: ['환영합니다', '사용자 프로필', '안녕하세요', '회원님', '로딩중', '저장', '도움말']
    },
    {
      name: 'HTML 속성값',
      vueContent: `
<template>
  <div>
    <input type="text" placeholder="사용자명을 입력하세요" />
    <input type="password" placeholder="비밀번호" />
    <button title="검색 버튼">검색</button>
    <img src="image.jpg" alt="프로필 이미지" />
    <a href="#" title="홈으로 이동">홈</a>
  </div>
</template>

<script>
export default {}
</script>
`,
      expectedTexts: ['사용자명을 입력하세요', '비밀번호', '검색 버튼', '검색', '프로필 이미지', '홈으로 이동', '홈']
    },
    {
      name: 'Vue 디렉티브와 인터폴레이션',
      vueContent: `
<template>
  <div>
    <div v-if="showWelcome">환영합니다</div>
    <div v-else>안녕히가세요</div>
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ item.name }} - {{ item.description }}
      </li>
    </ul>
    <button @click="handleClick" :disabled="loading">
      {{ loading ? '로딩중' : '완료' }}
    </button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showWelcome: true,
      loading: false,
      items: [
        { id: 1, name: '새 파일', description: '파일을 생성합니다' },
        { id: 2, name: '편집', description: '파일을 편집합니다' }
      ]
    }
  }
}
</script>
`,
      expectedTexts: ['환영합니다', '안녕히가세요', '로딩중', '완료', '새 파일', '파일을 생성합니다', '편집', '파일을 편집합니다']
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 테스트: ${testCase.name}`);
    
    try {
      const results = await scanner.scanVueFile('test.vue', testCase.vueContent);
      const templateResults = results.filter(r => r.location.section === 'template');
      
      console.log(`  추출된 한글: ${templateResults.length}개`);
      templateResults.forEach((r, i) => {
        console.log(`    ${i + 1}. "${r.text}" (라인 ${r.location.line})`);
      });

      // 번역 매칭
      const allTexts = templateResults.map(r => r.text);
      const matches = await translationMatcher.findMatches(allTexts);
      
      console.log(`  매칭된 번역: ${matches.length}개`);
      
      // 배열 형태 키 체크
      const arrayKeys = matches.filter(m => m.keyPath.startsWith('[') && m.keyPath.endsWith(']'));
      if (arrayKeys.length > 0) {
        console.log(`  배열 형태 키: ${arrayKeys.length}개`);
        arrayKeys.forEach(ak => {
          console.log(`    "${ak.korean}" → ${ak.keyPath}`);
        });
      }

      const success = templateResults.length >= testCase.expectedTexts.length * 0.7; // 70% 이상
      stats.addResult(`Template: ${testCase.name}`, success, {
        extracted: templateResults.length,
        expected: testCase.expectedTexts.length,
        matched: matches.length
      });

      console.log(`  결과: ${success ? '✅ 성공' : '❌ 실패'}\n`);

    } catch (error) {
      console.log(`  ❌ 오류: ${error.message}\n`);
      stats.addResult(`Template: ${testCase.name}`, false, { error: error.message });
    }
  }
}

async function testVueScript(scanner, translationMatcher, stats) {
  console.log('📋 2. Vue Script 섹션 테스트\n');

  const testCases = [
    {
      name: 'Options API - 기본 구조',
      vueContent: `
<template>
  <div>{{ message }}</div>
</template>

<script>
export default {
  name: 'OptionsAPITest',
  data() {
    return {
      message: '안녕하세요',
      title: '사용자 관리',
      description: '회원 정보를 관리합니다',
      status: '활성/비활성',
      actions: ['저장', '수정', '삭제', '취소']
    }
  },
  computed: {
    welcomeMessage() {
      return '환영합니다, ' + this.message;
    },
    fullTitle() {
      return this.title + ' - ' + this.description;
    }
  },
  methods: {
    showAlert() {
      alert('저장이 완료되었습니다');
      console.log('작업 성공');
    },
    confirmDelete() {
      return confirm('정말로 삭제하시겠습니까?');
    },
    handleError() {
      console.error('오류가 발생했습니다');
      this.$toast.error('처리 중 오류 발생');
    }
  }
}
</script>
`,
      expectedTexts: ['안녕하세요', '사용자 관리', '회원 정보를 관리합니다', '활성', '비활성', '저장', '수정', '삭제', '취소']
    },
    {
      name: 'Composition API',
      vueContent: `
<template>
  <div>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const title = ref('새로운 프로젝트')
const description = ref('프로젝트 설명을 입력하세요')
const isLoading = ref(false)
const errorMessage = ref('')

const statusText = computed(() => {
  return isLoading.value ? '로딩중...' : '준비완료'
})

const messages = ref([
  '첫 번째 메시지',
  '두 번째 메시지', 
  '세 번째 메시지'
])

const handleSubmit = () => {
  if (!title.value) {
    alert('제목을 입력해주세요')
    return
  }
  
  console.log('데이터 전송 시작')
  errorMessage.value = '전송 중 오류가 발생했습니다'
}

onMounted(() => {
  console.log('컴포넌트가 마운트되었습니다')
})

// 다양한 문자열 패턴
const config = {
  successMessage: '작업이 성공적으로 완료되었습니다',
  warningMessage: '주의: 데이터가 손실될 수 있습니다',
  infoMessage: '정보: 새로운 업데이트가 있습니다'
}

const dynamicMessage = \`현재 상태: \${statusText.value}\`
</script>
`,
      expectedTexts: ['새로운 프로젝트', '프로젝트 설명을 입력하세요', '로딩중', '준비완료', '첫 번째 메시지', '두 번째 메시지', '세 번째 메시지']
    },
    {
      name: 'TypeScript + Composition API',
      vueContent: `
<template>
  <div>
    <h1>{{ title }}</h1>
    <button @click="handleClick">{{ buttonText }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'

interface User {
  id: number
  name: string
  email: string
  role: '관리자' | '회원' | '게스트'
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
}

const title = ref<string>('타입스크립트 테스트')
const buttonText = ref<string>('클릭하세요')
const currentUser = ref<User | null>(null)

const users: User[] = [
  { id: 1, name: '홍길동', email: 'hong@test.com', role: '관리자' },
  { id: 2, name: '김철수', email: 'kim@test.com', role: '회원' },
  { id: 3, name: '이영희', email: 'lee@test.com', role: '게스트' }
]

const statusMessages = {
  loading: '데이터를 불러오는 중...',
  success: '데이터 로딩 성공',
  error: '데이터 로딩 실패',
  empty: '데이터가 없습니다'
} as const

const handleClick = (): void => {
  alert('타입스크립트 버튼이 클릭되었습니다')
  console.log('TS 로그 메시지')
}

const validateUser = (user: User): boolean => {
  if (!user.name) {
    throw new Error('사용자 이름이 필요합니다')
  }
  return true
}

const getApiResponse = async (): Promise<ApiResponse<User[]>> => {
  try {
    return {
      success: true,
      message: 'API 호출 성공',
      data: users
    }
  } catch (error) {
    return {
      success: false,
      message: 'API 호출 실패'
    }
  }
}
</script>
`,
      expectedTexts: ['타입스크립트 테스트', '클릭하세요', '관리자', '회원', '게스트', '홍길동', '김철수', '이영희']
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 테스트: ${testCase.name}`);
    
    try {
      const results = await scanner.scanVueFile('test.vue', testCase.vueContent);
      const scriptResults = results.filter(r => r.location.section === 'script');
      
      console.log(`  추출된 한글: ${scriptResults.length}개`);
      scriptResults.forEach((r, i) => {
        console.log(`    ${i + 1}. "${r.text}" (라인 ${r.location.line})`);
      });

      // 번역 매칭
      const allTexts = scriptResults.map(r => r.text);
      const matches = await translationMatcher.findMatches(allTexts);
      
      console.log(`  매칭된 번역: ${matches.length}개`);

      const success = scriptResults.length >= testCase.expectedTexts.length * 0.7;
      stats.addResult(`Script: ${testCase.name}`, success, {
        extracted: scriptResults.length,
        expected: testCase.expectedTexts.length,
        matched: matches.length
      });

      console.log(`  결과: ${success ? '✅ 성공' : '❌ 실패'}\n`);

    } catch (error) {
      console.log(`  ❌ 오류: ${error.message}\n`);
      stats.addResult(`Script: ${testCase.name}`, false, { error: error.message });
    }
  }
}

async function testJavaScriptFiles(scanner, translationMatcher, stats) {
  console.log('📋 3. JavaScript 파일 테스트\n');

  const testCases = [
    {
      name: 'ES6 모듈과 클래스',
      content: `
import { createApp } from 'vue'
import router from './router'

// 상수 정의
const APP_NAME = '애플리케이션 이름'
const VERSION = '버전 1.0.0'

// 설정 객체
const config = {
  title: '메인 설정',
  description: '애플리케이션 설정을 관리합니다',
  features: [
    '사용자 관리',
    '권한 제어', 
    '데이터 백업',
    '로그 분석'
  ],
  messages: {
    welcome: '환영합니다!',
    goodbye: '안녕히가세요!',
    error: '오류가 발생했습니다',
    success: '성공적으로 처리되었습니다'
  }
}

// 클래스 정의
class UserManager {
  constructor() {
    this.users = []
    this.currentUser = null
    this.status = '준비됨'
  }

  addUser(userData) {
    console.log('새 사용자 추가:', userData.name)
    this.users.push(userData)
    return '사용자가 추가되었습니다'
  }

  removeUser(userId) {
    const confirmed = confirm('정말로 사용자를 삭제하시겠습니까?')
    if (confirmed) {
      this.users = this.users.filter(u => u.id !== userId)
      alert('사용자가 삭제되었습니다')
      return true
    }
    return false
  }

  validateUser(user) {
    if (!user.name) {
      throw new Error('사용자 이름이 필요합니다')
    }
    if (!user.email) {
      throw new Error('이메일 주소가 필요합니다')  
    }
    return '유효한 사용자입니다'
  }
}

// 비동기 함수
async function loadUserData() {
  try {
    console.log('사용자 데이터 로딩 시작')
    const response = await fetch('/api/users')
    
    if (!response.ok) {
      throw new Error('데이터 로딩 실패')
    }
    
    const data = await response.json()
    console.log('데이터 로딩 완료')
    return data
  } catch (error) {
    console.error('로딩 중 오류 발생:', error.message)
    return { error: '데이터를 불러올 수 없습니다' }
  }
}

// 유틸리티 함수
const utils = {
  formatDate: (date) => {
    return \`날짜: \${date.toLocaleDateString()}\`
  },
  
  showNotification: (message, type = 'info') => {
    const prefix = type === 'error' ? '오류' : '알림'
    alert(\`\${prefix}: \${message}\`)
  },
  
  confirmAction: (action) => {
    return confirm(\`'\${action}'을(를) 실행하시겠습니까?\`)
  }
}

export { UserManager, loadUserData, utils, config }
`,
      expectedTexts: ['애플리케이션 이름', '버전', '메인 설정', '애플리케이션 설정을 관리합니다', '사용자 관리', '권한 제어', '데이터 백업', '로그 분석']
    },
    {
      name: 'TypeScript 파일',
      content: `
interface UserRole {
  id: number
  name: '관리자' | '일반사용자' | '게스트'
  permissions: string[]
}

interface ApiError {
  code: number
  message: string
  details?: string
}

type NotificationType = '성공' | '경고' | '오류' | '정보'

class NotificationService {
  private notifications: Array<{
    id: string
    type: NotificationType
    message: string
    timestamp: Date
  }> = []

  show(type: NotificationType, message: string): void {
    const notification = {
      id: this.generateId(),
      type,
      message,
      timestamp: new Date()
    }
    
    this.notifications.push(notification)
    console.log(\`알림 표시: [\${type}] \${message}\`)
  }

  showSuccess(message: string): void {
    this.show('성공', message)
  }

  showError(message: string): void {
    this.show('오류', message)
  }

  showWarning(message: string): void {
    this.show('경고', message)
  }

  showInfo(message: string): void {
    this.show('정보', message)
  }

  private generateId(): string {
    return 'notification_' + Date.now()
  }

  clear(): void {
    this.notifications = []
    console.log('모든 알림이 삭제되었습니다')
  }

  getAll(): typeof this.notifications {
    return [...this.notifications]
  }
}

// 제네릭 함수
function processApiResponse<T>(
  response: { success: boolean; data?: T; error?: ApiError }
): T | never {
  if (response.success && response.data) {
    console.log('API 응답 처리 성공')
    return response.data
  }
  
  const errorMsg = response.error?.message || '알 수 없는 오류가 발생했습니다'
  console.error('API 오류:', errorMsg)
  throw new Error(errorMsg)
}

// 상수와 설정
const APP_CONFIG = {
  name: '타입스크립트 애플리케이션',
  version: '2.0.0',
  author: '개발팀',
  support: {
    email: 'support@example.com',
    phone: '1588-1234',
    hours: '평일 9시-18시'
  },
  messages: {
    loading: '데이터를 불러오는 중입니다...',
    complete: '작업이 완료되었습니다',
    cancelled: '작업이 취소되었습니다',
    timeout: '요청 시간이 초과되었습니다'
  }
} as const

export type { UserRole, ApiError, NotificationType }
export { NotificationService, processApiResponse, APP_CONFIG }
`,
      expectedTexts: ['관리자', '일반사용자', '게스트', '성공', '경고', '오류', '정보', '알림 표시', '모든 알림이 삭제되었습니다']
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 테스트: ${testCase.name}`);
    
    try {
      const results = scanner.scanJSFile('test.js', testCase.content);
      
      console.log(`  추출된 한글: ${results.length}개`);
      results.forEach((r, i) => {
        console.log(`    ${i + 1}. "${r.text}" (라인 ${r.location.line})`);
      });

      // 번역 매칭
      const allTexts = results.map(r => r.text);
      const matches = await translationMatcher.findMatches(allTexts);
      
      console.log(`  매칭된 번역: ${matches.length}개`);

      const success = results.length >= testCase.expectedTexts.length * 0.5; // JS는 50% 기준
      stats.addResult(`JS: ${testCase.name}`, success, {
        extracted: results.length,
        expected: testCase.expectedTexts.length,
        matched: matches.length
      });

      console.log(`  결과: ${success ? '✅ 성공' : '❌ 실패'}\n`);

    } catch (error) {
      console.log(`  ❌ 오류: ${error.message}\n`);
      stats.addResult(`JS: ${testCase.name}`, false, { error: error.message });
    }
  }
}

async function testSpecialCases(scanner, translationMatcher, stats) {
  console.log('📋 4. 특수 케이스 테스트\n');

  const testCases = [
    {
      name: '특수문자 조합',
      type: 'vue',
      content: `
<template>
  <div>
    <h1>로그인/비밀번호 찾기</h1>
    <p>사용자 & 관리자</p>
    <span>저장 | 삭제 | 취소</span>
    <button>파일 + 폴더</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      status: '성공/실패',
      actions: '추가 & 수정 & 삭제',
      permissions: '읽기 | 쓰기 | 실행',
      categories: '이미지 + 비디오 + 오디오'
    }
  },
  methods: {
    showMessage() {
      alert('업로드/다운로드 완료');
      console.log('전송 & 수신 상태');
    }
  }
}
</script>
`,
      expectedSpecialTexts: [
        '로그인/비밀번호 찾기',
        '사용자 & 관리자', 
        '저장 | 삭제 | 취소',
        '파일 + 폴더',
        '성공/실패',
        '추가 & 수정 & 삭제'
      ]
    },
    {
      name: '중첩 구조와 복잡한 문자열',
      type: 'vue',
      content: `
<template>
  <div>
    <div v-for="item in complexItems" :key="item.id">
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
      <div v-if="item.hasSubItems">
        <div v-for="sub in item.subItems" :key="sub.id">
          <span>{{ sub.name }} ({{ sub.type }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      complexItems: [
        {
          id: 1,
          title: '문서 관리 시스템',
          description: '다양한 형태의 문서를 관리하고 검색할 수 있습니다',
          hasSubItems: true,
          subItems: [
            { id: 1, name: 'PDF 문서', type: '읽기 전용' },
            { id: 2, name: '워드 문서', type: '편집 가능' },
            { id: 3, name: '엑셀 문서', type: '데이터 분석' }
          ]
        },
        {
          id: 2,
          title: '미디어 라이브러리',
          description: '이미지, 동영상, 음악 파일을 체계적으로 관리합니다',
          hasSubItems: true,
          subItems: [
            { id: 4, name: '고화질 이미지', type: 'JPEG/PNG' },
            { id: 5, name: '4K 동영상', type: 'MP4/AVI' },
            { id: 6, name: '무손실 음악', type: 'FLAC/WAV' }
          ]
        }
      ],
      
      systemMessages: {
        uploadProgress: '파일 업로드 진행 중... {progress}% 완료',
        downloadComplete: '{fileName} 다운로드가 완료되었습니다',
        errorOccurred: '오류 발생: {errorCode} - {errorMessage}',
        confirmDelete: '"{itemName}"을(를) 정말로 삭제하시겠습니까?\\n이 작업은 되돌릴 수 없습니다.',
        batchOperation: '{count}개의 항목에 대해 {operation} 작업을 수행하시겠습니까?'
      }
    }
  }
}
</script>
`,
      expectedSpecialTexts: [
        '문서 관리 시스템',
        '다양한 형태의 문서를 관리하고 검색할 수 있습니다',
        '미디어 라이브러리',
        '이미지, 동영상, 음악 파일을 체계적으로 관리합니다'
      ]
    },
    {
      name: '다양한 인코딩과 특수 문자',
      type: 'js',
      content: `
// 이모지와 한글 조합
const messages = {
  welcome: '🎉 환영합니다! 새로운 여정을 시작해보세요',
  success: '✅ 작업이 성공적으로 완료되었습니다',
  warning: '⚠️ 주의: 중요한 데이터가 손실될 수 있습니다',
  error: '❌ 오류: 예상치 못한 문제가 발생했습니다',
  info: 'ℹ️ 정보: 새로운 업데이트를 확인하세요',
  loading: '⏳ 잠시만 기다려주세요...',
  complete: '🎊 모든 작업이 완료되었습니다!'
}

// 특수 문자가 포함된 경로와 URL
const paths = {
  home: '/홈페이지',
  profile: '/사용자/프로필',
  settings: '/설정/일반',
  help: '/도움말/자주묻는질문',
  contact: '/연락처/고객지원'
}

// 정규표현식과 한글
const patterns = {
  korean: /[가-힣]+/g,
  email: /^[가-힣a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^010-\d{4}-\d{4}$/
}

// 복잡한 템플릿 문자열
function generateReport(data) {
  return \`
📊 보고서 생성 완료

📅 생성일: \${new Date().toLocaleDateString()}
👤 사용자: \${data.username}
📈 처리된 항목: \${data.itemCount}개
⏰ 소요 시간: \${data.duration}초

📝 상세 내용:
\${data.items.map(item => \`• \${item.name}: \${item.status}\`).join('\\n')}

💡 참고사항:
- 모든 데이터는 암호화되어 저장됩니다
- 보고서는 30일간 보관됩니다  
- 문의사항이 있으시면 고객센터로 연락하세요
  \`
}

// 국제화 메시지
const i18nMessages = {
  'ko-KR': {
    greeting: '안녕하세요',
    farewell: '안녕히가세요',
    thankyou: '감사합니다'
  },
  'ko-KP': {
    greeting: '안녕하십니까',
    farewell: '안녕히 가십시오',
    thankyou: '고맙습니다'
  }
}
`,
      expectedSpecialTexts: [
        '환영합니다! 새로운 여정을 시작해보세요',
        '작업이 성공적으로 완료되었습니다',
        '주의: 중요한 데이터가 손실될 수 있습니다',
        '오류: 예상치 못한 문제가 발생했습니다'
      ]
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 테스트: ${testCase.name}`);
    
    try {
      let results;
      if (testCase.type === 'vue') {
        results = await scanner.scanVueFile('test.vue', testCase.content);
      } else {
        results = scanner.scanJSFile('test.js', testCase.content);
      }
      
      console.log(`  추출된 한글: ${results.length}개`);
      
      // 특수문자가 포함된 텍스트 확인
      const allTexts = testCase.type === 'vue' ? results.map(r => r.text) : results.map(r => r.text);
      const specialTexts = allTexts.filter(text => /[\/\-&+|]/.test(text));
      
      console.log(`  특수문자 포함 텍스트: ${specialTexts.length}개`);
      specialTexts.forEach((text, i) => {
        console.log(`    ${i + 1}. "${text}"`);
      });

      // 번역 매칭
      const matches = await translationMatcher.findMatches(allTexts);
      const arrayMatches = matches.filter(m => m.keyPath.startsWith('[') && m.keyPath.endsWith(']'));
      
      console.log(`  배열 형태 키: ${arrayMatches.length}개`);
      arrayMatches.forEach(am => {
        console.log(`    "${am.korean}" → ${am.keyPath}`);
      });

      const success = results.length > 0 && (specialTexts.length > 0 || arrayMatches.length > 0);
      stats.addResult(`Special: ${testCase.name}`, success, {
        extracted: results.length,
        specialTexts: specialTexts.length,
        arrayMatches: arrayMatches.length
      });

      console.log(`  결과: ${success ? '✅ 성공' : '❌ 실패'}\n`);

    } catch (error) {
      console.log(`  ❌ 오류: ${error.message}\n`);
      stats.addResult(`Special: ${testCase.name}`, false, { error: error.message });
    }
  }
}

async function testPerformance(scanner, translationMatcher, stats) {
  console.log('📋 5. 성능 테스트\n');

  console.log('🔍 테스트: 대용량 파일 처리');
  
  try {
    // 대용량 Vue 파일 생성
    const largeVueContent = `
<template>
  <div>
    ${Array.from({ length: 100 }, (_, i) => `
    <div class="item-${i}">
      <h3>항목 ${i + 1}</h3>
      <p>설명 ${i + 1}: 이것은 테스트용 항목입니다</p>
      <button>버튼 ${i + 1}</button>
      <span>상태: 활성/비활성</span>
    </div>`).join('')}
  </div>
</template>

<script>
export default {
  data() {
    return {
      items: [
        ${Array.from({ length: 100 }, (_, i) => `
        {
          id: ${i + 1},
          name: '항목 ${i + 1}',
          description: '설명 ${i + 1}: 상세한 정보입니다',
          status: '활성',
          category: '카테고리 ${i % 10 + 1}',
          tags: ['태그1', '태그2', '태그3']
        }`).join(',')}
      ],
      messages: {
        ${Array.from({ length: 50 }, (_, i) => `
        'msg${i + 1}': '메시지 ${i + 1}: 시스템에서 생성된 메시지입니다'`).join(',')}
      }
    }
  },
  methods: {
    ${Array.from({ length: 20 }, (_, i) => `
    method${i + 1}() {
      console.log('메서드 ${i + 1} 실행됨');
      alert('작업 ${i + 1}이 완료되었습니다');
      return '결과 ${i + 1}';
    }`).join(',')}
  }
}
</script>
`;

    const startTime = Date.now();
    const results = await scanner.scanVueFile('large-test.vue', largeVueContent);
    const scanTime = Date.now() - startTime;
    
    console.log(`  파일 크기: ${(largeVueContent.length / 1024).toFixed(1)}KB`);
    console.log(`  스캔 시간: ${scanTime}ms`);
    console.log(`  추출된 한글: ${results.length}개`);

    // 번역 매칭 성능 테스트
    const matchStartTime = Date.now();
    const allTexts = results.map(r => r.text);
    const matches = await translationMatcher.findMatches(allTexts);
    const matchTime = Date.now() - matchStartTime;
    
    console.log(`  매칭 시간: ${matchTime}ms`);
    console.log(`  매칭된 번역: ${matches.length}개`);

    const success = scanTime < 5000 && matchTime < 3000; // 5초, 3초 이내
    stats.addResult('Performance: 대용량 파일', success, {
      fileSize: largeVueContent.length,
      scanTime,
      matchTime,
      extracted: results.length,
      matched: matches.length
    });

    console.log(`  결과: ${success ? '✅ 성공' : '❌ 실패'}\n`);

  } catch (error) {
    console.log(`  ❌ 오류: ${error.message}\n`);
    stats.addResult('Performance: 대용량 파일', false, { error: error.message });
  }
}

// 스크립트 직접 실행 시에만 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testComprehensiveI18n();
}

export { testComprehensiveI18n }; 