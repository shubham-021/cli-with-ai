import { ChatProvider, ChatMessage, Providers } from './providers/index.js';
import z from "zod"

export const DEC_PROMPT_RESPONSE = z.object({
    build: z.boolean().describe("Whether the query is about building something or not")
})

export const LTMESSAGETYPE = z.object({
    found: z.boolean().describe('Did user describe any type of preference in their query?'),
    preference: z.string().describe('User preference extracted from this query. Use empty string if no preference found.')
});

export type Message_memory = { role: 'user' | 'assistant' | 'tool', content: string };

export type ToolsTypes = Array<OpenAITool | ClaudeTool | GeminiTool>;

export type ChatModels = ChatProvider;

export type Message = ChatMessage;

export type Config = {
    provider: Providers,
    model: string,
    api: string,
    search_api: string
} | undefined;


export enum OpenAIModels {
    GPT5 = "gpt-5",
    GPT4 = "gpt-4",
    GPT4oMini = "gpt-4o-mini",
    GPT4Turbo = "gpt-turbo"
}

export enum GeminiModels {
    Gemini15Pro = "gemini-1.5-pro",
    Gemini15Flash = "gemini-1.5-flash",
    Gemini25Pro = "gemini-2.5-pro",
    Gemini25Flash = "gemini-2.5-flash"
}

export enum ClaudeModels {
    Claude3Opus = "claude-3-opus",
    Claude3Sonnet = "claude-3-sonnet",
    Claude3Haiku = "claude-3-haiku"
}

export const ProviderModels: Record<Providers, string[]> = {
    [Providers.OpenAI]: Object.values(OpenAIModels),
    [Providers.Claude]: Object.values(ClaudeModels),
    [Providers.Gemini]: Object.values(GeminiModels),
}

export function getModelsForProvider(provider: Providers): string[] {
    return ProviderModels[provider];
}

export interface OpenAITool {
    type: "function",
    function: {
        name: string,
        description: string,
        parameters: {
            type: "object",
            properties: Record<string, any>,
            required: string[]
        }
    }
};

export interface GeminiTool {
    function_declarations: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, any>;
            required: string[];
        };
    }[];
}

export interface ClaudeTool {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: Record<string, any>;
        required: string[];
    };
}

export interface ToolMap {
    [Providers.OpenAI]: OpenAITool;
    [Providers.Gemini]: GeminiTool;
    [Providers.Claude]: ClaudeTool;
}

export const MessagesMappedToTools = new Map<string, string>([
    ["web_search", "Searching the web"],
    ["append_file", "Updating file"],
    ["create_file", "Creating file"],
    ["current_loc", "Looking for the current location"],
    ["make_dir", "Making directory"],
    ["write_file", "Updating file"],
    ["execute_command", "Executing"],
    ["parse_pdf", "Parsing pdf"],
    ["read_file", "Reading file"],
    ["copy_file", "Copy file"],
    ["delete_file_dir", "Delete"],
    ["move_file", "Move"],
    ["http_request", "Making a http request"],
    ["search_in_files", "Analyze"],
]);

export type AgentEvent =
    | { type: 'text'; content: string }
    | { type: 'tool'; name: string; message: string };
