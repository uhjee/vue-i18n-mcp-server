/**
 * ✅ 핵심 테스트: 키 네임스페이스 자동 정규화
 * 
 * 🎯 목적:
 * - AI가 LOGIN.SIGNUP, AUTH.FIND_PASSWORD 같은 잘못된 키를 생성해도
 * - 자동으로 WATCHALL.WORD.SIGNUP, WATCHALL.WORD.FIND_PASSWORD로 정규화
 * 
 * 🔧 테스트 내용:
 * 1. 의도적으로 잘못된 네임스페이스 키 생성 (Mock AI 응답)
 * 2. KeyGeneratorService의 정규화 로직 확인
 * 3. 실제 파일 업데이트로 올바른 경로 확인
 * 
 * 🚀 실행: node test-namespace-fix.js
 */

import path from 'path';
import { FindExistingTranslationsTool } from './dist/server/tools/find-existing-translations.js';
import { ProcessTranslationResponseTool } from './dist/server/tools/process-translation-response.js';

async function testNamespaceFix() {
  console.log('🔧 키 네임스페이스 수정 테스트');
  console.log('='.repeat(60));

  const config = {
    projectRoot: process.cwd(),
    langFilePath: {
      ko: path.join(process.cwd(), 'tests/sample-files/ko.js'),
      en: path.join(process.cwd(), 'tests/sample-files/en.js')
    }
  };

  const toolContext = {
    projectRoot: config.projectRoot,
    workspaceFiles: [],
    config: config
  };

  const findTool = new FindExistingTranslationsTool(toolContext);
  const processTool = new ProcessTranslationResponseTool(toolContext);

  // 로그인 관련 단어들 (AI가 LOGIN. 접두사를 만들 가능성이 높음)
  const testWords = [
    "회원가입",      // AI가 LOGIN.SIGNUP을 만들 수 있음
    "비밀번호찾기",   // AI가 LOGIN.FIND_PASSWORD를 만들 수 있음
    "자동로그인"      // AI가 LOGIN.AUTO_LOGIN을 만들 수 있음
  ];

  console.log(`📝 테스트 단어들:`);
  testWords.forEach((word, idx) => {
    console.log(`  ${idx + 1}. "${word}"`);
  });

  try {
    // 1. 기존 번역 확인
    console.log('\n🔍 1단계: 기존 번역 확인');
    const findResult = await findTool.execute({ 
      koreanTexts: testWords 
    });
    
    console.log(`📊 결과:`);
    console.log(`  - 기존 매칭: ${findResult.matches?.length || 0}개`);
    console.log(`  - 미매칭: ${findResult.unmatched?.length || 0}개`);

    if (findResult.unmatched && findResult.unmatched.length > 0) {
      console.log(`\n🤖 2단계: 잘못된 네임스페이스를 가진 Mock AI 응답 테스트`);

      // AI가 잘못된 접두사를 만드는 상황 시뮬레이션
      const mockBadResponse = {
        translations: findResult.unmatched.map(korean => ({
          korean: korean,
          keyOptions: [{
            keyName: getBadKeyName(korean), // 의도적으로 잘못된 접두사
            confidence: 0.90,
            reasoning: "컨텍스트 기반 키 생성",
            category: "GENERAL"
          }],
          english: {
            N: getEnglishTranslation(korean),
            V: undefined
          },
          partOfSpeech: "N",
          isSpecialCharacter: false
        })),
        summary: {
          total: findResult.unmatched.length,
          processed: findResult.unmatched.length,
          failed: 0
        }
      };

      console.log(`📤 Mock AI 응답 (잘못된 네임스페이스):`);
      mockBadResponse.translations.forEach((trans, idx) => {
        console.log(`  ${idx + 1}. "${trans.korean}" → ${trans.keyOptions[0].keyName} ❌`);
      });

      // 3. AI 응답 처리 및 정규화 확인
      console.log('\n🔄 3단계: AI 응답 처리 (정규화 확인)');
      
      const processResult = await processTool.execute({
        aiResponse: JSON.stringify(mockBadResponse),
        validateOnly: true // 검증만 수행
      });

      console.log(`\n✅ 정규화 결과:`);
      console.log(`  - 검증 성공: ${processResult.validationResult?.isValid ? 'YES' : 'NO'}`);

      if (processResult.parsedData?.translations) {
        console.log(`\n🔑 정규화된 키들:`);
        processResult.parsedData.translations.forEach((trans, idx) => {
          const originalKey = mockBadResponse.translations[idx].keyOptions[0].keyName;
          const normalizedKey = trans.keyOptions[0]?.keyName;
          const isFixed = !normalizedKey.includes('.');
          
          console.log(`  ${idx + 1}. "${trans.korean}"`);
          console.log(`     원본: ${originalKey} ❌`);
          console.log(`     정규화: ${normalizedKey} ${isFixed ? '✅' : '❌'}`);
          console.log(`     최종 경로: WATCHALL.WORD.${normalizedKey}`);
        });
      }

      // 4. 실제 파일 업데이트 테스트
      if (processResult.validationResult?.isValid) {
        console.log('\n📝 4단계: 실제 파일 업데이트 테스트');
        
        const updateResult = await processTool.execute({
          aiResponse: JSON.stringify(mockBadResponse),
          validateOnly: false,
          autoApply: true
        });

        console.log(`\n📁 파일 업데이트 결과:`);
        console.log(`  - 업데이트 성공: ${updateResult.updateResult?.success ? 'YES' : 'NO'}`);
        console.log(`  - 추가된 키: ${updateResult.updateResult?.updatedKeys?.length || 0}개`);

        if (updateResult.updateResult?.updatedKeys) {
          console.log(`\n🎯 최종 키 경로들:`);
          updateResult.updateResult.updatedKeys.forEach((key, idx) => {
            console.log(`  ${idx + 1}. WATCHALL.WORD.${key}`);
          });
        }

        if (updateResult.updateResult?.errors && updateResult.updateResult.errors.length > 0) {
          console.log(`\n❌ 업데이트 오류들:`);
          updateResult.updateResult.errors.forEach((error, idx) => {
            console.log(`  ${idx + 1}. ${error}`);
          });
        }
      }

      if (processResult.validationResult?.errors && processResult.validationResult.errors.length > 0) {
        console.log(`\n❌ 검증 오류들:`);
        processResult.validationResult.errors.forEach((error, idx) => {
          console.log(`  ${idx + 1}. ${error}`);
        });
      }

    } else {
      console.log('\n✅ 모든 단어가 이미 존재합니다.');
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('상세:', error);
  }

  console.log('\n🎉 키 네임스페이스 수정 테스트 완료!');
}

/**
 * 의도적으로 잘못된 키 이름 생성 (AI가 만들 수 있는 실수)
 */
function getBadKeyName(korean) {
  const badMappings = {
    "회원가입": "LOGIN.SIGNUP",           // 잘못된 접두사
    "비밀번호찾기": "AUTH.FIND_PASSWORD",  // 잘못된 접두사  
    "자동로그인": "LOGIN.AUTO_LOGIN"      // 잘못된 접두사
  };
  
  return badMappings[korean] || `CONTEXT.${korean.toUpperCase()}`;
}

/**
 * 영어 번역 생성
 */
function getEnglishTranslation(korean) {
  const translations = {
    "회원가입": "Signup",
    "비밀번호찾기": "Find Password", 
    "자동로그인": "Auto Login"
  };
  
  return translations[korean] || korean;
}

// 테스트 실행
testNamespaceFix().catch(console.error); 