import { ToolMap, Providers } from "../types.js";

export const parsePDF: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
            name: "parse_pdf",
            description: "Parse and extract text from a PDF file.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "File path of the PDF" }
                },
                required: ["path"]
            }
        }
    },

    [Providers.Gemini]: {
        function_declarations: [
            {
                name: "parse_pdf",
                description: "Read the given path then parse and extract text from a PDF file.",
                parameters: {
                    type: "object",
                    properties: {
                        path: { type: "string" }
                    },
                    required: ["path"]
                }
            }
        ]
    },

    [Providers.Claude]: {
        name: "parse_pdf",
        description: "Parse and extract text from a PDF file.",
        input_schema: {
            type: "object",
            properties: {
                path: { type: "string" }
            },
            required: ["path"]
        }
    }
};
