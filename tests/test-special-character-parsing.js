#!/usr/bin/env node

/**
 * 특수문자가 포함된 한글 텍스트 파싱 테스트
 * '로그인/비밀번호' → ['WATCHALL.WORD.LOGIN', '/', 'WATCHALL.WORD.PASSWORD'] 와 같은 케이스
 */

import { PatternScannerService } from '../dist/services/pattern-scanner.js';
import { TranslationMatcherService } from '../dist/services/translation-matcher.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 테스트용 번역 파일 생성
async function createTestTranslationFiles() {
  const testDir = path.join(__dirname, 'temp-translations');
  await fs.ensureDir(testDir);
  
  const koContent = `export default {
  WATCHALL: {
    WORD: {
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
      BACK: '뒤로가기'
    }
  }
};`;

  const enContent = `export default {
  WATCHALL: {
    WORD: {
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
      BACK: 'Back'
    }
  }
};`;

  await fs.writeFile(path.join(testDir, 'ko.js'), koContent);
  await fs.writeFile(path.join(testDir, 'en.js'), enContent);
  
  return testDir;
}

async function testSpecialCharacterParsing() {
  console.log('🧪 특수문자 포함 한글 텍스트 파싱 테스트 시작\n');

  const scanner = new PatternScannerService();
  
  // 테스트용 번역 파일 생성
  const testDir = await createTestTranslationFiles();
  
  const config = {
    projectRoot: testDir,
    langFilePath: {
      ko: path.join(testDir, 'ko.js'),
      en: path.join(testDir, 'en.js')
    }
  };
  
  const translationMatcher = new TranslationMatcherService(config);

  // 테스트 케이스들
  const testCases = [
    {
      name: '슬래시 구분자',
      vueContent: `
<template>
  <div>
    <h1>로그인/비밀번호</h1>
    <input placeholder="사용자/프로필" />
    <button>저장/확인</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      title: '로그인/비밀번호 관리',
      message: '사용자/프로필 설정',
      actions: ['저장/삭제', '확인/취소']
    }
  },
  methods: {
    handleAction() {
      alert('검색/설정 완료');
      console.log('홈/뒤로가기');
    }
  }
}
</script>
`,
      expectedMixedTexts: [
        '로그인/비밀번호',
        '사용자/프로필', 
        '저장/확인',
        '로그인/비밀번호 관리',
        '사용자/프로필 설정',
        '저장/삭제',
        '확인/취소',
        '검색/설정 완료',
        '홈/뒤로가기'
      ]
    },
    {
      name: '하이픈 구분자',
      vueContent: `
<template>
  <div>
    <h1>로그인-비밀번호</h1>
    <span>사용자-프로필</span>
  </div>
</template>

<script>
export default {
  data() {
    return {
      title: '로그인-비밀번호-확인',
      subtitle: '사용자-프로필-설정'
    }
  }
}
</script>
`,
      expectedMixedTexts: [
        '로그인-비밀번호',
        '사용자-프로필',
        '로그인-비밀번호-확인',
        '사용자-프로필-설정'
      ]
    },
    {
      name: '복합 특수문자',
      vueContent: `
<template>
  <div>
    <h1>로그인 & 비밀번호</h1>
    <p>사용자 + 프로필</p>
    <span>저장 | 삭제</span>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: '로그인 & 비밀번호 체크',
      info: '사용자 + 프로필 업데이트',
      options: '저장 | 삭제 | 취소'
    }
  }
}
</script>
`,
      expectedMixedTexts: [
        '로그인 & 비밀번호',
        '사용자 + 프로필',
        '저장 | 삭제',
        '로그인 & 비밀번호 체크',
        '사용자 + 프로필 업데이트',
        '저장 | 삭제 | 취소'
      ]
    }
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    console.log(`\n📋 테스트 케이스: ${testCase.name}\n`);
    
    try {
      // 1. 한글 텍스트 추출
      const results = await scanner.scanVueFile('test.vue', testCase.vueContent);
      console.log(`📊 추출된 한글 텍스트: ${results.length}개`);
      
      // 모든 추출된 한글 텍스트 출력
      results.forEach((result, index) => {
        console.log(`${index + 1}. "${result.text}" (${result.location.section}, 라인 ${result.location.line})`);
      });

      // 2. 번역 매칭 수행
      console.log('\n🔍 번역 매칭 결과:');
      await translationMatcher.loadTranslations();
      
      const allKoreanTexts = results.map(r => r.text);
      const matches = await translationMatcher.findMatches(allKoreanTexts);
      const unmatchedTexts = await translationMatcher.getUnmatchedTexts(allKoreanTexts);

      console.log(`✅ 매칭된 번역: ${matches.length}개`);
      matches.forEach((match, index) => {
        console.log(`${index + 1}. "${match.korean}" → ${match.keyPath} (신뢰도: ${(match.confidence * 100).toFixed(1)}%)`);
        if (match.english) {
          console.log(`   영문: "${match.english}"`);
        }
      });

      console.log(`\n❌ 미매칭 텍스트: ${unmatchedTexts.length}개`);
      unmatchedTexts.forEach((text, index) => {
        console.log(`${index + 1}. "${text}"`);
      });

      // 3. 특수문자 포함 텍스트 분석
      console.log('\n🔧 특수문자 포함 텍스트 분석:');
      const mixedTexts = allKoreanTexts.filter(text => 
        /[\/\-&+|]/.test(text) // 특수문자가 포함된 텍스트
      );

      console.log(`특수문자 포함 텍스트: ${mixedTexts.length}개`);
      
      for (const mixedText of mixedTexts) {
        console.log(`\n분석 대상: "${mixedText}"`);
        
        // 매칭 결과 확인
        const matchResult = matches.find(m => m.korean === mixedText);
        if (matchResult) {
          console.log(`  → 매칭됨: ${matchResult.keyPath}`);
          
          // 배열 형태 키인지 확인
          if (matchResult.keyPath.startsWith('[') && matchResult.keyPath.endsWith(']')) {
            console.log(`  → ✅ 배열 형태 키 생성됨!`);
            
            // 배열 내용 파싱
            const arrayContent = matchResult.keyPath.slice(1, -1); // [ ] 제거
            const elements = arrayContent.split(', ');
            console.log(`  → 배열 요소들:`);
            elements.forEach((element, idx) => {
              console.log(`     ${idx + 1}. ${element}`);
            });
            
            // $localeMessage 사용 예시 생성
            const localeMessageCall = `$localeMessage([${arrayContent}])`;
            console.log(`  → Vue 템플릿 사용법: {{ ${localeMessageCall} }}`);
            
          } else {
            console.log(`  → ⚠️ 단일 키로 매칭됨: ${matchResult.keyPath}`);
          }
        } else {
          console.log(`  → ❌ 매칭되지 않음`);
          
          // 수동으로 특수문자 분할 분석 시도
          console.log(`  → 수동 분할 분석:`);
          const parts = mixedText.split(/([\/\-&+|])/).filter(part => part.trim());
          
          const analyzedParts = [];
          for (const part of parts) {
            const trimmedPart = part.trim();
            if (/[\/\-&+|]/.test(trimmedPart)) {
              // 특수문자는 그대로 유지
              analyzedParts.push(`'${trimmedPart}'`);
              console.log(`     특수문자: '${trimmedPart}'`);
            } else {
              // 한글 부분은 번역 키 찾기
              const partMatch = matches.find(m => m.korean === trimmedPart);
              if (partMatch) {
                analyzedParts.push(partMatch.keyPath);
                console.log(`     한글 → 키: "${trimmedPart}" → ${partMatch.keyPath}`);
              } else {
                analyzedParts.push(`'${trimmedPart}'`);
                console.log(`     미매칭 한글: "${trimmedPart}" → '${trimmedPart}'`);
              }
            }
          }
          
          if (analyzedParts.length > 1) {
            const suggestedArray = `[${analyzedParts.join(', ')}]`;
            console.log(`  → 💡 제안되는 배열 형태: ${suggestedArray}`);
            console.log(`  → Vue 템플릿 사용법: {{ $localeMessage(${suggestedArray}) }}`);
          }
        }
      }

      // 테스트 케이스 성공 여부 확인
      const foundMixedTexts = mixedTexts.length;
      const expectedMixedTexts = testCase.expectedMixedTexts.length;
      
      if (foundMixedTexts >= expectedMixedTexts * 0.8) { // 80% 이상 찾으면 성공
        console.log(`\n✅ ${testCase.name} 테스트 통과! (${foundMixedTexts}/${expectedMixedTexts})`);
      } else {
        console.log(`\n❌ ${testCase.name} 테스트 실패! (${foundMixedTexts}/${expectedMixedTexts})`);
        allPassed = false;
      }

    } catch (error) {
      console.error(`❌ ${testCase.name} 테스트 중 오류:`, error);
      allPassed = false;
    }
  }

  // 정리
  await fs.remove(testDir);

  console.log('\n📋 전체 테스트 결과:');
  if (allPassed) {
    console.log('✅ 모든 특수문자 파싱 테스트 통과!');
  } else {
    console.log('❌ 일부 테스트 실패');
  }
  
  return allPassed;
}

// 스크립트 직접 실행 시에만 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testSpecialCharacterParsing();
}

export { testSpecialCharacterParsing }; 