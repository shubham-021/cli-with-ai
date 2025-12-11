import { ChatProvider, ChatMessage, ChatResponse, InvokeOptions, ToolCall } from './chat-provider.js';

export class OpenAIProvider implements ChatProvider {
    private apiKey: string;
    private model: string;
    private baseUrl = 'https://api.openai.com/v1';

    constructor(options: { model: string; apiKey: string }) {
        this.model = options.model;
        this.apiKey = options.apiKey;
    }

    async invoke(messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse> {
        const body: any = {
            model: this.model,
            messages: messages.map(m => ({
                role: m.role,
                content: m.content,
                ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
                ...(m.name && { name: m.name })
            }))
        };

        if (options?.tools?.length) {
            body.tools = options.tools;
            body.tool_choice = options.tool_choice ?? 'auto';
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const message = choice.message;

        const tool_calls: ToolCall[] | undefined = message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
        }));

        return {
            content: message.content ?? '',
            tool_calls
        };
    }

    async *stream(messages: ChatMessage[]): AsyncGenerator<{ text?: string }> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
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
                    const data = line.slice(6);
                    if (data === '[DONE]') return;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) yield { text: content };
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }
}