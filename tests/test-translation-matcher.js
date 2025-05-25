#!/usr/bin/env node

/**
 * 번역 매칭 서비스 테스트
 * ko.js, en.js 파일과 한글 텍스트 매칭 기능을 테스트합니다
 */

import { TranslationMatcherService } from '../dist/services/translation-matcher.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testTranslationMatcher() {
  console.log('🧪 번역 매칭 서비스 테스트 시작\n');

  try {
    // 설정 생성
    const config = {
      projectRoot: path.resolve(__dirname, '..'),
      langFilePath: {
        ko: path.join(__dirname, 'sample-files/ko.js'),
        en: path.join(__dirname, 'sample-files/en.js'),
      },
    };

    // 서비스 초기화
    const matcher = new TranslationMatcherService(config);

    // 테스트할 한글 텍스트들
    const testTexts = [
      '로그인',              // 정확한 매칭
      '로그아웃',            // 정확한 매칭
      '저장',               // 정확한 매칭
      '사용자 프로필',       // 정확한 매칭
      '로딩 중...',         // 정확한 매칭
      '오류가 발생했습니다', // 정확한 매칭
      '회원가입',           // 매칭되지 않음
      '비밀번호 찾기',      // 매칭되지 않음
      '로그',               // 부분 매칭 (로그인과 매칭 가능)
      '사용자',             // 부분 매칭 (사용자 프로필과 매칭 가능)
      '정보',               // 정확한 매칭
      '경고',               // 정확한 매칭
    ];

    console.log('📋 테스트할 한글 텍스트:');
    testTexts.forEach((text, index) => {
      console.log(`  ${index + 1}. "${text}"`);
    });
    console.log();

    // 번역 파일 로드
    console.log('📁 번역 파일 로딩...');
    await matcher.loadTranslations();

    // 사용 가능한 키 확인
    const availableKeys = matcher.getAvailableKeys();
    console.log(`✅ 사용 가능한 번역 키: ${availableKeys.length}개`);
    console.log('처음 10개:', availableKeys.slice(0, 10));
    console.log();

    // 매칭 수행
    console.log('🔍 번역 매칭 수행...');
    const matches = await matcher.findMatches(testTexts);
    const unmatched = await matcher.getUnmatchedTexts(testTexts);

    // 결과 출력
    console.log('📊 매칭 결과:');
    console.log(`- 총 텍스트: ${testTexts.length}개`);
    console.log(`- 매칭 성공: ${matches.length}개`);
    console.log(`- 미매칭: ${unmatched.length}개`);
    console.log(`- 매칭률: ${((matches.length / testTexts.length) * 100).toFixed(1)}%`);
    console.log();

    if (matches.length > 0) {
      console.log('✅ 매칭된 번역:');
      matches.forEach((match, index) => {
        const confidence = (match.confidence * 100).toFixed(1);
        console.log(`  ${index + 1}. "${match.korean}" → ${match.keyPath} (${confidence}%)`);
        if (match.english) {
          console.log(`     영문: "${match.english}"`);
        }
      });
      console.log();
    }

    if (unmatched.length > 0) {
      console.log('❌ 매칭되지 않은 텍스트:');
      unmatched.forEach((text, index) => {
        console.log(`  ${index + 1}. "${text}"`);
      });
      console.log();
    }

    // 신뢰도별 분석
    const highConfidence = matches.filter(m => m.confidence >= 0.95);
    const mediumConfidence = matches.filter(m => m.confidence >= 0.8 && m.confidence < 0.95);
    const lowConfidence = matches.filter(m => m.confidence < 0.8);

    console.log('📈 신뢰도 분석:');
    console.log(`- 높은 신뢰도 (95% 이상): ${highConfidence.length}개`);
    console.log(`- 중간 신뢰도 (80-95%): ${mediumConfidence.length}개`);
    console.log(`- 낮은 신뢰도 (80% 미만): ${lowConfidence.length}개`);

    console.log('\n🎉 번역 매칭 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시에만 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testTranslationMatcher();
} 