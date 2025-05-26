#!/usr/bin/env node

/**
 * Vue Script 섹션 한글 추출 디버깅 테스트
 */

import { PatternScannerService } from '../dist/services/pattern-scanner.js';

const testVueContent = `<template>
  <div>
    <h1>템플릿 한글</h1>
    <button>템플릿 버튼</button>
  </div>
</template>

<script>
export default {
  name: 'TestComponent',
  data() {
    return {
      message: '스크립트 메시지',
      title: '스크립트 제목',
      items: [
        { name: '첫번째 아이템', value: 1 },
        { name: '두번째 아이템', value: 2 }
      ]
    }
  },
  methods: {
    showAlert() {
      alert('알림 메시지');
      console.log('콘솔 메시지');
    },
    getText() {
      const text = '로컬 변수 텍스트';
      return '리턴 값';
    }
  },
  computed: {
    computedMessage() {
      return \`템플릿 리터럴 \${this.message}\`;
    }
  }
}
</script>

<style>
/* 스타일은 무시 */
</style>`;

async function debugVueScript() {
  console.log('🧪 Vue Script 섹션 한글 추출 디버깅 시작\n');

  const scanner = new PatternScannerService();
  
  try {
    console.log('📄 테스트 Vue 파일 내용:');
    console.log(testVueContent);
    console.log('\n' + '='.repeat(80) + '\n');

    // Vue 파일 스캔
    const extractions = await scanner.scanVueFile('test.vue', testVueContent);
    
    console.log('📊 추출 결과:');
    console.log(`- 총 추출된 항목: ${extractions.length}개\n`);

    // 섹션별로 분류하여 출력
    const templateExtractions = extractions.filter(e => e.location.section === 'template');
    const scriptExtractions = extractions.filter(e => e.location.section === 'script');

    console.log('🎨 Template 섹션 추출 결과:');
    console.log(`- 추출된 항목: ${templateExtractions.length}개`);
    templateExtractions.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.text}" (라인 ${item.location.line}:${item.location.column})`);
    });

    console.log('\n⚙️ Script 섹션 추출 결과:');
    console.log(`- 추출된 항목: ${scriptExtractions.length}개`);
    if (scriptExtractions.length === 0) {
      console.log('  ❌ Script 섹션에서 한글이 추출되지 않았습니다!');
    } else {
      scriptExtractions.forEach((item, index) => {
        console.log(`  ${index + 1}. "${item.text}" (라인 ${item.location.line}:${item.location.column})`);
        console.log(`     컨텍스트: ${item.context.variableContext || 'unknown'}`);
      });
    }

    // 예상되는 Script 섹션 한글들
    const expectedScriptKorean = [
      '스크립트 메시지',
      '스크립트 제목', 
      '첫번째 아이템',
      '두번째 아이템',
      '알림 메시지',
      '콘솔 메시지',
      '로컬 변수 텍스트',
      '리턴 값',
      '템플릿 리터럴'
    ];

    console.log('\n🎯 예상되는 Script 섹션 한글:');
    expectedScriptKorean.forEach((text, index) => {
      const found = scriptExtractions.some(e => e.text.includes(text) || text.includes(e.text));
      console.log(`  ${index + 1}. "${text}" ${found ? '✅' : '❌'}`);
    });

    // 추가 디버깅: SFC 파서가 스크립트를 제대로 추출하는지 확인
    console.log('\n🔍 SFC 파서 디버깅:');
    const { parse } = await import('@vue/compiler-sfc');
    const { descriptor } = parse(testVueContent);
    
    console.log('- Template 존재:', !!descriptor.template);
    console.log('- Script 존재:', !!descriptor.script);
    console.log('- ScriptSetup 존재:', !!descriptor.scriptSetup);
    
    if (descriptor.script) {
      console.log('- Script 내용 길이:', descriptor.script.content.length);
      console.log('- Script 시작 라인:', descriptor.script.loc.start.line);
      console.log('- Script 내용 미리보기:');
      const scriptLines = descriptor.script.content.split('\n');
      scriptLines.slice(0, 5).forEach((line, index) => {
        console.log(`    ${index + 1}: ${line}`);
      });
    }

  } catch (error) {
    console.error('❌ 디버깅 중 오류 발생:', error);
  }
}

// 스크립트 실행
debugVueScript().catch(console.error); 