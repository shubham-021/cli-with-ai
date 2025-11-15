import { ToolMap,Providers } from "../types.js";

export const currLoc: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
            name: "append_file",
            description: "Append content to a file.",
            parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "File path to append to" },
                content: { type: "string", description: "Content to append" }
            },
            required: ["path", "content"]
            }
        }
    },
  
    [Providers.Gemini]: {
        function_declarations: [{
            name: "append_file",
            description: "Append content to a file.",
            parameters: {
            type: "object",
            properties: {
                path: { type: "string" },
                content: { type: "string" }
            },
            required: ["path", "content"]
            }
        }]
    },
  
    [Providers.Claude]: {
        name: "append_file",
        description: "Append content to a file.",
        input_schema: {
            type: "object",
            properties: {
            path: { type: "string" },
            content: { type: "string" }
            },
            required: ["path", "content"]
        }
    }
};
  