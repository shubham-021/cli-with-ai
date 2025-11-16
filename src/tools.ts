import { TavilySearch } from "@langchain/tavily";
import fs from 'node:fs'
import path from 'node:path'
import { webSearch } from "./tools-def/web_search.js";
import { currLoc } from "./tools-def/current_loc.js";
import { makeDir } from "./tools-def/make_dir.js"
import { writeFile } from "./tools-def/write_file.js";
import { appendFile } from "./tools-def/append_file.js";
import { createFile } from "./tools-def/create_file.js"
import { Providers, ToolMap } from "./types.js";

export class Tools{
    private search_model:TavilySearch;
    private tool_definition_list:ToolMap[] = [currLoc,makeDir,writeFile,appendFile,createFile,webSearch];
    private fn_with_name = [
        ["web_search",this.web_search.bind(this)],
        ["append_file",this.append_file.bind(this)],
        ["create_file",this.create_file.bind(this)],
        ["current_loc",this.current_loc.bind(this)],
        ["make_dir",this.make_dir.bind(this)],
        ["write_file",this.write_file.bind(this)]
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

    make_dir(name:string){
        const full = path.resolve(process.cwd(), name);
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to create directories outside project");
        }
        fs.mkdirSync(name,{recursive:true});
        return `Directory created at: ${full}`;
    }

    create_file(targetPath: string) {
        const full = path.resolve(process.cwd(), targetPath);
    
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to create files outside project");
        }
    
        const dir = path.dirname(full);
        fs.mkdirSync(dir, { recursive: true });
    
        fs.writeFileSync(full, "");
    
        return `File created at: ${full}`;
    }

    write_file(targetPath: string, content: string) {
        const full = path.resolve(process.cwd(), targetPath);
    
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to write outside project");
        }
    
        const dir = path.dirname(full);
        fs.mkdirSync(dir, { recursive: true });
    
        fs.writeFileSync(full, content);
    
        return `Wrote content to: ${full}`;
    }

    append_file(targetPath: string, content: string) {
        const full = path.resolve(process.cwd(), targetPath);
    
        if (!full.startsWith(process.cwd())) {
            throw new Error("Refusing to write outside project");
        }
    
        const dir = path.dirname(full);
        fs.mkdirSync(dir, { recursive: true });
    
        fs.appendFileSync(full, content);
    
        return `Appended content to: ${full}`;
    }    
}