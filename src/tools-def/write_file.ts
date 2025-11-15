import { ToolMap,Providers } from "../types.js";

export const currLoc: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
            name: "write_file",
            description: "Write content to a file. Overwrites existing content.",
            parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "File path to write to" },
                content: { type: "string", description: "Content to write" }
            },
            required: ["path", "content"]
            }
        }
    },
  
    [Providers.Gemini]: {
        function_declarations: [{
            name: "write_file",
            description: "Write content to a file. Overwrites existing content.",
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
        name: "write_file",
        description: "Write content to a file. Overwrites existing content.",
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
  