#!/usr/bin/env node

/**
 * 패턴 스캐너 테스트 스크립트
 * 1, 2단계 구현 검증용
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { PatternScannerService } from '../dist/services/pattern-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPatternScanner() {
  console.log('🧪 패턴 스캐너 테스트 시작\n');
  
  const scanner = new PatternScannerService();
  
  try {
    // Vue 파일 테스트
    console.log('📄 Vue 파일 테스트');
    const vueFilePath = path.join(__dirname, 'sample-files', 'sample.vue');
    const vueContent = await fs.readFile(vueFilePath, 'utf-8');
    
    console.log(`파일: ${vueFilePath}`);
    console.log(`크기: ${vueContent.length} bytes\n`);
    
    const vueResults = await scanner.scanVueFile(vueFilePath, vueContent);
    
    console.log(`✅ Vue 파일에서 ${vueResults.length}개 한글 텍스트 발견:`);
    vueResults.forEach((result, index) => {
      console.log(`${index + 1}. "${result.text}"`);
      console.log(`   위치: ${result.location.section} 섹션, ${result.location.line}:${result.location.column}`);
      if (result.context.elementType) {
        console.log(`   엘리먼트: ${result.context.elementType}`);
      }
      if (result.context.attributeType) {
        console.log(`   속성: ${result.context.attributeType}`);
      }
      if (result.context.variableContext) {
        console.log(`   컨텍스트: ${result.context.variableContext}`);
      }
      console.log('');
    });
    
    // JavaScript 파일 테스트
    console.log('\n📄 JavaScript 파일 테스트');
    const jsFilePath = path.join(__dirname, 'sample-files', 'sample.js');
    const jsContent = await fs.readFile(jsFilePath, 'utf-8');
    
    console.log(`파일: ${jsFilePath}`);
    console.log(`크기: ${jsContent.length} bytes\n`);
    
    const jsResults = scanner.scanJSFile(jsFilePath, jsContent);
    
    console.log(`✅ JavaScript 파일에서 ${jsResults.length}개 한글 텍스트 발견:`);
    jsResults.forEach((result, index) => {
      console.log(`${index + 1}. "${result.text}"`);
      console.log(`   위치: ${result.location.line}:${result.location.column}`);
      console.log(`   타입: ${result.context.literalType}`);
      if (result.context.variableName) {
        console.log(`   변수: ${result.context.variableName}`);
      }
      if (result.context.objectKey) {
        console.log(`   객체 키: ${result.context.objectKey}`);
      }
      if (result.location.function) {
        console.log(`   함수: ${result.location.function}`);
      }
      console.log('');
    });
    
    // 요약 통계
    console.log('\n📊 테스트 결과 요약');
    console.log(`- Vue 파일 한글 텍스트: ${vueResults.length}개`);
    console.log(`- JavaScript 파일 한글 텍스트: ${jsResults.length}개`);
    console.log(`- 총 발견된 한글 텍스트: ${vueResults.length + jsResults.length}개`);
    
    // Vue 파일 섹션별 통계
    const templateCount = vueResults.filter(r => r.location.section === 'template').length;
    const scriptCount = vueResults.filter(r => r.location.section === 'script').length;
    console.log(`- Vue Template 섹션: ${templateCount}개`);
    console.log(`- Vue Script 섹션: ${scriptCount}개`);
    
    // JavaScript 파일 타입별 통계
    const stringLiteralCount = jsResults.filter(r => r.context.literalType === 'string').length;
    const templateLiteralCount = jsResults.filter(r => r.context.literalType === 'template').length;
    console.log(`- JavaScript 문자열 리터럴: ${stringLiteralCount}개`);
    console.log(`- JavaScript 템플릿 리터럴: ${templateLiteralCount}개`);
    
    console.log('\n🎉 패턴 스캐너 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
    process.exit(1);
  }
}

// 테스트 실행
testPatternScanner().catch(console.error); 