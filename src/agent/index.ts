import { ChatProvider, ChatMessage, Providers } from '../providers/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { getSystemPrompt } from './system-prompt.js';
import { load_STMemory, load_LTMemory, saveSTMemory } from '../memory/memory.js';
import { getListPrompt_In } from '../inquirer.js';

const MAX_STEPS = 20;

export class ReActAgent {
    private llm: ChatProvider;
    private toolRegistry: ToolRegistry;
    private provider: Providers;

    constructor(options: {
        llm: ChatProvider;
        toolRegistry: ToolRegistry;
        provider: Providers;
    }) {
        this.llm = options.llm;
        this.toolRegistry = options.toolRegistry;
        this.provider = options.provider;
    }

    async *run(query: string): AsyncGenerator<string> {
        const systemPrompt = getSystemPrompt({
            cwd: process.cwd(),
            date: new Date().toLocaleDateString(),
            shortTermMemory: load_STMemory(),
            longTermMemory: load_LTMemory()
        });

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ];

        const tools = this.toolRegistry.getForProvider(this.provider);
        let stepCount = 0;
        while (stepCount < MAX_STEPS) {
            stepCount++;
            const response = await this.llm.invoke(messages, {
                tools,
                tool_choice: 'auto'
            });
            if (!response.tool_calls || response.tool_calls.length === 0) {
                const stream = await this.llm.stream(messages);
                let fullText = '';
                for await (const chunk of stream) {
                    if (chunk.text) {
                        yield chunk.text;
                        fullText += chunk.text;
                    }
                }

                saveSTMemory([
                    { role: 'user', content: query },
                    { role: 'assistant', content: fullText }
                ]);
                return;
            }

            messages.push({ role: 'assistant', content: response.content || '' });
            for (const toolCall of response.tool_calls) {
                const tool = this.toolRegistry.get(toolCall.name);

                if (tool?.needsApproval) {
                    const shouldApprove = typeof tool.needsApproval === 'function'
                        ? tool.needsApproval(toolCall.args)
                        : tool.needsApproval;

                    if (shouldApprove) {
                        const choice = await getListPrompt_In(
                            ['Approve', 'Deny'],
                            `Tool "${toolCall.name}" wants to: ${JSON.stringify(toolCall.args)}`
                        );
                        if (choice === 'Deny') {
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                name: toolCall.name,
                                content: 'User denied this action.'
                            });
                            continue;
                        }
                    }
                }

                let result: string;
                try {
                    result = await this.toolRegistry.execute(
                        toolCall.name,
                        toolCall.args,
                        { cwd: process.cwd() }
                    );
                } catch (error) {
                    result = `Error: ${(error as Error).message}`;
                }
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.name,
                    content: result
                });
            }
        }
        yield '\n[Stopped after maximum steps reached]';
    }
}