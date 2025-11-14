import * as dotenv from "dotenv"
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { HumanMessage, SystemMessage, AIMessage } from "langchain";

// dotenv.config();

enum Models{
    GPT41 = "gpt-4.1",
    GPT4o = "gpt-4o-mini",
    GPT5 = "gpt-5"
}

class LLMCore{
    private api:string;
    private search_model_setup:boolean = false;
    private model:ChatOpenAI;
    private toolDefinition = {
        type: "function",
        function:{
            name: "web_search",
            description: "Search the web for current time informations",
            parameters:{
                type:"object",
                properties: {
                    query: {
                        type: "string",
                        description: "The query to find information about."
                    }
                },
                required: ["query"]
            }
        }
    };
    private tool = new Map();
    private search_model!: TavilySearch;

    constructor(api:string){
        this.api = api;
        this.model = new ChatOpenAI({model:"gpt-4o-mini",apiKey:this.api})
    }

    private async web_search(arg:{query:string}){
        try{
            const search_res = await this.search_model.invoke(arg);
            return search_res;
        }catch(error){
            throw new Error((error as Error).message);
        }
    }

    set_current_search(api:string){
        this.search_model = new TavilySearch({tavilyApiKey:api,maxResults:5});
        this.search_model_setup = true;
        this.tool.set("web_search",this.web_search.bind(this));
    }


    define_model(model:Models){
        this.model = new ChatOpenAI({model:model,apiKey:this.api})
    }

    async query(ask:string):Promise<string>{
        const currentDate = new Date().toLocaleDateString('en-US',{
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        })
        // console.log(currentDate);

        const messages:(SystemMessage|HumanMessage|AIMessage|{role:string,content:string,tool_call_id?:string,name:string})[] = [
            new SystemMessage(`You are ai assistant , you can chat with users as their necessity. If users ask about recent events or current information,
                use the web_search tool with the correct date in the query. You can use the current date given to generate a precise query.

                Current Date: ${currentDate}
            `),
            new HumanMessage(ask)
        ];
        const res = await this.model.invoke(messages,{tools: [this.toolDefinition] , tool_choice:"auto"});
        if(!res.tool_calls || res.tool_calls.length == 0) return res.text;
        else{
            const toolCall = res.tool_calls[0];
            const tool_name = toolCall.name;
            const tool_arg = toolCall.args;
            const tool_id = toolCall.id;

            if(!this.search_model_setup) throw new Error("API key not set for search model");
            const res_web = await this.tool.get(tool_name)(tool_arg);

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

