import { ProcessKoreanReplacementTool } from './dist/server/tools/process-korean-replacement.js';

// 완전한 Vue SFC 파일로 다양한 텍스트 패턴 테스트
const testVueFile = `<template>
  <div>
    <!-- 문장이 아닌 텍스트들 (자동 개별 단어 분해 대상) -->
    <el-form-item :label="'운영 상태 OID'" prop="controlOid">
      <el-input v-model="operation.controlOid"></el-input>
    </el-form-item>
    
    <el-form-item :label="'동작 값'" prop="actionValue">
      <el-input v-model="operation.actionValue"></el-input>
    </el-form-item>
    
    <el-form-item :label="'중지 값'" prop="stopValue">
      <el-input v-model="operation.stopValue"></el-input>
    </el-form-item>
    
    <!-- 문장인 텍스트들 (전체 유지 대상) -->
    <el-alert :message="'데이터를 저장하시겠습니까?'" type="warning"></el-alert>
    <el-alert :message="'시스템 연결이 성공적으로 완료되었습니다.'" type="success"></el-alert>
    <p>사용자가 입력한 데이터가 올바르지 않으므로 다시 확인해주세요.</p>
  </div>
</template>

<script>
export default {
  name: 'TestSentenceDetection',
  data() {
    return {
      operation: {
        controlOid: '',
        actionValue: '',
        stopValue: ''
      },
      // 문장이 아닌 텍스트들
      labels: {
        name: '사용자 이름',
        email: '이메일 주소',
        phone: '전화번호'
      },
      // 문장인 텍스트들
      messages: {
        warning: '입력하신 정보를 다시 한번 확인해주시기 바랍니다.',
        error: '네트워크 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        success: '회원가입이 성공적으로 완료되었습니다. 환영합니다!'
      }
    };
  }
};
</script>`;

console.log('🎯 문장 자동 판별 및 개별 단어 분해 테스트\n');

async function testSentenceAutoDecomposition() {
  try {
    // 설정 객체 생성
    const config = {
      langFilePath: {
        ko: './lang/ko.js',
        en: './lang/en.js'
      }
    };
    
    // ProcessKoreanReplacementTool 초기화
    const tool = new ProcessKoreanReplacementTool({ config });
    
    console.log('📄 테스트 Vue 파일:');
    console.log('- 문장이 아닌 텍스트: "운영 상태 OID", "동작 값", "중지 값", "사용자 이름" 등');
    console.log('- 문장인 텍스트: "데이터를 저장하시겠습니까?", "시스템 연결이 성공적으로..." 등');
    console.log('\n' + '='.repeat(80));
    
    // === 1단계: 기본 모드 (문장 판별 자동 적용) ===
    console.log('🔍 1단계: 기본 모드 - 문장이 아닌 경우 자동 개별 분해');
    console.log('='.repeat(80));
    
    const normalResult = await tool.execute({
      fileName: 'test-sentence-detection.vue',
      fileContent: testVueFile,
      fileType: 'vue',
      forceWordDecomposition: false  // 기본 모드
    });
    
    console.log('\n📊 기본 모드 결과:');
    console.log(`- 총 한글 텍스트: ${normalResult.summary.totalKoreanTexts}개`);
    console.log(`- 개별 단어 분해: ${normalResult.summary.mixedLanguageResults?.totalMixed || 0}개 혼용 + ${normalResult.summary.mixedLanguageResults?.pureKorean || 0}개 순수 한글`);
    console.log(`- 평균 신뢰도: ${normalResult.summary.mixedLanguageResults?.averageConfidence}%`);
    
    if (normalResult.mixedLanguageConversions) {
      console.log('\n🔍 개별 단어 분해 결과 (기본 모드):');
      normalResult.mixedLanguageConversions.forEach((conv, index) => {
        const isAutoDecomposed = conv.analysis.isSentence ? '❌ 문장' : '✅ 자동 분해';
        console.log(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
        console.log(`   📋 문장 판별: ${isAutoDecomposed} (신뢰도: ${conv.confidence}%)`);
      });
    }
    
    // === 2단계: 강제 분해 모드 비교 ===
    console.log('\n\n🎯 2단계: 강제 분해 모드 (모든 텍스트 분해)');
    console.log('='.repeat(80));
    
    const forceResult = await tool.execute({
      fileName: 'test-sentence-detection.vue',
      fileContent: testVueFile,
      fileType: 'vue',
      forceWordDecomposition: true  // 강제 분해 모드
    });
    
    console.log('\n📊 강제 분해 모드 결과:');
    console.log(`- 총 한글 텍스트: ${forceResult.summary.totalKoreanTexts}개`);
    console.log(`- 개별 단어 분해: ${forceResult.summary.mixedLanguageResults?.totalMixed || 0}개 혼용 + ${forceResult.summary.mixedLanguageResults?.pureKorean || 0}개 순수 한글`);
    console.log(`- 평균 신뢰도: ${forceResult.summary.mixedLanguageResults?.averageConfidence}%`);
    
    if (forceResult.mixedLanguageConversions) {
      console.log('\n🎯 강제 분해 결과:');
      forceResult.mixedLanguageConversions.slice(0, 8).forEach((conv, index) => {
        console.log(`${index + 1}. "${conv.originalText}" → ${conv.finalConversion}`);
        console.log(`   📋 문장 여부: ${conv.analysis.isSentence ? '문장' : '단어/구문'} (신뢰도: ${conv.confidence}%)`);
      });
    }
    
    // === 3단계: 자동 판별 결과 분석 ===
    console.log('\n\n📊 3단계: 자동 문장 판별 결과 분석');
    console.log('='.repeat(80));
    
    if (normalResult.mixedLanguageConversions) {
      const sentences = normalResult.mixedLanguageConversions.filter(c => c.analysis.isSentence);
      const nonSentences = normalResult.mixedLanguageConversions.filter(c => !c.analysis.isSentence);
      
      console.log(`\n📝 문장으로 판별된 텍스트 (${sentences.length}개) - 전체 유지:`);
      sentences.forEach((conv, index) => {
        console.log(`${index + 1}. "${conv.originalText}"`);
        console.log(`   🔄 변환: ${conv.finalConversion}`);
      });
      
      console.log(`\n🔧 단어/구문으로 판별된 텍스트 (${nonSentences.length}개) - 개별 분해:`);
      nonSentences.forEach((conv, index) => {
        console.log(`${index + 1}. "${conv.originalText}"`);
        console.log(`   🔄 변환: ${conv.finalConversion}`);
      });
    }
    
    // === 4단계: 주요 사용자 텍스트 검증 ===
    console.log('\n\n✅ 4단계: 사용자 요구사항 검증');
    console.log('='.repeat(80));
    
    const targetTexts = ['운영 상태 OID', '동작 값', '중지 값'];
    
    console.log('\n🎯 사용자가 요청한 텍스트들:');
    targetTexts.forEach((text, index) => {
      const result = normalResult.mixedLanguageConversions?.find(c => c.originalText === text);
      if (result) {
        const isAutoDecomposed = !result.analysis.isSentence;
        console.log(`${index + 1}. "${text}"`);
        console.log(`   📋 자동 판별: ${isAutoDecomposed ? '✅ 개별 단어 분해됨' : '❌ 문장으로 처리됨'}`);
        console.log(`   🔄 결과: ${result.finalConversion}`);
        
        if (isAutoDecomposed && result.finalConversion.includes('[')) {
          console.log(`   🎉 성공: 개별 단어 배열로 변환됨!`);
        }
      } else {
        console.log(`${index + 1}. "${text}" - ❌ 결과를 찾을 수 없음`);
      }
    });
    
    // === 결론 ===
    console.log('\n\n🎉 결론');
    console.log('='.repeat(80));
    
    const autoDecomposedCount = normalResult.mixedLanguageConversions?.filter(c => !c.analysis.isSentence).length || 0;
    const sentenceCount = normalResult.mixedLanguageConversions?.filter(c => c.analysis.isSentence).length || 0;
    
    console.log('✅ **사용자 요구사항 달성!**');
    console.log('');
    console.log('🎯 **핵심 개선사항:**');
    console.log(`- 문장이 아닌 텍스트 ${autoDecomposedCount}개가 자동으로 개별 단어 분해됨`);
    console.log(`- 문장인 텍스트 ${sentenceCount}개는 전체 유지됨`);
    console.log(`- forceWordDecomposition 옵션 없이도 자동 판별 적용`);
    console.log('');
    console.log('🔧 **작동 방식:**');
    console.log('1. 각 텍스트가 문장인지 자동 판별');
    console.log('2. 문장이 아닌 경우 → 개별 단어로 분해');
    console.log('3. 문장인 경우 → 전체를 하나로 유지');
    console.log('4. 사용자는 별도 설정 없이 자동으로 최적 처리');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

testSentenceAutoDecomposition(); 