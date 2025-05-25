/**
 * 패턴 스캔 엔진 - 2단계 구현
 * Vue/JS/TS 파일에서 한글 텍스트를 자동 추출
 */
import { parse } from '@vue/compiler-sfc';
import * as t from '@babel/types';
/**
 * 패턴 스캔 엔진 클래스
 */
export class PatternScannerService {
    constructor() {
        this.koreanRegex = /[가-힣][가-힣\s\d\.,!?\-~()]*[가-힣\d]/g;
        this.excludeRegex = /^[a-zA-Z0-9\._@\-\/\\:]+$/;
    }
    /**
     * Vue 파일에서 한글 텍스트 추출
     */
    async scanVueFile(filePath, content) {
        const extractions = [];
        try {
            // SFC 파싱
            const { descriptor } = parse(content);
            // Template 섹션 처리
            if (descriptor.template) {
                const templateExtractions = this.extractFromTemplate(filePath, descriptor.template.content, descriptor.template.loc.start.line);
                extractions.push(...templateExtractions);
            }
            // Script 섹션 처리
            if (descriptor.script) {
                const scriptExtractions = this.extractFromScript(filePath, descriptor.script.content, descriptor.script.loc.start.line, 'script');
                extractions.push(...scriptExtractions);
            }
            // Script Setup 섹션 처리
            if (descriptor.scriptSetup) {
                const scriptSetupExtractions = this.extractFromScript(filePath, descriptor.scriptSetup.content, descriptor.scriptSetup.loc.start.line, 'script');
                extractions.push(...scriptSetupExtractions);
            }
        }
        catch (error) {
            console.error(`Vue 파일 파싱 오류 (${filePath}):`, error);
        }
        return this.deduplicateExtractions(extractions);
    }
    /**
     * JS/TS 파일에서 한글 텍스트 추출 (정규식 기반)
     */
    scanJSFile(filePath, content) {
        const extractions = [];
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
        }
        catch (error) {
            console.error(`JS/TS 파일 파싱 오류 (${filePath}):`, error);
        }
        return this.deduplicateJSExtractions(extractions);
    }
    /**
     * Vue Template에서 한글 추출
     */
    extractFromTemplate(filePath, templateContent, startLine) {
        const extractions = [];
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
     * Vue Script에서 한글 추출 (정규식 기반)
     */
    extractFromScript(filePath, scriptContent, startLine, section) {
        const extractions = [];
        try {
            // 주석 제거
            const cleanContent = this.removeComments(scriptContent);
            const lines = cleanContent.split('\n');
            lines.forEach((line, index) => {
                const lineNumber = startLine + index;
                // 문자열 리터럴에서 한글 추출 (간단한 정규식 방식)
                const stringMatches = line.match(/['"`]([^'"`]*[가-힣][^'"`]*)['"`]/g);
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
            });
        }
        catch (error) {
            console.error(`Script 섹션 파싱 오류:`, error);
        }
        return extractions;
    }
    /**
     * 텍스트에서 한글 패턴 추출
     */
    extractKoreanFromText(text) {
        if (!text || this.excludeRegex.test(text)) {
            return [];
        }
        const matches = text.match(this.koreanRegex);
        if (!matches)
            return [];
        return matches
            .map(match => match.trim())
            .filter(match => match.length > 0 && !this.isExcludedPattern(match));
    }
    /**
     * 제외 패턴 검사
     */
    isExcludedPattern(text) {
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
    removeComments(content) {
        // 한 줄 주석 제거
        let result = content.replace(/\/\/.*$/gm, '');
        // 여러 줄 주석 제거
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        return result;
    }
    /**
     * 중복 제거
     */
    deduplicateExtractions(extractions) {
        const seen = new Set();
        return extractions.filter(extraction => {
            const key = `${extraction.text}:${extraction.location.line}:${extraction.location.column}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    deduplicateJSExtractions(extractions) {
        const seen = new Set();
        return extractions.filter(extraction => {
            const key = `${extraction.text}:${extraction.location.line}:${extraction.location.column}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    // 헬퍼 메소드들
    extractTextNodeKorean(line) {
        // HTML 텍스트 노드에서 한글 추출 로직
        const results = [];
        const regex = />([^<]*[가-힣][^<]*)</g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const korean = this.extractKoreanFromText(match[1]);
            korean.forEach(text => {
                results.push({
                    text,
                    column: match.index + 1
                });
            });
        }
        return results;
    }
    extractAttributeKorean(line) {
        // 속성값에서 한글 추출 로직
        const results = [];
        const regex = /(\w+)=["']([^"']*[가-힣][^"']*)["']/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const korean = this.extractKoreanFromText(match[2]);
            korean.forEach(text => {
                results.push({
                    text,
                    column: match.index,
                    attributeType: match[1]
                });
            });
        }
        return results;
    }
    getElementType(line, column) {
        const tagMatch = line.match(/<(\w+)/);
        return tagMatch ? tagMatch[1] : 'unknown';
    }
    getFunctionContext(path) {
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
    getVariableContext(path) {
        if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
            return path.parent.id.name;
        }
        return '';
    }
    getObjectKeyContext(path) {
        if (t.isObjectProperty(path.parent) && t.isIdentifier(path.parent.key)) {
            return path.parent.key.name;
        }
        return '';
    }
    getVueVariableContext(path) {
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
    getSimpleVueContext(line) {
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
    getSimpleFunctionContext(line) {
        // 간단한 함수 컨텍스트 분석
        const functionMatch = line.match(/function\s+(\w+)|(\w+)\s*\(/);
        return functionMatch ? (functionMatch[1] || functionMatch[2] || 'anonymous') : '';
    }
    getSimpleVariableContext(line) {
        // 간단한 변수 컨텍스트 분석
        const varMatch = line.match(/(?:const|let|var)\s+(\w+)/);
        return varMatch ? varMatch[1] : '';
    }
    getSimpleObjectKeyContext(line) {
        // 간단한 객체 키 컨텍스트 분석
        const keyMatch = line.match(/(\w+)\s*:/);
        return keyMatch ? keyMatch[1] : '';
    }
}
//# sourceMappingURL=pattern-scanner.js.map