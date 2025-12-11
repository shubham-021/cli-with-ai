import { z } from 'zod';
import { ToolDefinition } from './types.js';
import { readFile, writeFile, mkdir, unlink, rm, rename, copyFile, appendFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFParse } from 'pdf-parse';
import { glob } from 'glob';

const execAsync = promisify(exec);

export function defineTool<TInput, TOutput>(
    def: ToolDefinition<TInput, TOutput>
): ToolDefinition<TInput, TOutput> {
    return def;
}

// 1. web_search
export function makeWebSearchTool(tavilyApiKey: string): ToolDefinition<{ query: string }, any> {
    return defineTool({
        name: 'web_search',
        description: 'Search the web for information. Use this to get the latest information on a topic.',
        category: 'search',
        inputSchema: z.object({
            query: z.string().describe('The search query')
        }),
        async execute({ query }) {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: tavilyApiKey,
                    query,
                    max_results: 5
                })
            });
            if (!response.ok) {
                throw new Error(`Tavily API error: ${response.status}`);
            }
            const data = await response.json();
            return JSON.stringify(data.results ?? data, null, 2);
        }
    });
}

// 2. read_file
export const readFileTool = defineTool({
    name: 'read_file',
    description: 'Read the contents of a file and return it as text.',
    category: 'filesystem',
    inputSchema: z.object({
        path: z.string().describe('File path to read')
    }),
    async execute({ path: filePath }, { cwd }) {
        const fullPath = path.resolve(cwd, filePath);
        const content = await readFile(fullPath, 'utf-8');
        return content;
    }
});

// 3. write_file
export const writeFileTool = defineTool({
    name: 'write_file',
    description: 'Write content to a file. Overwrites existing content.',
    category: 'filesystem',
    inputSchema: z.object({
        path: z.string().describe('File path to write'),
        content: z.string().describe('Content to write')
    }),
    needsApproval: true,
    async execute({ path: filePath, content }, { cwd }) {
        const fullPath = path.resolve(cwd, filePath);

        if (!fullPath.startsWith(cwd)) {
            throw new Error('Refusing to write outside project');
        }

        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content);
        return `Wrote content to: ${fullPath}`;
    }
});

// 4. create_file
export const createFileTool = defineTool({
    name: 'create_file',
    description: 'Create an empty file. Parent directories will be created if missing.',
    category: 'filesystem',
    inputSchema: z.object({
        path: z.string().describe('File path to create')
    }),
    async execute({ path: filePath }, { cwd }) {
        const fullPath = path.resolve(cwd, filePath);

        if (!fullPath.startsWith(cwd)) {
            throw new Error('Refusing to create files outside project');
        }

        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, '');
        return `File created at: ${fullPath}`;
    }
});

// 5. append_file
export const appendFileTool = defineTool({
    name: 'append_file',
    description: 'Append content to a file.',
    category: 'filesystem',
    inputSchema: z.object({
        path: z.string().describe('File path to append to'),
        content: z.string().describe('Content to append')
    }),
    async execute({ path: filePath, content }, { cwd }) {
        const fullPath = path.resolve(cwd, filePath);

        if (!fullPath.startsWith(cwd)) {
            throw new Error('Refusing to write outside project');
        }

        await mkdir(path.dirname(fullPath), { recursive: true });
        await appendFile(fullPath, content);
        return `Appended content to: ${fullPath}`;
    }
});

// 6. make_dir
export const makeDirTool = defineTool({
    name: 'make_dir',
    description: 'Create a directory. Relative paths resolve from current working directory.',
    category: 'filesystem',
    inputSchema: z.object({
        path: z.string().describe('Directory path to create')
    }),
    async execute({ path: dirPath }, { cwd }) {
        const fullPath = path.resolve(cwd, dirPath);

        if (!fullPath.startsWith(cwd)) {
            throw new Error('Refusing to create directories outside project');
        }

        await mkdir(fullPath, { recursive: true });
        return `Directory created at: ${fullPath}`;
    }
});

// 7. current_loc
export const currentLocTool = defineTool({
    name: 'current_loc',
    description: 'Get the current working directory.',
    category: 'system',
    inputSchema: z.object({}),
    async execute(_input, { cwd }) {
        return cwd;
    }
});

// 8. delete_file_dir
export const deleteFileDirTool = defineTool({
    name: 'delete_file_dir',
    description: 'Delete a file or directory',
    category: 'filesystem',
    inputSchema: z.object({
        path: z.string().describe('File or directory path to delete'),
        recursive: z.boolean().optional().describe('True for directory, false for file')
    }),
    needsApproval: true,
    async execute({ path: targetPath, recursive = false }, { cwd }) {
        const fullPath = path.resolve(cwd, targetPath);

        if (!fullPath.startsWith(cwd)) {
            throw new Error('Refusing to delete files outside the project');
        }

        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
            if (recursive) {
                await rm(fullPath, { recursive: true, force: true });
                return `Deleted directory: ${fullPath}`;
            } else {
                throw new Error('Use recursive=true to delete directories');
            }
        } else {
            await unlink(fullPath);
            return `Deleted file: ${fullPath}`;
        }
    }
});

// 9. move_file
export const moveFileTool = defineTool({
    name: 'move_file',
    description: 'Move a file from source to destination',
    category: 'filesystem',
    inputSchema: z.object({
        source: z.string().describe('Source file path'),
        destination: z.string().describe('Destination file path')
    }),
    async execute({ source, destination }, { cwd }) {
        const fullSource = path.resolve(cwd, source);
        const fullDest = path.resolve(cwd, destination);

        if (!fullSource.startsWith(cwd) || !fullDest.startsWith(cwd)) {
            throw new Error('Refusing to move files outside project');
        }

        await rename(fullSource, fullDest);
        return `Moved ${source} to ${destination}`;
    }
});

// 10. copy_file
export const copyFileTool = defineTool({
    name: 'copy_file',
    description: 'Copy a file from source to destination',
    category: 'filesystem',
    inputSchema: z.object({
        source: z.string().describe('Source file path'),
        destination: z.string().describe('Destination file path')
    }),
    async execute({ source, destination }, { cwd }) {
        const fullSource = path.resolve(cwd, source);
        const fullDest = path.resolve(cwd, destination);

        if (!fullSource.startsWith(cwd) || !fullDest.startsWith(cwd)) {
            throw new Error('Refusing to copy files outside project');
        }

        await copyFile(fullSource, fullDest);
        return `Copied ${source} to ${destination}`;
    }
});

// 11. execute_command
export const executeCommandTool = defineTool({
    name: 'execute_command',
    description: 'Execute shell commands like npm install, npm run dev, git commands, etc.',
    category: 'system',
    inputSchema: z.object({
        command: z.string().describe('The shell command to execute'),
        cwd: z.string().optional().describe('Working directory (optional)')
    }),
    needsApproval: true,
    async execute({ command, cwd: workingDir }, { cwd }) {
        const targetDir = workingDir ? path.resolve(cwd, workingDir) : cwd;

        if (!targetDir.startsWith(cwd)) {
            throw new Error('Cannot execute commands outside project directory');
        }

        const { stdout, stderr } = await execAsync(command, {
            cwd: targetDir,
            timeout: 300000,
            maxBuffer: 1024 * 1024 * 10
        });

        return JSON.stringify({
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim()
        });
    }
});

// 12. parse_pdf
export const parsePdfTool = defineTool({
    name: 'parse_pdf',
    description: 'Read a PDF file and extract its text content.',
    category: 'filesystem',
    inputSchema: z.object({
        path: z.string().describe('Path to PDF file')
    }),
    async execute({ path: pdfPath }, { cwd }) {
        const fullPath = path.resolve(cwd, pdfPath);
        const buffer = await readFile(fullPath);
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        parser.destroy();
        return result.text;
    }
});

// 13. search_in_files
export const searchInFilesTool = defineTool({
    name: 'search_in_files',
    description: 'Search for a query string within files in a directory.',
    category: 'filesystem',
    inputSchema: z.object({
        query: z.string().describe('The string to search for'),
        path: z.string().optional().describe('Directory to search in (default: current)'),
        filePattern: z.string().optional().describe('Glob pattern for files (default: **/*)'),
        caseSensitive: z.boolean().optional().describe('Case-sensitive search')
    }),
    async execute({ query, path: searchPath = '.', filePattern = '**/*', caseSensitive = false }, { cwd }) {
        const targetPath = path.resolve(cwd, searchPath);
        const files = await glob(filePattern, {
            cwd: targetPath,
            ignore: ['node_modules/**', '.git/**', 'dist/**']
        });

        const results: Array<{ file: string, line: number, content: string }> = [];
        const regex = new RegExp(query, caseSensitive ? 'g' : 'gi');

        for (const file of files) {
            const fullFilePath = path.join(targetPath, file);
            const content = await readFile(fullFilePath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                if (regex.test(line)) {
                    results.push({
                        file,
                        line: index + 1,
                        content: line.trim()
                    });
                }
            });
        }

        return results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n');
    }
});

// 14. http_request
export const httpRequestTool = defineTool({
    name: 'http_request',
    description: 'Perform an HTTP request to a URL.',
    category: 'web',
    inputSchema: z.object({
        url: z.string().describe('The URL to request'),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().describe('HTTP method'),
        headers: z.record(z.string(), z.string()).optional().describe('Custom headers'),
        body: z.any().optional().describe('Request body (will be JSON stringified)')
    }),
    async execute({ url, method = 'GET', headers = {}, body }) {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();
        return JSON.stringify(data, null, 2);
    }
});