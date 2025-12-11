import { ChatProvider, ChatMessage, ChatResponse, InvokeOptions, ToolCall } from './chat-provider.js';

export class GeminiProvider implements ChatProvider {
    private apiKey: string;
    private model: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(options: { model: string; apiKey: string }) {
        this.model = options.model;
        this.apiKey = options.apiKey;
    }

    private buildContents(messages: ChatMessage[]): any[] {
        const contents: any[] = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'Understood.' }]
                });
            } else if (msg.role === 'user') {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.role === 'assistant') {
                contents.push({
                    role: 'model',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.role === 'tool') {
                contents.push({
                    role: 'user',
                    parts: [{
                        functionResponse: {
                            name: msg.name,
                            response: { result: msg.content }
                        }
                    }]
                });
            }
        }

        return contents;
    }

    async invoke(messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse> {
        const body: any = {
            contents: this.buildContents(messages)
        };

        if (options?.tools?.length) {
            body.tools = [{
                functionDeclarations: options.tools.map(t => ({
                    name: t.function?.name ?? t.name,
                    description: t.function?.description ?? t.description,
                    parameters: t.function?.parameters ?? t.input_schema ?? t.parameters
                }))
            }];
        }

        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];

        let content = '';
        const tool_calls: ToolCall[] = [];

        for (const part of parts) {
            if (part.text) {
                content += part.text;
            } else if (part.functionCall) {
                tool_calls.push({
                    id: `call_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    name: part.functionCall.name,
                    args: part.functionCall.args ?? {}
                });
            }
        }

        return {
            content,
            tool_calls: tool_calls.length > 0 ? tool_calls : undefined
        };
    }

    async *stream(messages: ChatMessage[]): AsyncGenerator<{ text?: string }> {
        const body = {
            contents: this.buildContents(messages)
        };

        const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
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
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) yield { text };
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }
}