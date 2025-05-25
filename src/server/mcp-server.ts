/**
 * Vue I18n MCP Server - 메인 서버 클래스
 * GitHub Copilot Agent Mode와 완전 호환되는 MCP 서버
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { MCPServerConfig, ToolContext } from '../types/index.js';
import { ProcessKoreanReplacementTool } from './tools/process-korean-replacement.js';
import { FindExistingTranslationsTool } from './tools/find-existing-translations.js';

/**
 * Vue I18n 자동화를 위한 MCP 서버
 */
export class VueI18nMCPServer {
  private server: Server;
  private config: MCPServerConfig;
  private tools: Map<string, any> = new Map();

  constructor() {
    // MCP 서버 초기화 (GitHub 표준 준수)
    this.server = new Server(
      {
        name: 'vue-i18n-automation',
        version: '1.0.0',
        description:
          'Vue.js i18n automation server for GitHub Copilot Agent Mode',
      },
      {
        capabilities: {
          tools: {
            // 도구 기능 활성화
          },
        },
      },
    );

    // 환경변수에서 설정 로드
    this.config = this.loadConfig();

    // 도구들 초기화
    this.initializeTools();

    // MCP 핸들러 설정
    this.setupHandlers();
  }

  /**
   * 프로젝트 루트 디렉토리를 자동으로 탐지합니다 (동기)
   */
  private findProjectRoot(): string {
    // 환경변수 디버깅
    console.error(`🔍 환경변수 디버깅:`);
    console.error(`  - PWD: ${process.env.PWD}`);
    console.error(`  - OLDPWD: ${process.env.OLDPWD}`);
    console.error(`  - HOME: ${process.env.HOME}`);
    console.error(`  - process.cwd(): ${process.cwd()}`);
    console.error(`  - __dirname: ${__dirname}`);
    
    // 1. 환경변수에서 명시적으로 설정된 경우
    if (process.env.PROJECT_ROOT) {
      console.error(`🎯 환경변수에서 프로젝트 루트 설정: ${process.env.PROJECT_ROOT}`);
      return process.env.PROJECT_ROOT;
    }

    // 2. MCP 서버 자체 경로에서 프로젝트 추론 (이 서버가 특정 프로젝트 내에 있는 경우)
    let currentDir = __dirname;
    console.error(`🔍 MCP 서버 경로에서 탐지 시작: ${currentDir}`);
    
    // __dirname에서 상위로 올라가면서 프로젝트 루트 찾기
    for (let i = 0; i < 10; i++) {
      if (this.isProjectRoot(currentDir)) {
        console.error(`✅ MCP 서버 경로에서 프로젝트 루트 발견: ${currentDir}`);
        
        // 이 경로가 실제 사용자 프로젝트인지 확인 (vue-i18n-mcp-server 자체가 아닌)
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.pathExistsSync(packageJsonPath)) {
          const packageContent = fs.readJsonSync(packageJsonPath);
          if (packageContent.name !== 'vue-i18n-mcp-server') {
            console.error(`✅ 사용자 프로젝트 확인됨: ${packageContent.name}`);
            return currentDir;
          } else {
            console.error(`⚠️ MCP 서버 자체 프로젝트이므로 계속 탐색...`);
          }
        }
      }
      
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    // 3. PWD 환경변수 시도 (VSCode가 설정할 수 있음)
    if (process.env.PWD && process.env.PWD !== '/' && process.env.PWD !== process.env.HOME) {
      console.error(`🎯 PWD 환경변수 시도: ${process.env.PWD}`);
      if (this.isProjectRoot(process.env.PWD)) {
        return process.env.PWD;
      }
    }

    // 4. 현재 디렉토리부터 상위로 올라가며 프로젝트 루트 찾기
    currentDir = process.cwd();
    const maxDepth = 10; // 무한 루프 방지
    
    console.error(`🔍 현재 디렉토리에서 프로젝트 루트 자동 탐지 시작: ${currentDir}`);
    
    for (let i = 0; i < maxDepth; i++) {
      if (this.isProjectRoot(currentDir)) {
        console.error(`✅ 프로젝트 루트 발견: ${currentDir}`);
        return currentDir;
      }
      
      // 상위 디렉토리로 이동
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // 루트 디렉토리에 도달했으면 중단
        break;
      }
      currentDir = parentDir;
      console.error(`  - 상위 디렉토리 확인: ${currentDir}`);
    }
    
    // 5. 홈 디렉토리 하위에서 일반적인 프로젝트 디렉토리 찾기
    const commonProjectPaths = [
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'Dev'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'Projects'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'Documents'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'workspace'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'code'),
      // Windows 특정 경로들 추가
      'C:\\Users\\Public\\Documents',
      'C:\\Projects',
      'C:\\Dev',
      'D:\\Projects',
      'D:\\Dev',
    ];
    
    for (const basePath of commonProjectPaths) {
      if (fs.pathExistsSync(basePath)) {
        console.error(`🔍 ${basePath} 하위 디렉토리 탐색...`);
        const projects = this.findProjectsInDirectory(basePath);
        if (projects.length > 0) {
          // Vue 프로젝트를 우선적으로 찾기
          const vueProjects = projects.filter(p => this.isVueProject(p));
          if (vueProjects.length > 0) {
            console.error(`✅ Vue 프로젝트 발견: ${vueProjects[0]}`);
            return vueProjects[0];
          }
          console.error(`✅ 일반 프로젝트 후보들: ${projects.slice(0, 3).join(', ')}`);
          return projects[0]; // 첫 번째 프로젝트 사용
        }
      }
    }
    
    // 찾지 못한 경우 process.cwd() 사용
    console.error(`⚠️ 프로젝트 루트를 찾을 수 없어서 현재 디렉토리 사용: ${process.cwd()}`);
    return process.cwd();
  }

  /**
   * 디렉토리가 프로젝트 루트인지 확인
   */
  private isProjectRoot(dir: string): boolean {
    const packageJsonPath = path.join(dir, 'package.json');
    const gitPath = path.join(dir, '.git');
    
    const hasPackageJson = fs.pathExistsSync(packageJsonPath);
    const hasGit = fs.pathExistsSync(gitPath);
    
    if (hasPackageJson || hasGit) {
      console.error(`  - package.json 존재: ${hasPackageJson}`);
      console.error(`  - .git 폴더 존재: ${hasGit}`);
      return true;
    }
    
    return false;
  }

  /**
   * Vue 프로젝트인지 확인
   */
  private isVueProject(dir: string): boolean {
    const packageJsonPath = path.join(dir, 'package.json');
    if (!fs.pathExistsSync(packageJsonPath)) return false;
    
    try {
      const packageContent = fs.readJsonSync(packageJsonPath);
      const dependencies = { 
        ...packageContent.dependencies, 
        ...packageContent.devDependencies 
      };
      
      return !!(dependencies.vue || dependencies['@vue/cli'] || dependencies.vite);
    } catch {
      return false;
    }
  }

  /**
   * 주어진 디렉토리에서 프로젝트들을 찾기
   */
  private findProjectsInDirectory(basePath: string, maxDepth: number = 2): string[] {
    const projects: string[] = [];
    
    try {
      const items = fs.readdirSync(basePath);
      
      for (const item of items) {
        const itemPath = path.join(basePath, item);
        
        if (fs.statSync(itemPath).isDirectory()) {
          if (this.isProjectRoot(itemPath)) {
            projects.push(itemPath);
          } else if (maxDepth > 0) {
            // 하위 디렉토리도 검색 (깊이 제한)
            projects.push(...this.findProjectsInDirectory(itemPath, maxDepth - 1));
          }
        }
      }
    } catch (error) {
      // 권한 오류 등은 무시
    }
    
    return projects;
  }

  /**
   * 환경변수에서 설정 정보 로드
   */
  private loadConfig(): MCPServerConfig {
    // 프로젝트 루트 자동 탐지
    const projectRoot = this.findProjectRoot();
    const localesPath = process.env.LOCALES_PATH || 'src/locales';
    
    const config = {
      projectRoot,
      langFilePath: {
        ko: path.join(projectRoot, localesPath, 'ko.js'),
        en: path.join(projectRoot, localesPath, 'en.js'),
      },
    };

    console.error(`🚀 MCP 서버 설정:`);
    console.error(`  - 프로젝트 루트: ${projectRoot}`);
    console.error(`  - 로케일 경로: ${localesPath}`);
    console.error(`  - ko.js 전체 경로: ${config.langFilePath.ko}`);
    console.error(`  - en.js 전체 경로: ${config.langFilePath.en}`);
    
    return config;
  }

  /**
   * MCP 도구들 초기화
   */
  private initializeTools(): void {
    const toolContext: ToolContext = {
      projectRoot: this.config.projectRoot,
      workspaceFiles: [], // 실행 시 동적으로 로드
      config: this.config,
    };

    // RFP 1단계: 메인 처리 도구 등록
    this.tools.set(
      'process-korean-replacement',
      new ProcessKoreanReplacementTool(toolContext),
    );
    
    // RFP 3단계: 기존 번역 매칭 도구 등록
    this.tools.set(
      'find-existing-translations',
      new FindExistingTranslationsTool(toolContext),
    );
  }

  /**
   * MCP 요청 핸들러 설정
   */
  private setupHandlers(): void {
    // 도구 목록 제공 (Agent Mode에서 사용)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [];

      for (const [name, toolInstance] of this.tools) {
        tools.push({
          name,
          description: toolInstance.getDescription(),
          inputSchema: toolInstance.getInputSchema(),
        });
      }

      return { tools };
    });

    // 도구 실행 핸들러
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.tools.has(name)) {
        throw new Error(`알 수 없는 도구: ${name}`);
      }

      const tool = this.tools.get(name);

      try {
        // 현재 컨텍스트 업데이트
        await this.updateToolContext(tool);

        // 도구 실행
        const result = await tool.execute(args || {});

        return {
          content: [
            {
              type: 'text',
              text: this.formatToolResult(name, result),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: 'text',
              text: `❌ ${name} 실행 중 오류가 발생했습니다: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * 도구 컨텍스트 업데이트 (현재 파일, 워크스페이스 파일 등)
   */
  private async updateToolContext(tool: any): Promise<void> {
    // 실제 구현에서는 VSCode 워크스페이스 정보를 동적으로 수집
    // 현재는 기본값 설정
    const updatedContext: ToolContext = {
      projectRoot: this.config.projectRoot,
      workspaceFiles: [], // glob 패턴으로 실제 파일 수집 예정
      config: this.config,
    };

    tool.updateContext(updatedContext);
  }

  /**
   * 도구 실행 결과를 Agent Mode에 적합한 형식으로 포맷팅
   */
  private formatToolResult(toolName: string, result: any): string {
    const timestamp = new Date().toLocaleTimeString();
    let formattedResult = `🔧 **${toolName}** 실행 완료 (${timestamp})\n\n`;

    switch (toolName) {
      case 'process-korean-replacement':
        formattedResult += this.formatProcessResult(result);
        break;
      case 'find-existing-translations':
        formattedResult += this.formatMatchingResult(result);
        break;
      default:
        formattedResult += JSON.stringify(result, null, 2);
    }

    return formattedResult;
  }

  /**
   * 한글 대체 처리 결과 포맷팅
   */
  private formatProcessResult(result: any): string {
    let formatted = `📊 **분석 결과**\n`;
    formatted += `- 파일명: ${result.summary.fileName}\n`;
    formatted += `- 파일 타입: ${result.summary.fileType}\n`;
    formatted += `- 발견된 한글 텍스트: ${result.summary.totalKoreanTexts}개\n`;
    formatted += `- 처리 시간: ${result.summary.processingTime}ms\n\n`;

    // 번역 매칭 결과 추가
    if (result.summary.matchingResults) {
      const mr = result.summary.matchingResults;
      formatted += `🔍 **번역 매칭 결과**\n`;
      formatted += `- 매칭 성공: ${mr.foundMatches}개\n`;
      formatted += `- 미매칭: ${mr.unmatchedTexts}개\n`;
      formatted += `- 매칭률: ${mr.matchRate}%\n\n`;
    }

    if (result.summary.totalKoreanTexts > 0) {
      formatted += `📝 **추출된 한글 텍스트**\n`;
      
      if (result.extractions.vue) {
        result.extractions.vue.forEach((item: any, index: number) => {
          formatted += `${index + 1}. "${item.text}" (${item.location.section}, ${item.location.line}:${item.location.column})\n`;
        });
      }
      
      if (result.extractions.js) {
        result.extractions.js.forEach((item: any, index: number) => {
          const startIndex = result.extractions.vue ? result.extractions.vue.length : 0;
          formatted += `${startIndex + index + 1}. "${item.text}" (${item.location.line}:${item.location.column})\n`;
        });
      }

      // 매칭된 번역이 있으면 표시
      if (result.translationMatches && result.translationMatches.length > 0) {
        formatted += `\n✅ **매칭된 기존 번역** (상위 ${Math.min(5, result.translationMatches.length)}개)\n`;
        result.translationMatches.slice(0, 5).forEach((match: any, index: number) => {
          const confidence = (match.confidence * 100).toFixed(1);
          formatted += `${index + 1}. "${match.korean}" → \`${match.keyPath}\` (${confidence}%)\n`;
        });
      }

      // 미매칭 항목이 있으면 표시
      if (result.unmatchedTexts && result.unmatchedTexts.length > 0) {
        formatted += `\n❌ **새로운 번역 필요** (상위 ${Math.min(5, result.unmatchedTexts.length)}개)\n`;
        result.unmatchedTexts.slice(0, 5).forEach((text: string, index: number) => {
          formatted += `${index + 1}. "${text}"\n`;
        });
      }
      
      formatted += `\n💡 **추천사항**\n`;
      result.recommendations.forEach((rec: string, index: number) => {
        formatted += `${index + 1}. ${rec}\n`;
      });
      
      formatted += `\n🚀 **다음 단계**\n`;
      result.nextSteps.forEach((step: string, index: number) => {
        formatted += `${index + 1}. ${step}\n`;
      });
    } else {
      formatted += `✅ 한글 텍스트가 발견되지 않았습니다.\n`;
      formatted += `이 파일은 이미 국제화 처리가 완료되었거나 한글 텍스트가 없는 파일입니다.\n`;
    }

    return formatted;
  }

  /**
   * 번역 매칭 결과 포맷팅
   */
  private formatMatchingResult(result: any): string {
    let formatted = `📊 **매칭 분석 결과**\n`;
    formatted += `- 총 텍스트: ${result.summary.totalTexts}개\n`;
    formatted += `- 매칭 성공: ${result.summary.foundMatches}개\n`;
    formatted += `- 미매칭: ${result.summary.unmatchedTexts}개\n`;
    formatted += `- 매칭률: ${result.summary.matchRate}%\n\n`;

    if (result.matches && result.matches.length > 0) {
      formatted += `✅ **매칭된 번역**\n`;
      result.matches.forEach((match: any, index: number) => {
        const confidence = (match.confidence * 100).toFixed(1);
        formatted += `${index + 1}. "${match.korean}" → \`${match.keyPath}\` (신뢰도: ${confidence}%)\n`;
        if (match.english) {
          formatted += `   영문: "${match.english}"\n`;
        }
      });
      formatted += '\n';
    }

    if (result.unmatched && result.unmatched.length > 0) {
      formatted += `❌ **매칭되지 않은 텍스트**\n`;
      result.unmatched.slice(0, 10).forEach((text: string, index: number) => {
        formatted += `${index + 1}. "${text}"\n`;
      });
      if (result.unmatched.length > 10) {
        formatted += `   ... 외 ${result.unmatched.length - 10}개\n`;
      }
      formatted += '\n';
    }

    if (result.recommendations && result.recommendations.length > 0) {
      formatted += `💡 **추천사항**\n`;
      result.recommendations.forEach((rec: string, index: number) => {
        formatted += `${index + 1}. ${rec}\n`;
      });
    }

    return formatted;
  }

  /**
   * MCP 서버 시작
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('🚀 Vue I18n MCP Server가 시작되었습니다.');
    console.error('📋 사용 가능한 도구:');
    for (const toolName of this.tools.keys()) {
      console.error(`  - ${toolName}`);
    }
  }

  /**
   * 서버 종료
   */
  async stop(): Promise<void> {
    // 정리 작업 수행
    console.error('⏹️ Vue I18n MCP Server가 종료됩니다.');
  }
}