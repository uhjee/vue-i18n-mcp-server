#!/usr/bin/env node

/**
 * Vue 파일 Script 섹션 한글 추출 테스트
 */

import { PatternScannerService } from '../dist/services/pattern-scanner.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testVueScriptExtraction() {
  console.log('🧪 Vue Script 섹션 한글 추출 테스트 시작\n');

  const scanner = new PatternScannerService();

  // 테스트 케이스 1: 기본 Options API
  await testOptionsAPI(scanner);
  
  // 테스트 케이스 2: Composition API (script setup)
  await testCompositionAPI(scanner);
  
  // 테스트 케이스 3: TypeScript + Composition API
  await testTypeScriptComposition(scanner);
}

async function testOptionsAPI(scanner) {
  console.log('📋 테스트 케이스 1: Options API\n');

  // 테스트용 Vue 파일 내용
  const vueContent = `
<template>
  <div>
    <h1>제목입니다</h1>
    <button @click="handleClick">버튼</button>
  </div>
</template>

<script>
export default {
  name: 'TestComponent',
  data() {
    return {
      message: '안녕하세요',
      title: '테스트 제목',
      description: '이것은 설명입니다',
      items: ['첫번째 항목', '두번째 항목', '세번째 항목']
    }
  },
  computed: {
    welcomeMessage() {
      return '환영합니다' + this.message;
    }
  },
  methods: {
    handleClick() {
      alert('클릭되었습니다');
      console.log('로그 메시지');
      this.$toast.success('성공적으로 처리되었습니다');
    },
    showConfirm() {
      const result = confirm('정말로 삭제하시겠습니까?');
      return result;
    },
    getData() {
      const errorMsg = '데이터 로딩 실패';
      const successMsg = \`성공: \${this.message}\`;
      return { errorMsg, successMsg };
    }
  },
  created() {
    // 주석: 이것은 주석입니다
    console.warn('컴포넌트가 생성되었습니다');
    /* 
     * 여러줄 주석
     * 테스트 주석입니다
     */
    this.initData();
  }
}
</script>

<style>
.test {
  /* CSS는 처리하지 않음 */
}
</style>
`;

  await runTest(scanner, vueContent, 'Options API', 14);
}

async function testCompositionAPI(scanner) {
  console.log('\n📋 테스트 케이스 2: Composition API (script setup)\n');

  const vueContent = `
<template>
  <div>
    <h1>{{ title }}</h1>
    <button @click="handleClick">{{ buttonText }}</button>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const message = ref('안녕하세요 Vue 3!')
const title = ref('컴포지션 API 테스트')
const buttonText = ref('클릭해주세요')

const items = ref([
  '첫 번째 아이템',
  '두 번째 아이템', 
  '세 번째 아이템'
])

const welcomeMessage = computed(() => {
  return '환영합니다: ' + message.value
})

const handleClick = () => {
  alert('버튼이 클릭되었습니다')
  console.log('클릭 이벤트 발생')
}

const showAlert = () => {
  const confirmResult = confirm('정말 실행하시겠습니까?')
  if (confirmResult) {
    alert('실행되었습니다')
  }
}

onMounted(() => {
  console.log('컴포넌트가 마운트되었습니다')
  console.warn('경고 메시지입니다')
})

// 템플릿 리터럴 테스트
const dynamicMessage = \`동적 메시지: \${message.value}\`
const multiLineMessage = \`
  여러줄 메시지:
  첫번째 줄
  두번째 줄
\`
</script>
`;

  await runTest(scanner, vueContent, 'Composition API', 12);
}

async function testTypeScriptComposition(scanner) {
  console.log('\n📋 테스트 케이스 3: TypeScript + Composition API\n');

  const vueContent = `
<template>
  <div>
    <h1>{{ title }}</h1>
    <button @click="handleClick">{{ buttonText }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface User {
  name: string
  email: string
}

const message = ref<string>('타입스크립트 테스트')
const title = ref<string>('TS 컴포지션 API')
const buttonText = ref<string>('타입 안전한 버튼')

const user = ref<User>({
  name: '사용자 이름',
  email: 'user@example.com'
})

const notifications: string[] = [
  '첫번째 알림',
  '두번째 알림',
  '세번째 알림'
]

const handleClick = (): void => {
  alert('타입스크립트 클릭 이벤트')
  console.log('TS 로그 메시지')
}

const getErrorMessage = (): string => {
  return '오류가 발생했습니다'
}

const validateUser = (user: User): boolean => {
  if (!user.name) {
    throw new Error('사용자 이름이 필요합니다')
  }
  return true
}

onMounted(() => {
  console.log('TS 컴포넌트 마운트 완료')
})

// 타입 어서션과 함께
const errorMsg = '데이터 처리 실패' as string
const successMsg: string = '성공적으로 저장되었습니다'
</script>
`;

  await runTest(scanner, vueContent, 'TypeScript Composition', 10);
}

async function runTest(scanner, vueContent, testName, expectedCount) {
  try {
    console.log(`📄 ${testName} 테스트 Vue 파일:`);
    console.log('=' .repeat(50));
    console.log(vueContent);
    console.log('=' .repeat(50));
    console.log('');

    // Vue 파일 스캔 실행
    const results = await scanner.scanVueFile('test.vue', vueContent);
    
    console.log('📊 추출 결과:');
    console.log(`총 ${results.length}개의 한글 텍스트가 발견되었습니다.\n`);

    // 섹션별로 분류
    const templateResults = results.filter(r => r.location.section === 'template');
    const scriptResults = results.filter(r => r.location.section === 'script');

    console.log('🔍 Template 섹션 결과:');
    if (templateResults.length > 0) {
      templateResults.forEach((result, index) => {
        console.log(`${index + 1}. "${result.text}" (라인 ${result.location.line})`);
      });
    } else {
      console.log('  - 한글 텍스트 없음');
    }

    console.log('\n🔍 Script 섹션 결과:');
    if (scriptResults.length > 0) {
      scriptResults.forEach((result, index) => {
        console.log(`${index + 1}. "${result.text}" (라인 ${result.location.line})`);
      });
    } else {
      console.log('  - ❌ 한글 텍스트 없음 (문제 발생!)');
    }

    // 결과 분석
    if (scriptResults.length === 0) {
      console.log(`\n❌ ${testName}: Script 섹션에서 한글을 전혀 찾지 못했습니다!`);
      return false;
    } else if (scriptResults.length < expectedCount) {
      console.log(`\n⚠️ ${testName}: 예상보다 적은 한글이 발견되었습니다. (발견: ${scriptResults.length}, 예상: ${expectedCount})`);
      return false;
    } else {
      console.log(`\n✅ ${testName}: 정상적으로 한글이 추출되었습니다! (${scriptResults.length}개)`);
      return true;
    }

  } catch (error) {
    console.error(`❌ ${testName} 테스트 실행 중 오류:`, error);
    return false;
  }
}

// 스크립트 직접 실행 시에만 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testVueScriptExtraction();
} 