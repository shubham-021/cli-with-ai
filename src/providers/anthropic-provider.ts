import { ChatProvider, ChatMessage, ChatResponse, InvokeOptions, ToolCall } from './chat-provider.js';

export class AnthropicProvider implements ChatProvider {
    private apiKey: string;
    private model: string;
    private baseUrl = 'https://api.anthropic.com/v1';

    constructor(options: { model: string; apiKey: string }) {
        this.model = options.model;
        this.apiKey = options.apiKey;
    }

    async invoke(messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse> {
        const systemMessage = messages.find(m => m.role === 'system');
        const nonSystemMessages = messages.filter(m => m.role !== 'system');

        const body: any = {
            model: this.model,
            max_tokens: 4096,
            messages: nonSystemMessages.map(m => {
                if (m.role === 'tool') {
                    return {
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: m.tool_call_id,
                            content: m.content
                        }]
                    };
                }
                return { role: m.role, content: m.content };
            })
        };

        if (systemMessage) {
            body.system = systemMessage.content;
        }

        if (options?.tools?.length) {
            body.tools = options.tools;
            if (options.tool_choice === 'auto') {
                body.tool_choice = { type: 'auto' };
            }
        }

        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        let content = '';
        const tool_calls: ToolCall[] = [];

        for (const block of data.content) {
            if (block.type === 'text') {
                content += block.text;
            } else if (block.type === 'tool_use') {
                tool_calls.push({
                    id: block.id,
                    name: block.name,
                    args: block.input
                });
            }
        }

        return {
            content,
            tool_calls: tool_calls.length > 0 ? tool_calls : undefined
        };
    }

    async *stream(messages: ChatMessage[]): AsyncGenerator<{ text?: string }> {
        const systemMessage = messages.find(m => m.role === 'system');
        const nonSystemMessages = messages.filter(m => m.role !== 'system');

        const body: any = {
            model: this.model,
            max_tokens: 4096,
            stream: true,
            messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content }))
        };

        if (systemMessage) {
            body.system = systemMessage.content;
        }

        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'content_block_delta' && data.delta?.text) {
                            yield { text: data.delta.text };
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }
}