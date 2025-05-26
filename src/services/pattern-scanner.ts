/**
 * 패턴 스캔 엔진 - 2단계 구현
 * Vue/JS/TS 파일에서 한글 텍스트를 자동 추출
 */

import { parse } from '@vue/compiler-sfc';
import { parse as babelParse } from '@babel/parser';
import * as t from '@babel/types';
import { VueKoreanExtraction, JSKoreanExtraction } from '../types/index.js';

/**
 * 패턴 스캔 엔진 클래스
 */
export class PatternScannerService {
  private readonly koreanRegex = /[가-힣][가-힣\s\d\.,!?\-~()\/&+|]*[가-힣\d]/g;
  private readonly excludeRegex = /^[a-zA-Z0-9\._@\-\/\\:]+$/;

  /**
   * Vue 파일에서 한글 텍스트 추출
   */
  async scanVueFile(filePath: string, content: string): Promise<VueKoreanExtraction[]> {
    const extractions: VueKoreanExtraction[] = [];

    try {
      // SFC 파싱
      const { descriptor } = parse(content);

      // Template 섹션 처리
      if (descriptor.template) {
        const templateExtractions = this.extractFromTemplate(
          filePath,
          descriptor.template.content,
          descriptor.template.loc.start.line
        );
        extractions.push(...templateExtractions);
      }

      // Script 섹션 처리
      if (descriptor.script) {
        const scriptExtractions = this.extractFromScript(
          filePath,
          descriptor.script.content,
          descriptor.script.loc.start.line,
          'script'
        );
        extractions.push(...scriptExtractions);
      }

      // Script Setup 섹션 처리
      if (descriptor.scriptSetup) {
        const scriptSetupExtractions = this.extractFromScript(
          filePath,
          descriptor.scriptSetup.content,
          descriptor.scriptSetup.loc.start.line,
          'script'
        );
        extractions.push(...scriptSetupExtractions);
      }

    } catch (error) {
      console.error(`Vue 파일 파싱 오류 (${filePath}):`, error);
    }

    return this.deduplicateExtractions(extractions);
  }

  /**
   * JS/TS 파일에서 한글 텍스트 추출 (정규식 기반)
   */
  scanJSFile(filePath: string, content: string): JSKoreanExtraction[] {
    const extractions: JSKoreanExtraction[] = [];

    try {
      // 주석 제거
      const cleanContent = this.removeComments(content);
      const lines = cleanContent.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // 문자열 리터럴에서 한글 추출
        const stringMatches = line.match(/['"]([^'"]*[가-힣][^'"]*)['"]/g);
        if (stringMatches) {
          stringMatches.forEach(match => {
            const text = match.slice(1, -1); // 따옴표 제거
            const korean = this.extractKoreanFromText(text);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  line: lineNumber,
                  column: line.indexOf(match),
                  function: this.getSimpleFunctionContext(line),
                },
                context: {
                  literalType: 'string',
                  variableName: this.getSimpleVariableContext(line),
                  objectKey: this.getSimpleObjectKeyContext(line),
                }
              });
            });
          });
        }

        // 템플릿 리터럴에서 한글 추출
        const templateMatches = line.match(/`([^`]*[가-힣][^`]*)`/g);
        if (templateMatches) {
          templateMatches.forEach(match => {
            const text = match.slice(1, -1); // 백틱 제거
            const korean = this.extractKoreanFromText(text);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  line: lineNumber,
                  column: line.indexOf(match),
                  function: this.getSimpleFunctionContext(line),
                },
                context: {
                  literalType: 'template',
                  variableName: this.getSimpleVariableContext(line),
                  objectKey: this.getSimpleObjectKeyContext(line),
                }
              });
            });
          });
        }
      });

    } catch (error) {
      console.error(`JS/TS 파일 파싱 오류 (${filePath}):`, error);
    }

    return this.deduplicateJSExtractions(extractions);
  }

  /**
   * Vue Template에서 한글 추출
   */
  private extractFromTemplate(filePath: string, templateContent: string, startLine: number): VueKoreanExtraction[] {
    const extractions: VueKoreanExtraction[] = [];
    const lines = templateContent.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = startLine + index;
      
      // HTML 텍스트 노드에서 한글 추출
      const textMatches = this.extractTextNodeKorean(line);
      textMatches.forEach(match => {
        extractions.push({
          text: match.text,
          location: {
            section: 'template',
            line: lineNumber,
            column: match.column,
          },
          context: {
            elementType: this.getElementType(line, match.column),
            attributeType: undefined,
            variableContext: undefined,
          }
        });
      });

      // 속성값에서 한글 추출
      const attrMatches = this.extractAttributeKorean(line);
      attrMatches.forEach(match => {
        extractions.push({
          text: match.text,
          location: {
            section: 'template',
            line: lineNumber,
            column: match.column,
          },
          context: {
            elementType: this.getElementType(line, match.column),
            attributeType: match.attributeType,
            variableContext: undefined,
          }
        });
      });
    });

    return extractions;
  }

  /**
   * Vue Script에서 한글 추출 (개선된 버전)
   */
  private extractFromScript(filePath: string, scriptContent: string, startLine: number, section: 'script'): VueKoreanExtraction[] {
    const extractions: VueKoreanExtraction[] = [];

    try {
      // 주석 제거
      const cleanContent = this.removeComments(scriptContent);
      const lines = cleanContent.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = startLine + index;
        
        // 1. 일반 문자열 리터럴에서 한글 추출 ('문자열', "문자열")
        const stringMatches = line.match(/['"]([^'"]*[가-힣][^'"]*)['"]/g);
        if (stringMatches) {
          stringMatches.forEach(match => {
            const text = match.slice(1, -1); // 따옴표 제거
            const korean = this.extractKoreanFromText(text);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  section,
                  line: lineNumber,
                  column: line.indexOf(match),
                },
                context: {
                  elementType: undefined,
                  attributeType: undefined,
                  variableContext: this.getSimpleVueContext(line),
                }
              });
            });
          });
        }

        // 2. 템플릿 리터럴에서 한글 추출 (`문자열`)
        const templateMatches = line.match(/`([^`]*[가-힣][^`]*)`/g);
        if (templateMatches) {
          templateMatches.forEach(match => {
            const text = match.slice(1, -1); // 백틱 제거
            const korean = this.extractKoreanFromText(text);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  section,
                  line: lineNumber,
                  column: line.indexOf(match),
                },
                context: {
                  elementType: undefined,
                  attributeType: undefined,
                  variableContext: this.getSimpleVueContext(line),
                }
              });
            });
          });
        }

        // 3. alert, console.log 등 함수 호출에서 한글 추출
        const functionCallMatches = line.match(/(alert|console\.log|console\.warn|console\.error|confirm|prompt)\s*\(\s*['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g);
        if (functionCallMatches) {
          functionCallMatches.forEach(match => {
            const textMatch = match.match(/['"`]([^'"`]*[가-힣][^'"`]*)['"`]/);
            if (textMatch) {
              const text = textMatch[1];
              const korean = this.extractKoreanFromText(text);
              korean.forEach(koreanText => {
                extractions.push({
                  text: koreanText,
                  location: {
                    section,
                    line: lineNumber,
                    column: line.indexOf(match),
                  },
                  context: {
                    elementType: undefined,
                    attributeType: undefined,
                    variableContext: this.getSimpleFunctionContext(line),
                  }
                });
              });
            }
          });
        }

        // 4. 객체 속성값에서 한글 추출 (key: '값' 형태)
        const objectPropertyMatches = line.match(/(\w+)\s*:\s*['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g);
        if (objectPropertyMatches) {
          objectPropertyMatches.forEach(match => {
            const propertyMatch = match.match(/(\w+)\s*:\s*['"`]([^'"`]*[가-힣][^'"`]*)['"`]/);
            if (propertyMatch) {
              const text = propertyMatch[2];
              const korean = this.extractKoreanFromText(text);
              korean.forEach(koreanText => {
                extractions.push({
                  text: koreanText,
                  location: {
                    section,
                    line: lineNumber,
                    column: line.indexOf(match),
                  },
                  context: {
                    elementType: undefined,
                    attributeType: undefined,
                    variableContext: this.getSimpleObjectKeyContext(line),
                  }
                });
              });
            }
          });
        }

        // 5. 변수 할당에서 한글 추출 (const/let/var 변수 = '값')
        const variableAssignMatches = line.match(/(?:const|let|var)\s+\w+\s*=\s*['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g);
        if (variableAssignMatches) {
          variableAssignMatches.forEach(match => {
            const valueMatch = match.match(/['"`]([^'"`]*[가-힣][^'"`]*)['"`]/);
            if (valueMatch) {
              const text = valueMatch[1];
              const korean = this.extractKoreanFromText(text);
              korean.forEach(koreanText => {
                extractions.push({
                  text: koreanText,
                  location: {
                    section,
                    line: lineNumber,
                    column: line.indexOf(match),
                  },
                  context: {
                    elementType: undefined,
                    attributeType: undefined,
                    variableContext: this.getSimpleVariableContext(line),
                  }
                });
              });
            }
          });
        }

        // 6. return 문에서 한글 추출
        const returnMatches = line.match(/return\s+['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g);
        if (returnMatches) {
          returnMatches.forEach(match => {
            const valueMatch = match.match(/['"`]([^'"`]*[가-힣][^'"`]*)['"`]/);
            if (valueMatch) {
              const text = valueMatch[1];
              const korean = this.extractKoreanFromText(text);
              korean.forEach(koreanText => {
                extractions.push({
                  text: koreanText,
                  location: {
                    section,
                    line: lineNumber,
                    column: line.indexOf(match),
                  },
                  context: {
                    elementType: undefined,
                    attributeType: undefined,
                    variableContext: 'return',
                  }
                });
              });
            }
          });
        }

        // 7. 배열 요소에서 한글 추출 (['항목1', '항목2'])
        const arrayMatches = line.match(/\[\s*['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g);
        if (arrayMatches) {
          arrayMatches.forEach(match => {
            const valueMatch = match.match(/['"`]([^'"`]*[가-힣][^'"`]*)['"`]/);
            if (valueMatch) {
              const text = valueMatch[1];
              const korean = this.extractKoreanFromText(text);
              korean.forEach(koreanText => {
                extractions.push({
                  text: koreanText,
                  location: {
                    section,
                    line: lineNumber,
                    column: line.indexOf(match),
                  },
                  context: {
                    elementType: undefined,
                    attributeType: undefined,
                    variableContext: 'array',
                  }
                });
              });
            }
          });
        }
      });

    } catch (error) {
      console.error(`Script 섹션 파싱 오류:`, error);
    }

    return extractions;
  }

  /**
   * 텍스트에서 한글 패턴 추출
   */
  private extractKoreanFromText(text: string): string[] {
    if (!text || this.excludeRegex.test(text)) {
      return [];
    }

    const matches = text.match(this.koreanRegex);
    if (!matches) return [];

    return matches
      .map(match => match.trim())
      .filter(match => match.length > 0 && !this.isExcludedPattern(match));
  }

  /**
   * 제외 패턴 검사
   */
  private isExcludedPattern(text: string): boolean {
    // URL, 이메일, 파일명 등 제외
    const excludePatterns = [
      /^https?:\/\//, // URL
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // 이메일
      /\.(js|ts|vue|css|html|png|jpg|gif)$/i, // 파일 확장자
      /^[A-Z_]+$/, // 상수명
    ];

    return excludePatterns.some(pattern => pattern.test(text));
  }

  /**
   * 주석 제거
   */
  private removeComments(content: string): string {
    // 한 줄 주석 제거
    let result = content.replace(/\/\/.*$/gm, '');
    
    // 여러 줄 주석 제거
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return result;
  }

  /**
   * 중복 제거
   */
  private deduplicateExtractions(extractions: VueKoreanExtraction[]): VueKoreanExtraction[] {
    const seen = new Set<string>();
    return extractions.filter(extraction => {
      const key = `${extraction.text}:${extraction.location.line}:${extraction.location.column}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateJSExtractions(extractions: JSKoreanExtraction[]): JSKoreanExtraction[] {
    const seen = new Set<string>();
    return extractions.filter(extraction => {
      const key = `${extraction.text}:${extraction.location.line}:${extraction.location.column}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // 헬퍼 메소드들
  private extractTextNodeKorean(line: string): Array<{text: string, column: number}> {
    // HTML 텍스트 노드에서 한글 추출 로직
    const results: Array<{text: string, column: number}> = [];
    const regex = />([^<]*[가-힣][^<]*)</g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const korean = this.extractKoreanFromText(match[1]);
      korean.forEach(text => {
        results.push({
          text,
          column: match!.index + 1
        });
      });
    }

    return results;
  }

  private extractAttributeKorean(line: string): Array<{text: string, column: number, attributeType: string}> {
    // 속성값에서 한글 추출 로직
    const results: Array<{text: string, column: number, attributeType: string}> = [];
    const regex = /(\w+)=["']([^"']*[가-힣][^"']*)["']/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const korean = this.extractKoreanFromText(match[2]);
      korean.forEach(text => {
        results.push({
          text,
          column: match!.index,
          attributeType: match![1]
        });
      });
    }

    return results;
  }

  private getElementType(line: string, column: number): string {
    const tagMatch = line.match(/<(\w+)/);
    return tagMatch ? tagMatch[1] : 'unknown';
  }

  private getFunctionContext(path: any): string {
    let parent = path.parent;
    while (parent) {
      if (t.isFunctionDeclaration(parent) && parent.id) {
        return parent.id.name || 'anonymous';
      }
      if (t.isFunctionExpression(parent) && parent.id) {
        return parent.id.name || 'anonymous';
      }
      if (t.isArrowFunctionExpression(parent)) {
        return 'anonymous';
      }
      parent = parent.parent;
    }
    return '';
  }

  private getVariableContext(path: any): string {
    if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
      return path.parent.id.name;
    }
    return '';
  }

  private getObjectKeyContext(path: any): string {
    if (t.isObjectProperty(path.parent) && t.isIdentifier(path.parent.key)) {
      return path.parent.key.name;
    }
    return '';
  }

  private getVueVariableContext(path: any): string {
    // Vue 컴포넌트 내 변수 컨텍스트 분석
    const contexts = ['data', 'computed', 'methods', 'props'];
    let parent = path.parent;
    
    while (parent) {
      if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) {
        const keyName = parent.key.name;
        if (contexts.includes(keyName)) {
          return keyName;
        }
      }
      parent = parent.parent;
    }
    
    return '';
  }

  private getSimpleVueContext(line: string): string {
    // 간단한 Vue 컨텍스트 분석 (정규식 기반)
    if (line.includes('data()') || line.includes('data:')) {
      return 'data';
    }
    if (line.includes('computed:') || line.includes('computed()')) {
      return 'computed';
    }
    if (line.includes('methods:') || line.includes('methods()')) {
      return 'methods';
    }
    if (line.includes('props:') || line.includes('props()')) {
      return 'props';
    }
    return '';
  }

  private getSimpleFunctionContext(line: string): string {
    // 간단한 함수 컨텍스트 분석
    const functionMatch = line.match(/function\s+(\w+)|(\w+)\s*\(/);
    return functionMatch ? (functionMatch[1] || functionMatch[2] || 'anonymous') : '';
  }

  private getSimpleVariableContext(line: string): string {
    // 간단한 변수 컨텍스트 분석
    const varMatch = line.match(/(?:const|let|var)\s+(\w+)/);
    return varMatch ? varMatch[1] : '';
  }

  private getSimpleObjectKeyContext(line: string): string {
    // 간단한 객체 키 컨텍스트 분석
    const keyMatch = line.match(/(\w+)\s*:/);
    return keyMatch ? keyMatch[1] : '';
  }
} 