#!/usr/bin/env node

/**
 * Vue I18n MCP Server 전체 기능 통합 테스트
 */

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      cwd: projectRoot,
      ...options
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function fullTest() {
  console.log('🧪 Vue I18n MCP Server 전체 기능 테스트 시작\n');

  const tests = [
    {
      name: '프로젝트 빌드',
      command: 'npm',
      args: ['run', 'build'],
      description: 'TypeScript 컴파일 및 dist 생성'
    },
    {
      name: '패턴 스캐너 테스트',
      command: 'npm', 
      args: ['run', 'test:pattern'],
      description: 'Vue/JS 파일에서 한글 텍스트 추출 테스트'
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n🔧 ${test.name} 실행 중...`);
      console.log(`📋 ${test.description}\n`);
      
      await runCommand(test.command, test.args);
      
      console.log(`✅ ${test.name} 성공!`);
      passedTests++;
      
    } catch (error) {
      console.error(`❌ ${test.name} 실패:`, error.message);
    }
  }

  // 추가 파일 존재 확인
  console.log('\n📁 필수 파일 확인...');
  const requiredFiles = [
    'dist/index.js',
    'dist/server/mcp-server.js',
    'dist/services/pattern-scanner.js',
    'dist/server/tools/process-korean-replacement.js',
    'templates/mcp.json',
    'scripts/setup-mcp.js',
    'QUICK_START.md',
    'README.md'
  ];

  let missingFiles = [];
  for (const file of requiredFiles) {
    const filePath = path.join(projectRoot, file);
    if (await fs.pathExists(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} (누락)`);
      missingFiles.push(file);
    }
  }

  // 최종 결과
  console.log('\n📊 테스트 결과 요약');
  console.log(`- 통과한 테스트: ${passedTests}/${totalTests}`);
  console.log(`- 누락된 파일: ${missingFiles.length}개`);

  if (passedTests === totalTests && missingFiles.length === 0) {
    console.log('\n🎉 모든 테스트 통과! MCP 서버가 준비되었습니다.');
    console.log('\n📋 다음 단계:');
    console.log('1. npm run setup           # MCP 설정 자동화');
    console.log('2. VSCode에서 프로젝트 열기');
    console.log('3. Copilot Agent Mode 활성화');
    console.log('4. @vue-i18n-automation 사용 시작!');
    
    return true;
  } else {
    console.log('\n⚠️  일부 테스트가 실패했습니다. 위의 오류를 확인해주세요.');
    return false;
  }
}

// 도움말
function showHelp() {
  console.log('Vue I18n MCP Server 전체 기능 테스트\n');
  console.log('이 스크립트는 다음을 검증합니다:');
  console.log('- TypeScript 빌드');
  console.log('- 패턴 스캐너 동작');
  console.log('- 필수 파일 존재');
  console.log('- MCP 서버 준비 상태\n');
  console.log('사용법:');
  console.log('  npm run test:full');
  console.log('  node scripts/run-full-test.js');
}

// CLI 인자 처리
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 테스트 실행
fullTest()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 테스트 실행 중 오류:', error);
    process.exit(1);
  }); 