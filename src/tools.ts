import { TavilySearch } from "@langchain/tavily";
import fs from 'node:fs'
import path from 'node:path'
import { webSearch } from "./tools-def/web_search.js";
import { currLoc } from "./tools-def/current_loc.js";
import { makeDir } from "./tools-def/make_dir.js"
import { writeFile } from "./tools-def/write_file.js";
import { appendFile } from "./tools-def/append_file.js";
import { createFile } from "./tools-def/create_file.js"
import { executeCommand } from "./tools-def/execute_command.js"
import { Providers, ToolMap } from "./types.js";
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);


export class Tools{
    private search_model:TavilySearch;
    private tool_definition_list:ToolMap[] = [currLoc,makeDir,writeFile,appendFile,createFile,webSearch,executeCommand];
    private fn_with_name = [
        ["web_search",this.web_search.bind(this)],
        ["append_file",this.append_file.bind(this)],
        ["create_file",this.create_file.bind(this)],
        ["current_loc",this.current_loc.bind(this)],
        ["make_dir",this.make_dir.bind(this)],
        ["write_file",this.write_file.bind(this)],
        ["execute_command", this.execute_command.bind(this)]
    ]
    getToolFromName = new Map();

    constructor(api:string){
        this.search_model = new TavilySearch({tavilyApiKey:api,maxResults:5})
        this.fn_with_name.map((fn) => {this.getToolFromName.set(fn[0],fn[1])});
    };

    get_toolDefinition(provider:Providers){
        return this.tool_definition_list.map((tool:ToolMap)=> tool[provider]);
    }

    async web_search(arg:{query:string}){
        try{
            const search_res = await this.search_model.invoke(arg);
            return search_res;
        }catch(error){
            throw new Error((error as Error).message);
        }
    };

    current_loc(){
        return process.cwd();
    }

    make_dir(arg: { path: string }){
        const { path: dirPath } = arg;
        const full = path.resolve(process.cwd(), dirPath);
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to create directories outside project");
        }
        fs.mkdirSync(full,{recursive:true});
        return `Directory created at: ${full}`;
    }

    create_file(arg: { path: string }) {
        const { path: targetPath } = arg;
        const full = path.resolve(process.cwd(), targetPath);
    
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to create files outside project");
        }
    
        const dir = path.dirname(full);
        fs.mkdirSync(dir, { recursive: true });
    
        fs.writeFileSync(full, "");
    
        return `File created at: ${full}`;
    }

    write_file(arg: { path: string; content: string }) {
        const { path: targetPath, content } = arg;
        const full = path.resolve(process.cwd(), targetPath);
    
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to write outside project");
        }
    
        const dir = path.dirname(full);
        fs.mkdirSync(dir, { recursive: true });
    
        fs.writeFileSync(full, content);
    
        return `Wrote content to: ${full}`;
    }

    append_file(arg: { path: string; content: string }) {
        const { path: targetPath, content } = arg;
        const full = path.resolve(process.cwd(), targetPath);
    
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to write outside project");
        }
    
        const dir = path.dirname(full);
        fs.mkdirSync(dir, { recursive: true });
    
        fs.appendFileSync(full, content);
    
        return `Appended content to: ${full}`;
    }    

    async execute_command(arg: { command: string; cwd?: string }) {
        const { command, cwd } = arg;
        const workingDir = cwd ? path.resolve(process.cwd(), cwd) : process.cwd();
        
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
}