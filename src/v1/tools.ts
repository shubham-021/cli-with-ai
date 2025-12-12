import { TavilySearch } from "@langchain/tavily";
import { stat, readFile, unlink, rm, rename, copyFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import path from 'node:path'
import { all_def } from "./tools-def/all_def.js"
import { MessagesMappedToTools, Providers, ToolMap } from "../types.js";
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFParse } from "pdf-parse";
import inquirer from "inquirer";
import { glob } from 'glob';
import { getListPrompt_In } from "../inquirer.js";

const execAsync = promisify(exec);


export class Tools {
    private search_model: TavilySearch;
    private tool_definition_list: ToolMap[] = all_def;
    private fn_with_name = [
        ["web_search", this.web_search.bind(this)],
        ["append_file", this.append_file],
        ["create_file", this.create_file],
        ["current_loc", this.current_loc],
        ["make_dir", this.make_dir],
        ["write_file", this.write_file],
        ["execute_command", this.execute_command],
        ["parse_pdf", this.parse_pdf],
        ["read_file", this.read_file],
        ["copy_file", this.copy_file],
        ["delete_file_dir", this.delete_file_dir],
        ["move_file", this.move_file],
        ["http_request", this.http_request],
        ["search_in_files", this.search_in_files]
    ]
    getToolFromName = new Map();

    constructor(api: string) {
        this.search_model = new TavilySearch({ tavilyApiKey: api, maxResults: 5 })
        this.fn_with_name.map((fn) => { this.getToolFromName.set(fn[0], fn[1]) });
    };

    get_toolDefinition(provider: Providers) {
        return this.tool_definition_list.map((tool: ToolMap) => tool[provider]);
    }

    async web_search(arg: { query: string }) {
        try {
            console.log(`${MessagesMappedToTools.get("web_search")} ${arg.query}\n`);
            const search_res = await this.search_model.invoke(arg);
            return search_res;
        } catch (error) {
            throw new Error((error as Error).message);
        }
    };

    current_loc() {
        console.log(`${MessagesMappedToTools.get("current_loc")}\n`);
        return process.cwd();
    }

    async make_dir(arg: { path: string }) {
        const { path: dirPath } = arg;
        const full = path.resolve(process.cwd(), dirPath);
        console.log(`${MessagesMappedToTools.get("make_dir")}: ${full}\n`);
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to create directories outside project");
        }
        await mkdir(full, { recursive: true });
        return `Directory created at: ${full}`;
    }

    async create_file(arg: { path: string }) {
        const { path: targetPath } = arg;
        const full = path.resolve(process.cwd(), targetPath);
        console.log(`${MessagesMappedToTools.get("create_file")}: ${full}\n`);

        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to create files outside project");
        }

        const dir = path.dirname(full);
        await mkdir(dir, { recursive: true });

        await writeFile(full, "");

        return `File created at: ${full}`;
    }

    async write_file(arg: { path: string; content: string }) {
        const { path: targetPath, content } = arg;
        const full = path.resolve(process.cwd(), targetPath);
        console.log(`${MessagesMappedToTools.get("write_file")}: ${full}\n`);

        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to write outside project");
        }

        const dir = path.dirname(full);
        await mkdir(dir, { recursive: true });

        await writeFile(full, content);

        return `Wrote content to: ${full}`;
    }

    async append_file(arg: { path: string; content: string }) {
        const { path: targetPath, content } = arg;
        const full = path.resolve(process.cwd(), targetPath);
        console.log(`${MessagesMappedToTools.get("append_file")}: ${path}\n`);

        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to write outside project");
        }

        const dir = path.dirname(full);
        mkdir(dir, { recursive: true });

        appendFile(full, content);

        return `Appended content to: ${full}`;
    }

    async execute_command(arg: { command: string; cwd?: string }) {
        const { command, cwd } = arg;
        const workingDir = cwd ? path.resolve(process.cwd(), cwd) : process.cwd();
        console.log(`${MessagesMappedToTools.get("execute_command")}: ${command}\n`);

        const dangerousPatterns = [
            /rm\s+-rf\s+\//,  // rm -rf /
            /sudo/,           // sudo commands
            />.*\/dev/,       // redirects to /dev
            /mkfs/,           // format disk
            /dd\s+if=/        // disk operations
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                throw new Error(`Dangerous command blocked: ${command}`);
            }
        }

        const choice = await getListPrompt_In(["Proceed", "Cancel"], `Running command ${command}`);

        if (choice !== "Proceed") return "User prevented command from execution";

        if (!workingDir.startsWith(process.cwd())) {
            throw new Error("Cannot execute commands outside project directory");
        }

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: workingDir,
                timeout: 300000,
                maxBuffer: 1024 * 1024 * 10,
            });

            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            };
        } catch (error) {
            const err = error as any;
            throw new Error(`Command failed: ${err.message}\nstdout: ${err.stdout}\nstderr: ${err.stderr}`);
        }
    }

    async parse_pdf(arg: { path: string }): Promise<string> {
        const { path } = arg;
        console.log(`${MessagesMappedToTools.get("parse_pdf")}: ${path}\n`);
        try {
            const buffer = await readFile(path);
            const parser = new PDFParse({ data: buffer });

            const result = await parser.getText();
            parser.destroy();
            return result.text;
        } catch (error) {
            return `Error reading this file , Error:${(error as Error).message}`
        }
    }

    async read_file(arg: { path: string }): Promise<string> {
        const path = arg.path;
        console.log(`${MessagesMappedToTools.get("read_file")}: ${path}\n`);
        const buffer = await readFile(path);

        const text = buffer.toString();

        return text;
    }

    async delete_file_dir(arg: { path: string, recursive?: boolean }): Promise<string> {
        try {
            const { path: targetPath, recursive = false } = arg;
            if (!path) throw new Error('Path is not specified');

            const fullPath = path.resolve(process.cwd(), targetPath);

            if (!fullPath.startsWith(process.cwd())) throw new Error('Refusing to delete files outside the project');

            const stats = await stat(fullPath);

            if (stats.isDirectory()) {
                if (recursive) {
                    console.log(`${MessagesMappedToTools.get("delete_file_dir")} directory at path: ${fullPath}\n`);
                    await rm(fullPath, { recursive: true, force: true });
                    return 'Deleted Directory';
                } else {
                    throw new Error('Use recursive=true to delete directories');
                }
            } else {
                console.log(`${MessagesMappedToTools.get("delete_file_dir")} file at path: ${fullPath}\n`);
                await unlink(fullPath);
                return `Deleted file: ${fullPath}`;
            }
        } catch (error) {
            throw new Error((error as Error).message)
        }
    }

    async move_file(arg: { source: string, destination: string }): Promise<string> {
        const { source, destination } = arg;

        const fullSource = path.resolve(process.cwd(), source);
        const fullDest = path.resolve(process.cwd(), destination);
        console.log(`${MessagesMappedToTools.get("move_file")} at ${fullSource} to ${fullDest}\n`);
        if (!fullSource.startsWith(process.cwd()) || !fullDest.startsWith(process.cwd())) {
            throw new Error('Refusing to move files outside project');
        }

        await rename(fullSource, fullDest);
        return `Moved ${source} to ${destination}`;
    }

    async copy_file(arg: { source: string, destination: string }): Promise<string> {
        const { source, destination } = arg;

        const fullSource = path.resolve(process.cwd(), source);
        const fullDest = path.resolve(process.cwd(), destination);
        console.log(`${MessagesMappedToTools.get("copy_file")} at ${fullSource} to ${fullDest}\n`);

        if (!fullSource.startsWith(process.cwd()) || !fullDest.startsWith(process.cwd())) {
            throw new Error('Refusing to copy files outside project');
        }

        await copyFile(fullSource, fullDest);
        return `Copied ${source} to ${destination}`;
    }

    async search_in_files(arg: { query: string, path?: string, filePattern?: string, caseSensitive?: boolean }) {
        const { query, path: searchPath = '.', filePattern = '**/*', caseSensitive = false } = arg;
        const files = await glob(filePattern, {
            cwd: path.resolve(process.cwd(), searchPath),
            ignore: ['node_modules/**', '.git/**', 'dist/**']
        });
        console.log(`${MessagesMappedToTools.get("search_in_files")} ${path} for ${query}\n`);

        const results: Array<{ file: string, line: number, content: string }> = [];
        const regex = new RegExp(query, caseSensitive ? 'g' : 'gi');

        for (const file of files) {
            const content = await readFile(file, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                if (regex.test(line)) {
                    results.push({
                        file,
                        line: index + 1,
                        content: line.trim()
                    });
                }
            })
        }

        return results.map(r => `${r.file}: ${r.line}: ${r.content}`).join('\n');
    }

    async http_request(arg: {
        url: string,
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
        headers?: Record<string, string>,
        body?: any
    }) {
        const { url, method = 'GET', headers = {}, body } = arg;
        console.log(`${MessagesMappedToTools.get("http_request")} ${url}\n`);
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
}