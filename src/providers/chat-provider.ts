export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    name?: string;
}

export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, any>;
}

export interface ChatResponse {
    content: string;
    tool_calls?: ToolCall[];
}

export interface InvokeOptions {
    tools?: any[];
    tool_choice?: 'auto' | 'none' | 'required';
}

export interface ChatProvider {
    invoke(messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse>;
    stream(messages: ChatMessage[]): AsyncGenerator<{ text?: string }>;
}