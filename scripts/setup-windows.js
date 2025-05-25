#!/usr/bin/env node

/**
 * Windows 환경 전용 MCP 서버 설정 스크립트
 * Windows 특정 경로 처리와 PowerShell 호환성을 고려한 설정
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function setupMCPForWindows() {
  console.log('🚀 Vue I18n MCP 서버 Windows 환경 설정을 시작합니다!\n');

  try {
    // Windows 환경 확인
    if (process.platform !== 'win32') {
      console.log('⚠️ 이 스크립트는 Windows 환경 전용입니다.');
      console.log('일반 설정을 원하시면 "npm run setup"을 사용하세요.');
      process.exit(0);
    }

    // 현재 프로젝트 경로 (Windows 경로 형식으로 정규화)
    const projectRoot = path.resolve(__dirname, '..');
    const distPath = path.join(projectRoot, 'dist', 'index.js');

    console.log(`📁 MCP 서버 경로: ${projectRoot}`);
    console.log(`📁 실행 파일 경로: ${distPath}`);

    // 빌드 확인
    if (!await fs.pathExists(distPath)) {
      console.log('📦 먼저 프로젝트를 빌드합니다...');
      const { spawn } = await import('child_process');
      
      await new Promise((resolve, reject) => {
        const build = spawn('npm', ['run', 'build'], { 
          cwd: projectRoot, 
          stdio: 'inherit',
          shell: true // Windows에서 shell 강제 사용
        });
        build.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`빌드 실패: exit code ${code}`));
        });
      });
      console.log('✅ 빌드 완료!\n');
    }

    // 사용자 입력 수집
    console.log('📁 설정 정보를 입력해주세요:');
    console.log('예시: src/locales, src/i18n, src/lang 등');
    const localesPath = await question('언어 파일 경로 (ko.js, en.js가 있는 폴더): ');

    // Vue 프로젝트 경로 입력 (Windows에서는 명시적으로 받기)
    console.log('\n📁 Vue 프로젝트 경로를 입력해주세요:');
    console.log('예시: C:\\Users\\사용자명\\Projects\\my-vue-project');
    const vueProjectPath = await question('Vue 프로젝트 절대 경로: ');

    // 경로 검증
    if (!await fs.pathExists(vueProjectPath)) {
      console.error(`❌ 지정된 Vue 프로젝트 경로가 존재하지 않습니다: ${vueProjectPath}`);
      process.exit(1);
    }

    // MCP 설정 생성 (Windows 경로 형식 고려)
    const mcpConfig = {
      "$schema": "https://github.com/modelcontextprotocol/servers/raw/main/schemas/mcp.schema.json",
      "servers": {
        "vue-i18n-automation": {
          "command": "node",
          "args": [distPath],
          "env": {
            "LOCALES_PATH": localesPath,
            "PROJECT_ROOT": vueProjectPath
          },
          "disabled": false
        }
      }
    };

    // .vscode 폴더 생성
    const vscodePath = path.join(vueProjectPath, '.vscode');
    await fs.ensureDir(vscodePath);

    // mcp.json 파일 생성
    const mcpJsonPath = path.join(vscodePath, 'mcp.json');
    await fs.writeJSON(mcpJsonPath, mcpConfig, { spaces: 2 });

    console.log('\n✅ Windows 환경 MCP 설정이 완료되었습니다!');
    console.log(`📁 설정 파일: ${mcpJsonPath}`);
    console.log(`📁 Vue 프로젝트: ${vueProjectPath}`);
    console.log(`📁 언어 파일 경로: ${localesPath}`);
    
    // 언어 파일 존재 확인
    const koFilePath = path.join(vueProjectPath, localesPath, 'ko.js');
    const enFilePath = path.join(vueProjectPath, localesPath, 'en.js');
    
    console.log('\n🔍 언어 파일 확인:');
    console.log(`ko.js: ${await fs.pathExists(koFilePath) ? '✅ 존재' : '❌ 없음'}`);
    console.log(`en.js: ${await fs.pathExists(enFilePath) ? '✅ 존재' : '❌ 없음'}`);
    
    if (!await fs.pathExists(koFilePath) || !await fs.pathExists(enFilePath)) {
      console.log('\n⚠️  언어 파일이 없습니다. 다음 형식으로 생성해주세요:');
      console.log(`\n// ${localesPath}\\ko.js`);
      console.log('export default {');
      console.log('  WATCHALL: {');
      console.log('    WORD: {');
      console.log('      USER_PROFILE: "사용자 프로필",');
      console.log('      SAVE: "저장"');
      console.log('    }');
      console.log('  }');
      console.log('};');
      console.log(`\n// ${localesPath}\\en.js`);
      console.log('export default {');
      console.log('  WATCHALL: {');
      console.log('    WORD: {');
      console.log('      USER_PROFILE: "User Profile",');
      console.log('      SAVE: "Save"');
      console.log('    }');
      console.log('  }');
      console.log('};');
    }

    console.log('\n📋 다음 단계 (Windows):');
    console.log('1. VSCode에서 Vue 프로젝트를 열어주세요');
    console.log('2. Ctrl+Shift+P → "GitHub Copilot: Enable MCP" 실행');
    console.log('3. Copilot 채팅에서 "@vue-i18n-automation" 사용 시작!');
    console.log('\n🧪 테스트 (PowerShell에서):');
    console.log('   @vue-i18n-automation 이 파일의 한글을 분석해줘');

    console.log('\n💡 Windows 환경 팁:');
    console.log('- PowerShell 또는 Command Prompt 사용 권장');
    console.log('- 경로에 한글이 있으면 문제가 될 수 있습니다');
    console.log('- VSCode를 관리자 권한으로 실행하면 더 안정적입니다');

  } catch (error) {
    console.error('❌ Windows 환경 설정 중 오류가 발생했습니다:', error.message);
    console.error('\n🔧 문제 해결:');
    console.error('1. PowerShell을 관리자 권한으로 실행해보세요');
    console.error('2. 경로에 특수문자나 한글이 없는지 확인하세요');
    console.error('3. Node.js가 최신 버전인지 확인하세요');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 스크립트 실행
setupMCPForWindows().catch(console.error); 