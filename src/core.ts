import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, AIMessage } from "langchain";
import { OpenAITool,Providers,ProviderMap, ClaudeTool, GeminiTool, Message, DEC_PROMPT_RESPONSE } from "./types.js";
import { Tools } from "./tools.js";
import { get_simple_prompt } from "./prompt/simple.js"
import { get_planner_prompt } from "./prompt/planner.js"
import { loadMemory, saveMemory } from "./memory/memory.js";
import { get_executer_prompt } from "./prompt/executer.js";
import { PROMPT as ROUTER_PROMPT } from "./prompt/router.js";
import { router_tool_def } from "./tools-def/router_tools/def.js";
import chalk from "chalk"; 


// dotenv.config();

class LLMCore{
    private api:string;
    private plannerLLM:ChatOpenAI|ChatGoogleGenerativeAI|ChatAnthropic;
    private summarizerLLM:ChatOpenAI|ChatGoogleGenerativeAI|ChatAnthropic;
    private routerLLM:ChatOpenAI|ChatGoogleGenerativeAI|ChatAnthropic;
    private searchLLM:ChatOpenAI|ChatGoogleGenerativeAI|ChatAnthropic;
    private buildLLM:ChatOpenAI|ChatGoogleGenerativeAI|ChatAnthropic;
    private toolDefinition:(OpenAITool|ClaudeTool|GeminiTool)[];
    private getToolFromName:Map<string,any>;
    private routerToolDef: (OpenAITool|ClaudeTool|GeminiTool)[];
    private tools:Tools;

    constructor(provider:Providers , model:string ,api:string ,search_api:string){
        this.api = api;
        const LLM = ProviderMap[provider];
        this.tools = new Tools(search_api);
        this.getToolFromName = this.tools.getToolFromName;
        this.toolDefinition = this.tools.get_toolDefinition(provider);
        this.routerToolDef = router_tool_def.map((def) => def[provider]);
        // this.model = new LLM({ model, apiKey: api });
        this.routerLLM = new LLM({model,apiKey:api});
        this.searchLLM = new LLM({model,apiKey:api});
        this.buildLLM = new LLM({model,apiKey:api});
        this.plannerLLM = new LLM({model,apiKey:api});
        this.summarizerLLM = new LLM({model,apiKey:api});
    }

    async call_tool(res:any,messages:Message[],which:("build"|"search")){
        messages.push(new AIMessage({content : res.content , tool_calls: res.tool_calls}));
        // console.log("Tools called: ",JSON.stringify(res.tool_calls));
        for( const toolCall of res.tool_calls){
            const tool_name = toolCall.name;
            const tool_arg = toolCall.args;
            const tool_id = toolCall.id;

            console.log(chalk.greenBright.bold("\nRunning: " , tool_name,"\n"));
            const tool = await this.getToolFromName.get(tool_name);
            let toolResult;

            try{
                toolResult = await tool(tool_arg);
                // console.log(JSON.stringify(toolResult));
            }catch(err){
                toolResult = `TOOL ERROR: ${(err as Error).message}`;
            }

            messages.push({
                role:"tool",
                name: tool_name,
                tool_call_id: tool_id,
                content: tool_name === "web_search" ? JSON.stringify(toolResult.results ?? toolResult.result ?? null) : String(toolResult)
            });
            // console.log("Content: ",JSON.stringify(toolResult.results ?? toolResult.result ?? null));
        }

        // console.log("Messages: ",JSON.stringify(messages));
        let newRes:any;
        if(which === "build") newRes = await this.buildLLM.invoke(messages,{tools:this.toolDefinition,tool_choice:"auto"});
        else if(which === "search") newRes = await this.buildLLM.invoke(messages,{tools:this.toolDefinition,tool_choice:"auto"});
        // messages.push(new AIMessage({content : res.content , tool_calls: res.tool_calls}));
        return newRes;
    }

    async summarize(res:AIMessage , memory:any , ask:string){
        const compressionPrompt = [
            new SystemMessage("Summarize the conversation below so future messages retain necessary context. Be concise."),
            new HumanMessage(`
                Previous summary:
                ${memory.summary}
                
                Latest user message:
                ${ask}
                
                Latest assistant message:
                ${res.content}
            `)
        ];

        const compression = await this.summarizerLLM.invoke(compressionPrompt);
        saveMemory(compression.text);
    }

    async router(query:string):Promise<string>{
        const PROMPT = ROUTER_PROMPT;
        const tools = new Map<string , any>([["search",this.search.bind(this)],["build",this.build.bind(this)]]);
        const messages:Message[] = [
            new SystemMessage(PROMPT),
            new HumanMessage(query)
        ];
        // console.log(JSON.stringify(tool_def),"\n",JSON.stringify(messages));
        let res = await this.routerLLM.invoke(messages,{tools:this.routerToolDef,tool_choice:"auto"});
        messages.push(new AIMessage(res));

        if(res.tool_calls && res.tool_calls.length>0){
            // console.log("Tool call: ",JSON.stringify(res.tool_calls));
            const toolCall = res.tool_calls[0];

            const tool_name = toolCall.name;
            const tool_arg = toolCall.args;
            const tool_id = toolCall.id;

            // console.log("tool_name: " , tool_name , "\ntool_arg: ",JSON.stringify(tool_arg));

            const tool = tools.get(tool_name);
            let toolResult;
            const currentDate = new Date().toLocaleDateString('en-US',{
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            })

            try{
                // console.log("here trycatch\n");
                toolResult = await tool(tool_arg,currentDate);
                // console.log(JSON.stringify(toolResult));
            }catch(err){
                console.log(`TOOL ERROR: ${(err as Error).message}\n`);
                toolResult = `TOOL ERROR: ${(err as Error).message}`;
            }

            messages.push({
                role:"tool",
                name: tool_name,
                tool_call_id: tool_id,
                content: String(toolResult)
            });
            
        }else{
            messages.push(new AIMessage(res.content));
        }

        res = await this.routerLLM.invoke(messages);
        return res.text;
    }

    async search(toolArgs:{query:string},currentDate:string):Promise<string>{
        const routerNote = "CLI_OUTPUT_ONLY_NO_UNREQUESTED_FILE_CREATION";
        const ask = `${toolArgs.query}\n\n${routerNote}`;

        const memory = loadMemory();
        const PROMPT = get_simple_prompt(currentDate);
        const messages:Message[] = [
            new SystemMessage(`${PROMPT}
                Memory Summary of Previous Conversation: ${memory.summary || "(empty)"}`),
            new HumanMessage(ask)
        ];

        let res = await this.searchLLM.invoke(messages,{tools: this.toolDefinition , tool_choice:"auto"});
        if(res.tool_calls && res.tool_calls.length>0){
            res = await this.call_tool(res,messages,"search");
        }else{
            messages.push(new AIMessage(res.text));
        }

        this.summarize(res,memory,ask);
        return res.text;
    }

    async build(toolArgs:{query:string},currentDate:string):Promise<string>{
        // console.log("here inside build\n");
        const memory = loadMemory();
        const ask = toolArgs.query;
        // console.log(query);
        // console.log("\n",ask);

        const PROMPT = get_planner_prompt(currentDate);
        // console.log("\n",currentDate);
        const pre_messages:Message[] = [
            new SystemMessage(PROMPT),
            new HumanMessage(ask)
        ];
        let planner_res = await this.plannerLLM.invoke(pre_messages);

        const PLANNER_RES = planner_res.text;
        console.log(PLANNER_RES,"\n");
        // console.log(PLANNER_RES);

        // messages.push(new AIMessage({content:planner_res.content}));

        const PROMPT_EXECUTOR = get_executer_prompt();

        const messages:Message[] = [
            new SystemMessage(`${PROMPT_EXECUTOR}
                Memory Summary of Previous Conversation: ${memory.summary || "(empty)"}`),
            new HumanMessage(`Execute this plan:\n\n${PLANNER_RES}\n\nOriginal user request: ${ask}`)
        ]

        let res = await this.buildLLM.invoke(messages,{tools: this.toolDefinition , tool_choice:"auto"});

        // const MAX_TOOL_CALL_ITERATIONS = 5;
        // let iteration = 0;

        while(res.tool_calls && res.tool_calls.length > 0){ // && iteration < MAX_TOOL_CALL_ITERATIONS
            res = await this.call_tool(res,messages,"build");
            // iteration++;
        }

        // if (iteration >= MAX_TOOL_CALL_ITERATIONS) {
        //     // console.warn("Tool calling hit maximum iteration limit.");
        //     messages.push(new SystemMessage("You have run out of tool usage attempts. Provide the best final answer possible based on the current context."));
        //     res = await this.buildLLM.invoke(messages);
        // }

        messages.push(new AIMessage({content : res.content , tool_calls: res.tool_calls}));

        this.summarize(res,memory,ask);
        return res.text;
    }
}

export default LLMCore

