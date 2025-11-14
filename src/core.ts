import * as dotenv from "dotenv"
import { ChatOpenAI } from "@langchain/openai";

// dotenv.config();

enum Models{
    GPT41 = "gpt-4.1",
    GPT4o = "gpt-4o-mini",
    GPT5 = "gpt-5"
}

class LLMCore{
    private api:string;
    private model:ChatOpenAI;

    constructor(api:string){
        this.api = api;
        this.model = new ChatOpenAI({model:"gpt-4o-mini",apiKey:this.api})
    }

    define_model(model:Models){
        this.model = new ChatOpenAI({model:model,apiKey:this.api})
    }

    async query(ask:string):Promise<string>{
        const res = await this.model.invoke(ask);
        return res.text;
    }
}

export default LLMCore

