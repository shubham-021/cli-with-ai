import { ToolMap, Providers } from "../../types.js";

export const build: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
            name: "build",
            description: "Handle queries that require system-related or file-related operations.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "User query requiring system operations" }
                },
                required: ["query"]
            }
        }
    },

    [Providers.Gemini]: {
        function_declarations: [
            {
                name: "build",
                description: "Handle queries that require system-related or file-related operations.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string"}
                    },
                    required: ["query"]
                }
            }
        ]
    },

    [Providers.Claude]: {
        name: "build",
        description: "Handle queries that require system-related or file-related operations.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string" }
            },
            required: ["query"]
        }
    }
};
