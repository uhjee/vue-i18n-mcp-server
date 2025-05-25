/**
 * MCP 서버 통합 테스트 - 개선된 변환 예시 확인
 */

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const TEST_SAMPLE = `<template>
  <div>
    <h1>사용자 프로필</h1>
    <button>저장</button>
    <span>회원가입</span>
  </div>
</template>

<script>
export default {
  methods: {
    showMessage() {
      alert('저장되었습니다');
    }
  }
}
</script>`;

async function runMCPTest() {
  console.log('🧪 MCP 서버 통합 테스트 (개선된 변환 예시 확인)');
  
  const mcpRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'process-korean-replacement',
      arguments: {
        fileName: 'TestComponent.vue',
        fileContent: TEST_SAMPLE,
        fileType: 'vue'
      }
    }
  };

  return new Promise((resolve, reject) => {
    console.log('📡 MCP 서버 실행 중...');
    
    const mcpServer = spawn('node', ['dist/index.js'], {
      env: {
        ...process.env,
        LOCALES_PATH: 'tests/locales',
        I18N_FUNCTION_TYPE: 'VUE_I18N_WATCHALL'
      },
      stdio: 'pipe'
    });

    let output = '';
    let hasReceived = false;

    mcpServer.stdout.on('data', (data) => {
      output += data.toString();
      
      // MCP 서버가 준비되면 요청 전송
      if (output.includes('MCP Server listening') && !hasReceived) {
        hasReceived = true;
        console.log('✅ MCP 서버 준비 완료');
        
        // 요청 전송
        mcpServer.stdin.write(JSON.stringify(mcpRequest) + '\n');
      }
      
      // 응답 수신 확인
      if (output.includes('"recommendations"') && hasReceived) {
        mcpServer.kill();
        
        try {
          // JSON 응답 파싱
          const lines = output.split('\n');
          const responseLine = lines.find(line => line.includes('"recommendations"'));
          
          if (responseLine) {
            const response = JSON.parse(responseLine);
            resolve(response);
          } else {
            reject(new Error('응답을 찾을 수 없습니다'));
          }
        } catch (error) {
          reject(error);
        }
      }
    });

    mcpServer.stderr.on('data', (data) => {
      console.log('MCP 로그:', data.toString());
    });

    mcpServer.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => {
      mcpServer.kill();
      reject(new Error('테스트 타임아웃'));
    }, 10000);
  });
}

async function main() {
  try {
    const response = await runMCPTest();
    
    console.log('\n📊 MCP 서버 응답 분석');
    console.log('=' .repeat(50));
    
    if (response.result && response.result.recommendations) {
      console.log('🎯 추천사항 (개선된 변환 예시 포함):');
      response.result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      
      // 변환 예시가 포함되었는지 확인
      const hasConversionExample = response.result.recommendations.some(rec => 
        rec.includes('📝 변환 예시:') && rec.includes('$localeMessage')
      );
      
      if (hasConversionExample) {
        console.log('\n✅ 성공: 구체적인 변환 예시가 포함되었습니다!');
        console.log('🎉 Copilot이 $localeMessage 함수를 사용하도록 가이드됨');
      } else {
        console.log('\n❌ 실패: 구체적인 변환 예시가 없습니다');
      }
      
      // i18n 함수 설정 안내가 있는지 확인
      const hasConfigInfo = response.result.recommendations.some(rec => 
        rec.includes('⚙️ 현재 i18n 함수 설정:')
      );
      
      if (hasConfigInfo) {
        console.log('✅ 성공: i18n 함수 설정 정보가 포함되었습니다!');
      }
      
    } else {
      console.log('❌ 응답에 추천사항이 없습니다');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

main(); 