/**
 * 직접 도구 호출 테스트 - 개선된 변환 예시 확인
 */

import { ProcessKoreanReplacementTool } from '../dist/server/tools/process-korean-replacement.js';
import path from 'path';

const TEST_SAMPLE = `<template>
  <div>
    <h1>로그인</h1>
    <button>비밀번호 찾기</button>
    <input placeholder="아이디" />
  </div>
</template>

<script>
export default {
  methods: {
    handlePasswordFind() {
      console.log('비밀번호 찾기');
    }
  }
}
</script>`;

async function testDirectTool() {
  console.log('🧪 직접 도구 호출 테스트 (공백 분리 배열 매칭 확인)');
  console.log('=' .repeat(60));
  
  // 환경변수 직접 설정
  process.env.LOCALES_PATH = path.join(process.cwd(), 'tests/locales');
  process.env.I18N_FUNCTION_TYPE = 'VUE_I18N_WATCHALL';
  
  // 도구 컨텍스트 설정
  const context = {
    config: {
      projectRoot: process.cwd(),
      langFilePath: {
        ko: path.join(process.cwd(), 'tests/sample-files/ko.js'),
        en: path.join(process.cwd(), 'tests/sample-files/en.js')
      }
    },
    env: {
      I18N_FUNCTION_TYPE: 'VUE_I18N_WATCHALL'
    }
  };
  
  // 도구 생성 및 실행
  const tool = new ProcessKoreanReplacementTool(context);
  
  try {
    console.log('📋 테스트 입력:');
    console.log('- 파일명: TestPasswordFind.vue');
    console.log('- 한글 텍스트: "로그인", "비밀번호 찾기", "아이디"');
    console.log('- i18n 함수 타입: VUE_I18N_WATCHALL ($localeMessage)');
    console.log('');
    
    const result = await tool.execute({
      fileName: 'TestPasswordFind.vue',
      fileContent: TEST_SAMPLE,
      fileType: 'vue'
    });
    
    console.log('📊 결과 분석:');
    console.log(`- 발견된 한글 텍스트: ${result.summary.totalKoreanTexts}개`);
    console.log(`- 처리 시간: ${result.summary.processingTime}ms`);
    
    if (result.translationMatches && result.translationMatches.length > 0) {
      console.log(`- 매칭된 번역: ${result.translationMatches.length}개`);
      console.log('\n✅ 매칭된 번역들:');
      result.translationMatches.forEach((match, index) => {
        const type = match.keyPath.startsWith('[') ? '(배열조합)' : '(단일)';
        console.log(`  ${index + 1}. "${match.korean}" → ${match.keyPath} ${type}`);
      });
    }
    
    console.log('\n🎯 추천사항 (배열 형태 변환 예시 확인):');
    console.log('=' .repeat(60));
    
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    // 검증: 변환 예시 포함 여부
    const hasConversionExample = result.recommendations.some(rec => 
      rec.includes('📝 변환 예시:')
    );
    
    const hasLocaleMessage = result.recommendations.some(rec => 
      rec.includes('$localeMessage')
    );
    
    const hasConfigInfo = result.recommendations.some(rec => 
      rec.includes('⚙️ 현재 i18n 함수 설정:')
    );
    
    console.log('\n✅ 검증 결과:');
    console.log(`- 구체적인 변환 예시 포함: ${hasConversionExample ? '✅' : '❌'}`);
    console.log(`- $localeMessage 함수 사용: ${hasLocaleMessage ? '✅' : '❌'}`);
    console.log(`- i18n 함수 설정 안내: ${hasConfigInfo ? '✅' : '❌'}`);
    
    if (hasConversionExample && hasLocaleMessage && hasConfigInfo) {
      console.log('\n🎉 성공: 모든 개선사항이 적용되었습니다!');
      console.log('💡 이제 Copilot이 $localeMessage를 사용하도록 가이드됩니다');
    } else {
      console.log('\n⚠️ 일부 개선사항이 누락되었습니다');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

testDirectTool(); 