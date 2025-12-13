import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Parser, Node, Language } from 'web-tree-sitter';
import { ImportInfo, StructuredIndex, SymbolInfo } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const GRAMMAR_MAP: Record<string, string> = {
    '.js': 'tree-sitter-javascript.wasm',
    '.jsx': 'tree-sitter-javascript.wasm',
    '.ts': 'tree-sitter-typescript.wasm',
    '.tsx': 'tree-sitter-typescript.wasm',
    '.py': 'tree-sitter-python.wasm',
}

const languageCache = new Map<string, Language>();
const parserCache = new Map<string, Parser>();

export async function getLanguage(ext: string): Promise<Language | null> {
    if (languageCache.has(ext)) {
        return languageCache.get(ext)!;
    }

    const grammarFile = GRAMMAR_MAP[ext];
    if (!grammarFile) return null;

    const grammarPath = join(__dirname, 'grammars', grammarFile);
    const language = await Language.load(grammarPath);
    languageCache.set(ext, language);
    return language;
}

export function getParser(ext: string, language: Language): Parser {
    if (parserCache.has(ext)) {
        return parserCache.get(ext)!;
    }

    const parser = new Parser();
    parser.setLanguage(language);
    parserCache.set(ext, parser);
    return parser;
}

const NODE_TYPES = {
    functions: ['function_declaration', 'function_definition', 'method_definition', 'arrow_function'],
    classes: ['class_declaration', 'class_definition'],
    imports: ['import_statement', 'import_from_statement'],
};

function calculateSalience(exported: boolean, topLevel: boolean, depth: number, name: string): number {
    let score = 50;
    if (exported) score += 30;
    if (topLevel) score += 15;
    if (depth > 2) score -= 20;

    if (['main', 'init', 'run', 'execute', 'handle', 'process'].some(k => name.toLowerCase().includes(k))) {
        score += 10;
    }

    if (name.startsWith('_')) score -= 10;

    return Math.max(0, Math.min(100, score));
}

function extractSignature(n: Node, name: string): string {
    const params = n.childForFieldName('parameters');
    const paramsText = params?.text ?? '()';

    const returnType = n.childForFieldName('return_type');
    const returnText = returnType ? `: ${returnType.text}` : '';

    return `${name}${paramsText}${returnText}`;
}

function isExported(n: Node): boolean {
    const parent = n.parent;
    if (!parent) return false;

    const exportTypes = ['export_statement', 'export_default_declaration', 'exported_function_definition'];
    if (exportTypes.includes(parent.type)) return true;

    if (n.previousSibling?.type === 'export') return true;

    const grandparent = parent.parent;
    if (grandparent && exportTypes.includes(grandparent.type)) return true;

    return false;
}

export function extractStructuredIndex(rootNode: Node, categories: string[]): StructuredIndex {

    const index: StructuredIndex = {
        functions: {},
        classes: {},
        imports: []
    };

    const wantFunctions = categories.includes('all') || categories.includes('functions');
    const wantClasses = categories.includes('all') || categories.includes('classes');
    const wantImports = categories.includes('all') || categories.includes('imports');

    interface TraverseContext {
        currentClassId: string | null;
        depth: number;
    }

    function traverse(n: Node, ctx: TraverseContext) {
        const nodeType = n.type;
        const isTopLevel = n.parent === rootNode || n.parent?.type === 'program';
        if (wantClasses && NODE_TYPES.classes.includes(nodeType)) {
            const nameNode = n.childForFieldName('name');
            const name = nameNode?.text ?? 'anonymous';
            const id = `class@${n.startIndex}`;
            const exported = isExported(n);

            index.classes[id] = {
                id,
                name,
                startLine: n.startPosition.row + 1,
                endLine: n.endPosition.row + 1,
                startOffset: n.startIndex,
                endOffset: n.endIndex,
                isExported: exported,
                isTopLevel,
                nodeDepth: ctx.depth,
                parentId: null,
                salience: calculateSalience(exported, isTopLevel, ctx.depth, name),
            };

            if (wantFunctions) {
                for (let i = 0; i < n.childCount; i++) {
                    traverse(n.child(i)!, { currentClassId: id, depth: ctx.depth + 1 });
                }
            }
            return;
        }

        if (wantFunctions && NODE_TYPES.functions.includes(nodeType)) {
            let name = 'anonymous';

            if (nodeType === 'arrow_function') {
                const parent = n.parent;
                const isNamed = parent?.type === 'variable_declarator' ||
                    parent?.type === 'pair' ||
                    parent?.type === 'property';
                if (!isNamed && !isTopLevel) {
                    return;
                }
                if (parent?.type === 'variable_declarator') {
                    const varName = parent.childForFieldName('name');
                    name = varName?.text ?? 'anonymous';
                } else if (parent?.type === 'pair' || parent?.type === 'property') {
                    const keyNode = parent.childForFieldName('key');
                    name = keyNode?.text ?? 'anonymous';
                }
            } else {
                const nameNode = n.childForFieldName('name');
                name = nameNode?.text ?? 'anonymous';
            }

            const id = `fn@${n.startIndex}`;
            const exported = isExported(n);
            const signature = extractSignature(n, name);

            const symbolInfo: SymbolInfo = {
                id,
                name,
                signature,
                startLine: n.startPosition.row + 1,
                endLine: n.endPosition.row + 1,
                startOffset: n.startIndex,
                endOffset: n.endIndex,
                isExported: exported,
                isTopLevel,
                nodeDepth: ctx.depth,
                parentId: ctx.currentClassId,
                salience: calculateSalience(exported, isTopLevel, ctx.depth, name),
            };

            index.functions[id] = symbolInfo;
            return;
        }

        if (wantImports && isTopLevel && NODE_TYPES.imports.includes(nodeType)) {
            const moduleNode = n.childForFieldName('source') ??
                n.descendantsOfType('string')[0];
            const moduleSpecifier = moduleNode?.text?.replace(/['"]/g, '') ?? 'unknown';

            let kind: ImportInfo['kind'] = 'side-effect';
            const text = n.text;
            if (text.includes('* as')) kind = 'namespace';
            else if (text.includes('{')) kind = 'named';
            else if (text.includes('import ') && !text.includes('{')) kind = 'default';

            index.imports.push({
                id: `import@${n.startIndex}`,
                moduleSpecifier,
                kind,
                startOffset: n.startIndex,
                endOffset: n.endIndex,
            });
            return;
        }

        const isStructuralContainer = ['program', 'module', 'class_body', 'export_statement', 'lexical_declaration'].includes(nodeType);

        if (isStructuralContainer || ctx.depth < 2) {
            for (let i = 0; i < n.childCount; i++) {
                traverse(n.child(i)!, { ...ctx, depth: ctx.depth + 1 });
            }
        }
    }

    traverse(rootNode, { currentClassId: null, depth: 0 });
    return index;
}