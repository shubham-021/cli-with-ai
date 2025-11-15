import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

export type Config = {
    provider:Providers,
    model:string,
    api:string
} | undefined;

export enum Providers{
    OpenAI="openai",
    Gemini="gemini",
    Claude="claude"
}

export enum OpenAIModels{
    GPT5 = "gpt-5",
    GPT4 = "gpt-4",
    GPT4oMini = "gpt-4o-mini",
    GPT4Turbo = "gpt-turbo"
}

export enum GeminiModels{
    Gemini15Pro = "gemini-1.5-pro",
    Gemini15Flash = "gemini-1.5-flash"
}

export enum ClaudeModels {
    Claude3Opus = "claude-3-opus",
    Claude3Sonnet = "claude-3-sonnet",
    Claude3Haiku = "claude-3-haiku"
}

export const ProviderModels : Record<Providers,string[]> = {
    [Providers.OpenAI] : Object.values(OpenAIModels),
    [Providers.Claude] : Object.values(ClaudeModels),
    [Providers.Gemini] : Object.values(GeminiModels),
}

export const ProviderMap: Record<Providers, any> = {
    [Providers.OpenAI]: ChatOpenAI,
    [Providers.Gemini]: ChatGoogleGenerativeAI,
    [Providers.Claude]: ChatAnthropic
};

export function getModelsForProvider(provider: Providers) : string[] {
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
  
  

