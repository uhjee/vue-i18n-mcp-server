#!/usr/bin/env node

/**
 * MCP 서버 설정 스크립트
 * VSCode에서 사용할 수 있도록 .vscode/mcp.json 파일을 생성합니다.
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

async function setupMCP() {
  console.log('🚀 Vue I18n MCP 서버 설정을 시작합니다!\n');

  try {
    // 현재 프로젝트 경로
    const projectRoot = path.resolve(__dirname, '..');
    const distPath = path.join(projectRoot, 'dist', 'index.js');

    // 빌드 확인
    if (!await fs.pathExists(distPath)) {
      console.log('📦 먼저 프로젝트를 빌드합니다...');
      const { spawn } = await import('child_process');
      
      await new Promise((resolve, reject) => {
        const build = spawn('npm', ['run', 'build'], { 
          cwd: projectRoot, 
          stdio: 'inherit' 
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

    // MCP 설정 생성 - 현재 워크스페이스를 기준으로 동작하도록 수정
    const mcpConfig = {
      "$schema": "https://github.com/modelcontextprotocol/servers/raw/main/schemas/mcp.schema.json",
      "servers": {
        "vue-i18n-automation": {
          "command": "node",
          "args": [distPath],
          "env": {
            "LOCALES_PATH": localesPath
          },
          "disabled": false
        }
      }
    };

    // 현재 디렉토리에 .vscode 폴더 생성 (setup 실행 위치를 Vue 프로젝트로 가정)
    const vscodePath = path.join(process.cwd(), '.vscode');
    await fs.ensureDir(vscodePath);

    // mcp.json 파일 생성
    const mcpJsonPath = path.join(vscodePath, 'mcp.json');
    await fs.writeJSON(mcpJsonPath, mcpConfig, { spaces: 2 });

    console.log('\n✅ MCP 설정이 완료되었습니다!');
    console.log(`📁 설정 파일: ${mcpJsonPath}`);
    console.log(`📁 언어 파일 경로: ${localesPath}`);
    
    // 언어 파일 존재 확인
    const koFilePath = path.join(process.cwd(), localesPath, 'ko.js');
    const enFilePath = path.join(process.cwd(), localesPath, 'en.js');
    
    console.log('\n🔍 언어 파일 확인:');
    console.log(`ko.js: ${await fs.pathExists(koFilePath) ? '✅ 존재' : '❌ 없음'}`);
    console.log(`en.js: ${await fs.pathExists(enFilePath) ? '✅ 존재' : '❌ 없음'}`);
    
    if (!await fs.pathExists(koFilePath) || !await fs.pathExists(enFilePath)) {
      console.log('\n⚠️  언어 파일이 없습니다. 다음 형식으로 생성해주세요:');
      console.log(`\n// ${localesPath}/ko.js`);
      console.log('export default {');
      console.log('  USER_PROFILE: "사용자 프로필",');
      console.log('  SAVE: "저장"');
      console.log('};');
      console.log(`\n// ${localesPath}/en.js`);
      console.log('export default {');
      console.log('  USER_PROFILE: "User Profile",');
      console.log('  SAVE: "Save"');
      console.log('};');
    }

    console.log('\n📋 다음 단계:');
    console.log('1. VSCode에서 이 프로젝트를 열어주세요');
    console.log('2. Cmd+Shift+P → "GitHub Copilot: Enable MCP" 실행');
    console.log('3. Copilot 채팅에서 "@vue-i18n-automation" 사용 시작!');
    console.log('\n🧪 테스트:');
    console.log('   @vue-i18n-automation 이 파일의 한글을 분석해줘');

  } catch (error) {
    console.error('❌ 설정 중 오류가 발생했습니다:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 스크립트 실행
setupMCP().catch(console.error);