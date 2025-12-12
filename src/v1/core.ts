import { HumanMessage, SystemMessage, AIMessage } from "langchain";
import { Providers, ProviderMap, Message, ChatModels, ToolsTypes, MessagesMappedToTools, Message_memory, LTMESSAGETYPE } from "../types.js";
import { Tools } from "./tools.js";
import { S_PROMPT } from "./prompt/simple.js"
import { get_planner_prompt } from "./prompt/planner.js"
import { load_LTMemory, load_STMemory, saveLTMemory, saveSTMemory } from "../memory/memory.js";
import { get_executer_prompt } from "./prompt/executer.js";
import { PROMPT as ROUTER_PROMPT } from "./prompt/router.js";
import { router_tool_def } from "./tools-def/router_tools/def.js";
import chalk from "chalk";
import ora from "ora";
import { LT_PROMPT } from "./prompt/memory.js";

// dotenv.config();

class LLMCore {
    private plannerLLM: ChatModels;
    private LTMemory: ChatModels;
    private routerLLM: ChatModels;
    private searchLLM: ChatModels;
    private buildLLM: ChatModels;
    private toolDefinition: ToolsTypes;
    private getToolFromName: Map<string, any>;
    private routerToolDef: ToolsTypes;
    private tools: Tools;

    constructor(provider: Providers, model: string, api: string, search_api: string) {
        const LLM = ProviderMap[provider];
        this.tools = new Tools(search_api);
        this.getToolFromName = this.tools.getToolFromName;
        this.toolDefinition = this.tools.get_toolDefinition(provider);
        this.routerToolDef = router_tool_def.map((def) => def[provider]);
        // this.model = new LLM({ model, apiKey: api });
        this.routerLLM = new LLM({ model, apiKey: api });
        this.searchLLM = new LLM({ model, apiKey: api });
        this.buildLLM = new LLM({ model, apiKey: api });
        this.plannerLLM = new LLM({ model, apiKey: api });
        this.LTMemory = new LLM({ model, apiKey: api });
    }

    async call_tool(res: any, messages: Message[], which: ("build" | "search")) {
        const memory: Message_memory[] = [
            { role: 'assistant', content: JSON.stringify(res.tool_calls) }
        ];
        messages.push(new AIMessage({ content: res.content, tool_calls: res.tool_calls }));
        // console.log("Tools called: ",JSON.stringify(res.tool_calls));
        for (const toolCall of res.tool_calls) {
            const tool_name = toolCall.name;
            const tool_arg = toolCall.args;
            const tool_id = toolCall.id;

            // console.log(tool_name);

            // console.log(chalk.greenBright.bold("\nRunning: ", tool_name, "\n"));
            const tool = await this.getToolFromName.get(tool_name);
            let toolResult;

            try {
                toolResult = await tool(tool_arg);
                // console.log(JSON.stringify(toolResult));
            } catch (err) {
                toolResult = `TOOL ERROR: ${(err as Error).message}`;
            }

            memory.push({ role: 'tool', content: toolResult });

            messages.push({
                role: "tool",
                name: tool_name,
                tool_call_id: tool_id,
                content: tool_name === "web_search" ? JSON.stringify(toolResult.results ?? toolResult.result ?? null) : String(toolResult)
            });
            // console.log("Content: ",JSON.stringify(toolResult.results ?? toolResult.result ?? null));
        }

        saveSTMemory(memory);

        messages.push(new AIMessage(`
            <UpdatedPreviousConversations>
                ${JSON.stringify(load_STMemory())}
            </UpdatedPreviousConversations>
        `))

        // console.log("Messages: ", JSON.stringify(messages, null, 2));
        let newRes: any;
        if (which === "build") newRes = await this.buildLLM.invoke(messages, { tools: this.toolDefinition, tool_choice: "auto" });
        else if (which === "search") newRes = await this.searchLLM.invoke(messages, { tools: this.toolDefinition, tool_choice: "auto" });
        // messages.push(new AIMessage({content : res.content , tool_calls: res.tool_calls}));
        return newRes;
    }

    async save_LTMemory(user_query: string) {
        const messages = [
            new SystemMessage(LT_PROMPT),
            new HumanMessage(user_query)
        ];

        const model_with_structured_output = this.LTMemory.withStructuredOutput(LTMESSAGETYPE)

        const res = await model_with_structured_output.invoke(messages);

        // console.log(JSON.stringify(res));

        if (res.found && res.preference.trim().length > 0) {
            saveLTMemory(res.preference);
        }
    }

    async *router(query: string): AsyncGenerator<string> {
        const PROMPT = ROUTER_PROMPT;
        const tools = new Map<string, any>([["search", this.search.bind(this)], ["build", this.build.bind(this)]]);
        let memory: Message_memory[] = [
            { role: 'user', content: query }
        ];

        try {
            await this.save_LTMemory(query);
        } catch (error) {
            console.log((error as Error).message);
            return 'Unable to proceed\n';
        }

        const messages: Message[] = [
            new SystemMessage(`
                <PreviousConverstations>
                    ${JSON.stringify(memory)}
                </PreviousConverstations>

                <Intructions>
                    ${PROMPT}
                </Intructions>
            `),
            new HumanMessage(query)
        ];
        // console.log(JSON.stringify(tool_def),"\n",JSON.stringify(messages));
        const spinner_think = ora({ spinner: 'circle', text: 'Thinking' }).start();
        let res = await this.routerLLM.invoke(messages, { tools: this.routerToolDef, tool_choice: "auto" });
        messages.push(new AIMessage(res));

        if (res.tool_calls && res.tool_calls.length > 0) {
            // console.log("Tool call: ",JSON.stringify(res.tool_calls));
            memory.push({ role: 'assistant', content: JSON.stringify(res.tool_calls) });
            const toolCall = res.tool_calls[0];

            const tool_name = toolCall.name;
            const tool_arg = toolCall.args;
            const tool_id = toolCall.id;

            // console.log("tool_name: " , tool_name , "\ntool_arg: ",JSON.stringify(tool_arg));

            const tool = tools.get(tool_name);
            let toolResult;
            const currentDate = new Date().toLocaleDateString('en-US', {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            })

            // console.log('Router Date: ', currentDate);

            try {
                spinner_think.stop();
                // console.log("here trycatch\n");
                saveSTMemory(memory);
                toolResult = await tool(tool_arg, currentDate);
                // console.log(JSON.stringify(toolResult));
            } catch (err) {
                spinner_think.stop();
                const error_msg = (err as Error).message;
                memory.push({ role: 'tool', content: `Error: ${error_msg}` });
                saveSTMemory(memory);
                console.log(`TOOL ERROR: ${error_msg}\n`);
                toolResult = `TOOL ERROR: ${error_msg}`;
            }

            // memory.push({ role: 'tool', content: String(toolResult) });
            messages.push({
                role: "tool",
                name: tool_name,
                tool_call_id: tool_id,
                content: String(toolResult)
            });

        } else {
            spinner_think.stop();
        }

        const spinner_generate = ora({ spinner: 'circle', text: 'Generating response' }).start();
        const stream = await this.routerLLM.stream(messages);
        let fullText = "";
        spinner_generate.stop();
        for await (const chunk of stream) {
            if (chunk.text) {
                yield chunk.text;
                // console.log(JSON.stringify(chunk, null, 2));
                fullText += chunk.text;
            }
        }
        // console.log(fullText);
        memory = [{ role: 'assistant', content: fullText }];
        saveSTMemory(memory);
    }

    async search(toolArgs: { query: string }, currentDate: string): Promise<string> {
        const routerNote = "CLI_OUTPUT_ONLY_NO_UNREQUESTED_FILE_CREATION";
        const ask = `${toolArgs.query}\n\n${routerNote}`;

        // memory
        const short_memory = load_STMemory();
        const long_memory = load_LTMemory();

        const memory: Message_memory[] = [
            { role: 'user', content: ask }
        ];

        console.log("search: ", currentDate);
        // console.log('Prompt: ', PROMPT);
        const messages: Message[] = [
            new SystemMessage(`
                <UserPreferences>
                    ${JSON.stringify(long_memory)}
                </UserPreferences>

                <PreviousConverstaions>
                    ${JSON.stringify(short_memory)}
                </PreviousConverstaions>

                <Instruction>
                    ${S_PROMPT}
                </Instruction>

                <CurrentDate>
                    ${currentDate}
                </CurrentDate>
            `),
            new HumanMessage(ask)
        ];

        // console.log(`\n${MessagesMappedToTools.get("search")} ${toolArgs.query}\n`);
        let res = await this.searchLLM.invoke(messages, { tools: this.toolDefinition, tool_choice: "auto" });
        if (res.tool_calls && res.tool_calls.length > 0) {
            res = await this.call_tool(res, messages, "search");
        } else {
            messages.push(new AIMessage(res.text));
        }

        saveSTMemory([
            ...memory,
            { role: 'assistant', content: res.text }
        ]);
        return res.text;
    }

    async build(toolArgs: { query: string }, currentDate: string): Promise<string> {
        // console.log("here inside build\n");
        const ask = toolArgs.query;
        // console.log(query);
        // console.log("\n",ask);

        const short_memory = load_STMemory();
        const long_memory = load_LTMemory();

        const memory: Message_memory[] = [
            { role: 'user', content: ask }
        ];

        const PROMPT = get_planner_prompt(currentDate);
        // console.log("\n",currentDate);
        const pre_messages: Message[] = [
            new SystemMessage(PROMPT),
            new HumanMessage(ask)
        ];
        let planner_res = await this.plannerLLM.invoke(pre_messages);

        const PLANNER_RES = planner_res.text;
        // console.log(PLANNER_RES,"\n");
        // console.log(PLANNER_RES);

        // messages.push(new AIMessage({content:planner_res.content}));

        const PROMPT_EXECUTOR = get_executer_prompt();

        const messages: Message[] = [
            new SystemMessage(`
                <UserPreferences>
                    ${long_memory}
                </UserPreferences>

                <PreviousConversations>
                    ${short_memory}
                </PreviousConversations>

                <Instructions>
                    ${PROMPT_EXECUTOR}
                </Instructions>
            `),
            new HumanMessage(`Execute this plan:\n\n${PLANNER_RES}\n\nOriginal user request: ${ask}`)
        ]

        console.log(`${MessagesMappedToTools.get("build")}: ${toolArgs.query}\n`);
        let res = await this.buildLLM.invoke(messages, { tools: this.toolDefinition, tool_choice: "auto" });

        // const MAX_TOOL_CALL_ITERATIONS = 5;
        // let iteration = 0;
        console.log("Debug: ", JSON.stringify(res));

        while (res.tool_calls && res.tool_calls.length > 0) { // && iteration < MAX_TOOL_CALL_ITERATIONS
            res = await this.call_tool(res, messages, "build");
            // iteration++;
        }

        // if (iteration >= MAX_TOOL_CALL_ITERATIONS) {
        //     // console.warn("Tool calling hit maximum iteration limit.");
        //     messages.push(new SystemMessage("You have run out of tool usage attempts. Provide the best final answer possible based on the current context."));
        //     res = await this.buildLLM.invoke(messages);
        // }

        messages.push(new AIMessage({ content: res.content, tool_calls: res.tool_calls }));

        memory.push({ role: 'assistant', content: res.text });
        saveSTMemory(memory);
        return res.text;
    }
}

export default LLMCore

