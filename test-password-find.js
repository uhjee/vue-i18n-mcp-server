#!/usr/bin/env node

/**
 * '계정 관리' 케이스 테스트
 * 공백으로 분리된 한글이 올바르게 배열 형태로 변환되는지 확인
 */

import { TranslationMatcherService } from './dist/services/translation-matcher.js';
import { ProcessKoreanReplacementTool } from './dist/server/tools/process-korean-replacement.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAccountManagement() {
  console.log('🧪 "계정 관리" 케이스 테스트 시작\n');

  try {
    // 설정 생성
    const config = {
      projectRoot: path.resolve(__dirname),
      langFilePath: {
        ko: path.join(__dirname, 'tests/sample-files/ko.js'),
        en: path.join(__dirname, 'tests/sample-files/en.js'),
      },
    };

    // 번역 매칭 서비스 테스트
    console.log('1️⃣ 번역 매칭 서비스 테스트');
    const matcher = new TranslationMatcherService(config);
    await matcher.loadTranslations();

    const testTexts = ['계정 관리', '계정', '관리'];
    console.log('테스트 텍스트:', testTexts);

    const matches = await matcher.findMatches(testTexts);
    console.log('\n📊 매칭 결과:');
    matches.forEach((match, index) => {
      console.log(`${index + 1}. "${match.korean}" → ${match.keyPath} (신뢰도: ${(match.confidence * 100).toFixed(1)}%)`);
      console.log(`   영문: "${match.english}"`);
    });

    // 도구 테스트
    console.log('\n2️⃣ ProcessKoreanReplacementTool 테스트');
    const toolContext = {
      projectRoot: config.projectRoot,
      workspaceFiles: [],
      config: config,
    };

    // i18n 함수 설정을 VUE_I18N_WATCHALL로 변경
    process.env.I18N_FUNCTION_TYPE = 'VUE_I18N_WATCHALL';
    const tool = new ProcessKoreanReplacementTool(toolContext);

    // 테스트용 Vue 파일 내용
    const testVueContent = `
<template>
  <div>
    <h1>로그인</h1>
    <button>계정 관리</button>
    <input placeholder="계정" />
    <span>관리</span>
  </div>
</template>

<script>
export default {
  methods: {
    showAlert() {
      alert('계정 관리');
    }
  }
}
</script>`;

    const result = await tool.execute({
      fileName: 'test.vue',
      fileContent: testVueContent,
      fileType: 'vue'
    });

    console.log('\n📝 도구 실행 결과:');
    console.log(`발견된 한글: ${result.summary.totalKoreanTexts}개`);
    
    if (result.translationMatches) {
      console.log('\n✅ 매칭된 번역:');
      result.translationMatches.forEach((match, index) => {
        console.log(`${index + 1}. "${match.korean}" → ${match.keyPath}`);
      });
    }

    console.log('\n💡 추천사항:');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // 특별히 '계정 관리' 케이스 확인
    const accountManagementMatch = result.translationMatches?.find(m => m.korean === '계정 관리');
    if (accountManagementMatch) {
      console.log('\n🎯 "계정 관리" 매칭 결과:');
      console.log(`키 경로: ${accountManagementMatch.keyPath}`);
      console.log(`신뢰도: ${(accountManagementMatch.confidence * 100).toFixed(1)}%`);
      
      // 배열 형태인지 확인
      if (accountManagementMatch.keyPath.startsWith('[') && accountManagementMatch.keyPath.endsWith(']')) {
        console.log('✅ 올바른 배열 형태로 생성됨!');
        
        // 추천사항에서 $localeMessage 사용 예시 확인
        const hasLocaleMessageExample = result.recommendations.some(rec => 
          rec.includes('$localeMessage') && rec.includes('계정 관리')
        );
        
        if (hasLocaleMessageExample) {
          console.log('✅ $localeMessage 배열 형태 예시가 추천사항에 포함됨!');
          
          // 실제 변환 예시 찾기
          const conversionExample = result.recommendations.find(rec => 
            rec.includes('📝 변환 예시:') && rec.includes('계정 관리')
          );
          if (conversionExample) {
            console.log(`📝 실제 변환 예시: ${conversionExample}`);
          }
        } else {
          console.log('❌ $localeMessage 배열 형태 예시가 추천사항에 없음');
        }
      } else {
        console.log('❌ 배열 형태로 생성되지 않음');
      }
    } else {
      console.log('\n❌ "계정 관리" 매칭 결과를 찾을 수 없음');
    }

    console.log('\n🎉 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testAccountManagement(); 