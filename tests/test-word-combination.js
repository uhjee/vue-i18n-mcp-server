/**
 * 공백 분리 단어 조합 매칭 테스트
 */

import { TranslationMatcherService } from '../dist/services/translation-matcher.js';
import path from 'path';

async function testWordCombination() {
  console.log('🧪 공백 분리 단어 조합 매칭 테스트 시작\n');
  
  // 테스트 설정
  const config = {
    projectRoot: process.cwd(),
    langFilePath: {
      ko: path.join(process.cwd(), 'tests/sample-files/ko.js'),
      en: path.join(process.cwd(), 'tests/sample-files/en.js')
    }
  };

  const matcher = new TranslationMatcherService(config);

  // 테스트할 한글 텍스트들
  const testTexts = [
    '로그인',          // 전체 매칭 (기존)
    '비밀번호',        // 전체 매칭 (기존)
    '찾기',            // 전체 매칭 (기존)
    '비밀번호 찾기',   // 공백 분리 조합 매칭 (새 기능!)
    '로그인 아이디',   // 공백 분리 조합 매칭
    '비밀번호 변경',   // 부분 매칭 (비밀번호만 매칭)
    '회원가입',        // 매칭 없음
  ];

  try {
    console.log('📋 테스트할 한글 텍스트:');
    testTexts.forEach((text, index) => {
      console.log(`  ${index + 1}. "${text}"`);
    });
    console.log('');

    // 번역 파일 로드
    console.log('📁 번역 파일 로딩...');
    await matcher.loadTranslations();
    
    // 사용 가능한 키 확인
    const availableKeys = matcher.getAvailableKeys();
    console.log(`✅ 사용 가능한 번역 키: ${availableKeys.length}개`);
    console.log(`키 목록: ${availableKeys.join(', ')}`);
    console.log('');

    // 매칭 수행
    console.log('🔍 매칭 수행...');
    const matches = await matcher.findMatches(testTexts);
    
    console.log(`📊 매칭 결과:`);
    console.log(`- 총 텍스트: ${testTexts.length}개`);
    console.log(`- 매칭 성공: ${matches.length}개`);
    console.log(`- 미매칭: ${testTexts.length - matches.length}개`);
    console.log(`- 매칭률: ${((matches.length / testTexts.length) * 100).toFixed(1)}%`);
    console.log('');

    if (matches.length > 0) {
      console.log('✅ 매칭된 번역:');
      matches.forEach((match, index) => {
        const type = match.keyPath.includes('_') ? '(조합)' : '(단일)';
        const confidence = `${(match.confidence * 100).toFixed(1)}%`;
        console.log(`  ${index + 1}. "${match.korean}" → ${match.keyPath} ${type}`);
        console.log(`     영문: "${match.english}"`);
        console.log(`     신뢰도: ${confidence}`);
        console.log('');
      });
    }

    // 미매칭 텍스트
    const matchedTexts = new Set(matches.map(m => m.korean));
    const unmatched = testTexts.filter(text => !matchedTexts.has(text));
    
    if (unmatched.length > 0) {
      console.log('❌ 매칭되지 않은 텍스트:');
      unmatched.forEach((text, index) => {
        console.log(`  ${index + 1}. "${text}"`);
      });
      console.log('');
    }

    // 결과 검증
    const combinationMatches = matches.filter(m => m.keyPath.includes('[') && m.keyPath.includes(']'));
    
    console.log('🎯 공백 분리 매칭 성능:');
    console.log(`- 조합 매칭 성공: ${combinationMatches.length}개`);
    
    if (combinationMatches.length > 0) {
      console.log('✅ 조합 매칭 성공! 공백으로 분리된 단어들이 개별 매칭되어 배열 형태로 조합되었습니다.');
      combinationMatches.forEach(match => {
        console.log(`   "${match.korean}" → ${match.keyPath}`);
      });
    } else {
      console.log('❌ 조합 매칭 실패. 공백 분리 기능을 확인해주세요.');
    }

    console.log('\n🎉 공백 분리 단어 조합 매칭 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

testWordCombination(); 