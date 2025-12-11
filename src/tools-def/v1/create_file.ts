import { ToolMap,Providers } from "../../types.js";

export const createFile: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
            name: "create_file",
            description: "Create an empty file. Parent directories will be created if missing.",
            parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "File path to create" }
            },
            required: ["path"]
            }
        }
    },
  
    [Providers.Gemini]: {
        function_declarations: [{
            name: "create_file",
            description: "Create an empty file. Parent directories will be created if missing.",
            parameters: {
            type: "object",
            properties: {
                path: { type: "string" }
            },
            required: ["path"]
            }
        }]
    },
  
    [Providers.Claude]: {
        name: "create_file",
        description: "Create an empty file. Parent directories will be created if missing.",
        input_schema: {
            type: "object",
            properties: {
                path: { type: "string" }
            },
            required: ["path"]
        }
    }
};
  