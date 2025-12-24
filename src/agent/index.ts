import { ChatProvider, ChatMessage, Providers } from '../providers/index.js';
import { formatToolArgs, formatApprovalPrompt } from '../utils/format.js';
import { ToolRegistry } from '../tools/registry.js';
import { getSystemPrompt } from './system-prompt.js';
import { load_STMemory, load_LTMemory, saveSTMemory } from '../memory/memory.js';
import { AgentEvent, MessagesMappedToTools } from '../types.js';
import { getArgPreview } from '../utils/argPreview.js';
import { analyzeForMemory } from '../memory/analyzer.js';

const MAX_STEPS = 20;

export class Agent {
    private llm: ChatProvider;
    private toolRegistry: ToolRegistry;
    private provider: Providers;
    private apiKey: string;

    constructor(options: {
        llm: ChatProvider;
        toolRegistry: ToolRegistry;
        provider: Providers;
        apiKey: string;
    }) {
        this.llm = options.llm;
        this.toolRegistry = options.toolRegistry;
        this.provider = options.provider;
        this.apiKey = options.apiKey;
    }

    async *run(query: string): AsyncGenerator<AgentEvent> {
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

        analyzeForMemory(query, this.provider, this.apiKey);

        const tools = this.toolRegistry.getForProvider(this.provider);
        let stepCount = 0;

        while (true) {
            stepCount++;

            if (stepCount > MAX_STEPS) {
                let continueResolve: (approved: boolean) => void;
                const continuePromise = new Promise<boolean>((resolve) => {
                    continueResolve = resolve;
                });

                yield {
                    type: 'approval',
                    toolName: 'Continue Execution',
                    args: { reason: `Reached ${MAX_STEPS} steps`, action: 'Continue or Stop' },
                    resolve: continueResolve!
                };

                const shouldContinue = await continuePromise;
                if (!shouldContinue) {
                    yield { type: 'text', content: '\n[Stopped at user request]' };
                    return;
                }
                stepCount = 0;
            }

            const response = await this.llm.invoke(messages, {
                tools,
                tool_choice: 'auto'
            });

            if (!response.tool_calls || response.tool_calls.length === 0) {
                const stream = this.llm.stream(messages);
                let fullText = '';
                for await (const chunk of stream) {
                    if (chunk.text) {
                        yield { type: 'text', content: chunk.text };
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
                        let approvalResolve: (approved: boolean) => void;
                        const approvalPromise = new Promise<boolean>((resolve) => {
                            approvalResolve = resolve;
                        });

                        yield {
                            type: 'approval',
                            toolName: toolCall.name,
                            args: toolCall.args,
                            resolve: approvalResolve!
                        };

                        const approved = await approvalPromise;

                        if (!approved) {
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
                const argPreview = getArgPreview(toolCall.name, toolCall.args);
                yield { type: 'tool', name: toolCall.name, message: `${toolMessage}${argPreview}` };

                if (process.env.GLOO_DEBUG === 'true') {
                    yield {
                        type: 'debug',
                        level: 'info',
                        title: `Tool Call: ${toolCall.name}`,
                        message: `Arguments: ${JSON.stringify(toolCall.args, null, 2)}`
                    };
                }

                let result: string;
                try {
                    result = await this.toolRegistry.execute(
                        toolCall.name,
                        toolCall.args,
                        { cwd: process.cwd() }
                    );

                    if (process.env.GLOO_DEBUG === 'true') {
                        const maxLen = 500;
                        const truncated = result.length > maxLen
                            ? result.slice(0, maxLen) + `\n... [truncated ${result.length - maxLen} chars]`
                            : result;
                        yield {
                            type: 'debug',
                            level: 'info',
                            title: `Tool Result: ${toolCall.name}`,
                            message: `Output (${result.length} chars)`,
                            details: truncated
                        };
                    }
                } catch (error) {
                    if (process.env.GLOO_DEBUG === 'true') {
                        yield {
                            type: 'debug',
                            level: 'error',
                            title: `Tool Error: ${toolCall.name}`,
                            message: (error as Error).message,
                            details: (error as Error).stack?.split('\n').slice(0, 3).join('\n')
                        };
                    }
                    result = `Error: ${(error as Error).message}`;
                }
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.name,
                    content: toolCall.name === 'web_search'
                        ? (typeof result === 'string' ? result : JSON.stringify(result))
                        : result
                });
            }
        }
    }
}