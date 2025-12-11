import { ChatProvider, ChatMessage, Providers } from '../providers/index.js';
import { formatToolArgs, formatApprovalPrompt } from '../utils/format.js';
import { ToolRegistry } from '../tools/registry.js';
import { getSystemPrompt } from './system-prompt.js';
import { load_STMemory, load_LTMemory, saveSTMemory } from '../memory/memory.js';
import { getListPrompt_In } from '../inquirer.js';
import ora from 'ora';
import chalk from 'chalk';
import { MessagesMappedToTools } from '../types.js';


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

        while (true) {
            stepCount++;

            if (stepCount > MAX_STEPS) {
                const choice = await getListPrompt_In(
                    ['Continue', 'Stop'],
                    `Reached ${MAX_STEPS} steps. Continue?`
                );
                if (choice === 'Stop') {
                    yield '\n[Stopped at user request]';
                    return;
                }
                stepCount = 0;
            }

            const spinner = ora({ text: 'Thinking...', spinner: 'dots8Bit' }).start();
            const response = await this.llm.invoke(messages, {
                tools,
                tool_choice: 'auto'
            });
            spinner.stop();

            if (!response.tool_calls || response.tool_calls.length === 0) {
                const stream = this.llm.stream(messages);
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

            messages.push({
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls?.map(tc => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.name,
                        arguments: JSON.stringify(tc.args)
                    }
                }))
            } as any);

            for (const toolCall of response.tool_calls) {
                const tool = this.toolRegistry.get(toolCall.name);

                if (tool?.needsApproval) {
                    const shouldApprove = typeof tool.needsApproval === 'function'
                        ? tool.needsApproval(toolCall.args)
                        : tool.needsApproval;

                    if (shouldApprove) {
                        console.log(formatApprovalPrompt(toolCall.name, toolCall.args));

                        const choice = await getListPrompt_In(
                            ['Approve', 'Deny'],
                            'Allow this action?'
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

                const toolMessage = MessagesMappedToTools.get(toolCall.name) ?? 'Executing';
                const formattedArgs = formatToolArgs(toolCall.name, toolCall.args);
                const toolSpinner = ora({
                    text: chalk.yellow(`${toolMessage}`) + formattedArgs,
                    spinner: 'dots8Bit'
                }).start();

                let result: string;
                try {
                    result = await this.toolRegistry.execute(
                        toolCall.name,
                        toolCall.args,
                        { cwd: process.cwd() }
                    );
                    toolSpinner.succeed(chalk.green(`Done: ${toolCall.name}`));
                } catch (error) {
                    result = `Error: ${(error as Error).message}`;
                    toolSpinner.fail(chalk.red(`Failed: ${toolCall.name}`));
                }
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.name,
                    content: result
                });
            }
        }
    }
}