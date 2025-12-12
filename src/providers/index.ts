import { ChatProvider } from './chat-provider.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';

export enum Providers {
    OpenAI = 'openai',
    Gemini = 'gemini',
    Claude = 'claude'
}

export function createProvider(provider: Providers, model: string, apiKey: string): ChatProvider {
    switch (provider) {
        case Providers.OpenAI:
            return new OpenAIProvider({ model, apiKey });
        case Providers.Claude:
            return new AnthropicProvider({ model, apiKey });
        case Providers.Gemini:
            return new GeminiProvider({ model, apiKey });
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

export { ChatProvider, ChatMessage, ChatResponse, ToolCall, InvokeOptions } from './chat-provider.js';