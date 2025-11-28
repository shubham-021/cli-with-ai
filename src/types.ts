import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage } from "langchain";
import z from "zod"

export const DEC_PROMPT_RESPONSE = z.object({
    build: z.boolean().describe("Whether the query is about building something or not")
})

export type ToolsTypes = Array<OpenAITool | ClaudeTool | GeminiTool>;

export type ChatModels = ChatOpenAI | ChatGoogleGenerativeAI | ChatAnthropic;

export type Message = SystemMessage | HumanMessage | AIMessage | { role: string, content: string, tool_call_id?: string, name: string }

export type Config = {
    provider: Providers,
    model: string,
    api: string,
    search_api: string
} | undefined;

export enum Providers {
    OpenAI = "openai",
    Gemini = "gemini",
    Claude = "claude"
}

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

export const ProviderMap: Record<Providers, any> = {
    [Providers.OpenAI]: ChatOpenAI,
    [Providers.Gemini]: ChatGoogleGenerativeAI,
    [Providers.Claude]: ChatAnthropic
};

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
    ["web_search", "Searching the web for"],
    ["append_file", "Writing in the file"],
    ["create_file", "Creating the file"],
    ["current_loc", "Looking for the current location"],
    ["make_dir", "Making directory on the path"],
    ["write_file", "Re writing the file"],
    ["execute_command", "Trying to execute this command"],
    ["parse_pdf", "Parsing the pdf"],
    ["read_file", "Reading the file"],
    ["copy_file", "Making a copy of the file"],
    ["delete_file_dir", "Deleting"],
    ["move_file", "Moving the file"],
    ["http_request", "Making a http request to"],
    ["search_in_files", "Searching in the file"],
    ["search", "A simple web search will do for this query"],
    ["build", "Preparing to build for user request"]
]);
