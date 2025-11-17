import * as dotenv from "dotenv"
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


// dotenv.config();

class LLMCore{
    private api:string;
    private model:ChatOpenAI|ChatGoogleGenerativeAI|ChatAnthropic;
    private toolDefinition:(OpenAITool|ClaudeTool|GeminiTool)[];
    private getToolFromName:Map<string,any>;
    private tools:Tools;

    constructor(provider:Providers , model:string ,api:string ,search_api:string){
        this.api = api;
        const LLM = ProviderMap[provider];
        this.tools = new Tools(search_api);
        this.getToolFromName = this.tools.getToolFromName;
        this.toolDefinition = this.tools.get_toolDefinition(provider);
        this.model = new LLM({ model, apiKey: api });
    }

    async query(ask:string):Promise<string>{
        const currentDate = new Date().toLocaleDateString('en-US',{
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        })
        // console.log(currentDate);

        const DEC_PROMPT =  `You are an AI agent whose job is to verify if user has asked to a simply query or to build something on his machine. 
            If query is to build any project:
                Response format: {"build":true}
            else
                Response format: {"build":false}

            Rule:
                Follow the exact output schema that is provided.
        `;

        const pre_message:Message[] = [
            new SystemMessage(DEC_PROMPT),
            new HumanMessage(ask)
        ];

        const build = (await this.model.withStructuredOutput(DEC_PROMPT_RESPONSE).invoke(pre_message)).build;
        const memory = loadMemory();

        if(!build){
            const PROMPT = get_simple_prompt(currentDate);
            const messages:Message[] = [
                new SystemMessage(`${PROMPT}
                    Memory Summary of Previous Conversation: ${memory.summary || "(empty)"}`),
                new HumanMessage(ask)
            ];

            let res = await this.model.invoke(messages,{tools: this.toolDefinition , tool_choice:"auto"});
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
    
            const compression = await this.model.invoke(compressionPrompt);
            saveMemory(compression.text);
            return res.text;
        }else{
            const PROMPT = get_planner_prompt(currentDate);
            const messages:Message[] = [
                new SystemMessage(PROMPT),
                new HumanMessage(ask)
            ];
            let planner_res = await this.model.invoke(messages);

            const PLANNER_RES = planner_res.text;
            console.log(PLANNER_RES);

            messages.push(new AIMessage({content:planner_res.content}));

            const PROMPT_EXECUTOR = get_executer_prompt();

            messages.push(
                new SystemMessage(`${PROMPT_EXECUTOR}
                    Memory Summary of Previous Conversation: ${memory.summary || "(empty)"}`),
                new HumanMessage(`Execute this plan:\n\n${PLANNER_RES}\n\nOriginal user request: ${ask}`)
            )

            let res = await this.model.invoke(messages,{tools: this.toolDefinition , tool_choice:"auto"});

            while(res.tool_calls && res.tool_calls.length > 0){
                messages.push(new AIMessage({content : res.content , tool_calls: res.tool_calls}));

                for( const toolCall of res.tool_calls){
                    const tool_name = toolCall.name;
                    const tool_arg = toolCall.args;
                    const tool_id = toolCall.id;

                    // console.log(tool_name ,"\n", JSON.stringify(tool_arg));
                    console.log("Running: " , tool_name , "\n");
                    const tool = await this.getToolFromName.get(tool_name);
                    let toolResult;

                    try{
                        toolResult = await tool(tool_arg);
                    }catch(err){
                        toolResult = `TOOL ERROR: ${(err as Error).message}`;
                    }

                    messages.push({
                        role:"tool",
                        name: tool_name,
                        tool_call_id: tool_id,
                        content: tool_name === "web_search" ? JSON.stringify(toolResult.result) : String(toolResult)
                    });
                };

                res = await this.model.invoke(messages,{tools:this.toolDefinition,tool_choice:"auto"});
            }

            messages.push(new AIMessage({content : res.content , tool_calls: res.tool_calls}));

            const compressionPrompt = [
                new SystemMessage("Summarize the conversation below so future messages retain necessary context. Be concise."),
                new HumanMessage(`
                    Previous summary:
                    ${memory.summary}
                    
                    Latest user message:
                    ${ask}
                    
                    Latest assistant message:
                    ${res.text}
                `)
            ];
    
            const compression = await this.model.invoke(compressionPrompt);
            saveMemory(compression.text);
            return res.text;
        }
    }
}

export default LLMCore

