import * as dotenv from "dotenv"
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, AIMessage } from "langchain";
import { OpenAITool,Providers,ProviderMap, ClaudeTool, GeminiTool } from "./types.js";
import { Tools } from "./tools.js";
import { get_prompt } from "./prompt/prompt.js"

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

        const PROMPT = get_prompt(currentDate);

        const messages:(SystemMessage|HumanMessage|AIMessage|{role:string,content:string,tool_call_id?:string,name:string})[] = [
            new SystemMessage(PROMPT),
            new HumanMessage(ask)
        ];
        const res = await this.model.invoke(messages,{tools: this.toolDefinition , tool_choice:"auto"});
        if(!res.tool_calls || res.tool_calls.length == 0) return res.text;
        else{
            const toolCall = res.tool_calls[0];
            const tool_name = toolCall.name;
            const tool_arg = toolCall.args;
            const tool_id = toolCall.id;

            const res_web = await this.getToolFromName.get(tool_name)(tool_arg);

            messages.push(new AIMessage(res));
            messages.push({
                role:"tool",
                content:JSON.stringify(res_web.results),
                tool_call_id: tool_id,
                name: tool_name
            })

            const final_res = await this.model.invoke(messages);
            // console.log(res_web,JSON.stringify(tool_arg));
            return final_res.text;
        }
    }
}

export default LLMCore

