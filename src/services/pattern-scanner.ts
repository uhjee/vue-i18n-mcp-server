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
      
      // 추가: 함수 호출에서 한글 추출 (예: @click="handleSave('데이터 저장')")
      const functionCallMatches = line.match(/@\w+="[^"]*\([^)]*['"`]([^'"`]*[가-힣][^'"`]*)['"`][^)]*\)"/g);
      if (functionCallMatches) {
        functionCallMatches.forEach(match => {
          const textMatch = match.match(/['"`]([^'"`]*[가-힣][^'"`]*)['"`]/);
          if (textMatch) {
            const korean = this.extractKoreanFromText(textMatch[1]);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  section: 'template',
                  line: lineNumber,
                  column: line.indexOf(match),
                },
                context: {
                  elementType: this.getElementType(line, line.indexOf(match)),
                  attributeType: 'event-function',
                  variableContext: undefined,
                }
              });
            });
          }
        });
      }
      
      // 추가: v-bind와 v-on 전체 형태에서 한글 추출
      const vDirectiveMatches = line.match(/v-(?:bind|on):\w+="([^"]*[가-힣][^"]*)"/g);
      if (vDirectiveMatches) {
        vDirectiveMatches.forEach(match => {
          const textMatch = match.match(/"([^"]*[가-힣][^"]*)"/);
          if (textMatch) {
            const korean = this.extractKoreanFromText(textMatch[1]);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  section: 'template',
                  line: lineNumber,
                  column: line.indexOf(match),
                },
                context: {
                  elementType: this.getElementType(line, line.indexOf(match)),
                  attributeType: 'v-directive',
                  variableContext: undefined,
                }
              });
            });
          }
        });
      }
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

        // 8. 삼항 연산자에서 한글 추출 (condition ? '값1' : '값2')
        const ternaryRegex = /\?\s*['"`]([^'"`]*[가-힣][^'"`]*)['"`]\s*:\s*['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g;
        let ternaryMatch: RegExpExecArray | null;
        while ((ternaryMatch = ternaryRegex.exec(line)) !== null) {
          // 첫 번째 값 (캡처 그룹 1)
          if (ternaryMatch[1]) {
            const korean = this.extractKoreanFromText(ternaryMatch[1]);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  section,
                  line: lineNumber,
                  column: ternaryMatch!.index!,
                },
                context: {
                  elementType: undefined,
                  attributeType: undefined,
                  variableContext: 'ternary-first',
                }
              });
            });
          }
          
          // 두 번째 값 (캡처 그룹 2)
          if (ternaryMatch[2]) {
            const korean = this.extractKoreanFromText(ternaryMatch[2]);
            korean.forEach(koreanText => {
              extractions.push({
                text: koreanText,
                location: {
                  section,
                  line: lineNumber,
                  column: ternaryMatch!.index! + ternaryMatch![0].indexOf(ternaryMatch![2]),
                },
                context: {
                  elementType: undefined,
                  attributeType: undefined,
                  variableContext: 'ternary-second',
                }
              });
            });
          }
        }

        // 9. 일반적인 문자열 리터럴 (위의 패턴들이 놓친 것들을 포괄적으로 잡기)
        const generalStringMatches = line.match(/['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g);
        if (generalStringMatches) {
          generalStringMatches.forEach(match => {
            // 이미 위의 패턴들로 처리된 것들은 제외하기 위해 중복 체크
            const text = match.slice(1, -1);
            const korean = this.extractKoreanFromText(text);
            korean.forEach(koreanText => {
              // 이미 추가된 것인지 확인 (텍스트와 라인만 비교, 컬럼은 더 관대하게)
              const alreadyExists = extractions.some(existing => 
                existing.text === koreanText && 
                existing.location.line === lineNumber
              );
              
              if (!alreadyExists) {
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
                    variableContext: 'general',
                  }
                });
              }
            });
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

    // 한영 혼용 문자열 처리를 위한 개선된 로직
    const results: string[] = [];
    
    // 1. 한글이 포함된 전체 텍스트를 우선 추출 (한영 혼용 지원)
    if (/[가-힣]/.test(text)) {
      // 한글과 영어가 모두 포함된 경우 전체 텍스트를 반환
      if (/[A-Za-z]/.test(text)) {
        const trimmedText = text.trim();
        if (trimmedText.length > 0 && !this.isExcludedPattern(trimmedText)) {
          results.push(trimmedText);
        }
      } else {
        // 순수 한글인 경우 기존 로직 사용
        const matches = text.match(this.koreanRegex);
        if (matches) {
          matches
            .map(match => match.trim())
            .filter(match => match.length > 0 && !this.isExcludedPattern(match))
            .forEach(match => results.push(match));
        }
      }
    }

    return results;
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

    // 문장 필터링 추가
    if (this.isSentence(text)) {
      return true;
    }

    return excludePatterns.some(pattern => pattern.test(text));
  }

  /**
   * 문장인지 판별
   */
  private isSentence(text: string): boolean {
    // 문장 판별 기준들 (더 관대하게 수정)
    const sentenceIndicators = [
      // 1. 명확한 문장 종결 어미
      /습니다$|했습니다$|됩니다$|합니다$/,
      
      // 2. 물음표, 느낌표 포함
      /[?!]/, 
      
      // 3. 매우 긴 설명문 (20글자 이상이면서 공백 포함)
      text.length >= 20 && /\s/.test(text),
      
      // 4. 의문문 패턴
      /까요\?$|세요\?$|나요\?$|어요\?$/,
      
      // 5. 명령문 패턴 (긴 것만)
      /해주세요$|하십시오$/,
      
      // 6. 접속사나 부사로 시작하는 긴 문장
      text.length >= 15 && /^(그런데|하지만|따라서|또한|만약|예를 들어|즉|결국)/.test(text),
      
      // 7. 완전한 문장 형태 (주어+서술어, 긴 것만)
      text.length >= 15 && /[이가은는].*[다요음니]$/.test(text),
      
      // 8. 일반적인 긴 문장 패턴들
      /해야\s?합니다|할\s?수\s?있습니다|하지\s?마세요|하시겠습니까|하고\s?싶습니다/,
    ];

    return sentenceIndicators.some(indicator => {
      if (typeof indicator === 'boolean') {
        return indicator;
      }
      return indicator.test(text);
    });
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
      // 텍스트와 라인만으로 중복 체크 (컬럼과 컨텍스트는 무시)
      const key = `${extraction.text}:${extraction.location.line}`;
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
    
    // 1. 일반 속성: attribute="값"
    const normalAttrRegex = /(\w+)=["']([^"']*[가-힣][^"']*)["']/g;
    let match;
    
    while ((match = normalAttrRegex.exec(line)) !== null) {
      const korean = this.extractKoreanFromText(match[2]);
      korean.forEach(text => {
        results.push({
          text,
          column: match!.index,
          attributeType: match![1]
        });
      });
    }
    
    // 2. Vue 바인딩 속성: :attribute="값" 또는 v-bind:attribute="값"
    // 중첩된 따옴표 처리 개선
    const bindingAttrRegex = /(?::|\bv-bind:)(\w+)=(["'])([^]*?)\2/g;
    
    while ((match = bindingAttrRegex.exec(line)) !== null) {
      const attributeValue = match[3];
      // 속성값에서 한글이 포함된 문자열 리터럴 찾기
      const stringLiterals = this.extractStringLiteralsFromAttributeValue(attributeValue);
      stringLiterals.forEach(literal => {
        const korean = this.extractKoreanFromText(literal);
        korean.forEach(text => {
          results.push({
            text,
            column: match!.index,
            attributeType: `:${match![1]}` // Vue 바인딩임을 표시
          });
        });
      });
    }
    
    // 3. Vue 이벤트 속성: @event="값" 또는 v-on:event="값"
    const eventAttrRegex = /(?:@|\bv-on:)(\w+)=(["'])([^]*?)\2/g;
    
    while ((match = eventAttrRegex.exec(line)) !== null) {
      const attributeValue = match[3];
      const stringLiterals = this.extractStringLiteralsFromAttributeValue(attributeValue);
      stringLiterals.forEach(literal => {
        const korean = this.extractKoreanFromText(literal);
        korean.forEach(text => {
          results.push({
            text,
            column: match!.index,
            attributeType: `@${match![1]}` // Vue 이벤트임을 표시
          });
        });
      });
    }

    return results;
  }

  /**
   * 속성값에서 문자열 리터럴들을 추출하는 새 메서드
   */
  private extractStringLiteralsFromAttributeValue(value: string): string[] {
    const literals: string[] = [];
    
    // 1. 작은따옴표 문자열: 'text'
    const singleQuoteRegex = /'([^']*)'/g;
    let match;
    while ((match = singleQuoteRegex.exec(value)) !== null) {
      if (/[가-힣]/.test(match[1])) {
        literals.push(match[1]);
      }
    }
    
    // 2. 큰따옴표 문자열: "text"
    const doubleQuoteRegex = /"([^"]*)"/g;
    while ((match = doubleQuoteRegex.exec(value)) !== null) {
      if (/[가-힣]/.test(match[1])) {
        literals.push(match[1]);
      }
    }
    
    // 3. 백틱 템플릿 리터럴: `text`
    const templateRegex = /`([^`]*)`/g;
    while ((match = templateRegex.exec(value)) !== null) {
      if (/[가-힣]/.test(match[1])) {
        literals.push(match[1]);
      }
    }
    
    // 4. 따옴표가 없는 직접 한글 (드물지만 가능)
    if (literals.length === 0 && /[가-힣]/.test(value)) {
      const korean = this.extractKoreanFromText(value);
      literals.push(...korean);
    }
    
    return literals;
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