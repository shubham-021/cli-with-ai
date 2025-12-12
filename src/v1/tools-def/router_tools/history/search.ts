import { ToolMap, Providers } from "../../../../types.js";

export const search: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
            name: "search",
            description: "Handle informational or research-type queries.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "User search or informational query" }
                },
                required: ["query"]
            }
        }
    },

    [Providers.Gemini]: {
        function_declarations: [
            {
                name: "search",
                description: "Handle informational or research-type queries.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                }
            }
        ]
    },

    [Providers.Claude]: {
        name: "search",
        description: "Handle informational or research-type queries.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string" }
            },
            required: ["query"]
        }
    }
};
