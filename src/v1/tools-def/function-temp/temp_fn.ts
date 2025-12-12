import { ToolMap, Providers } from "../../../types.js";

interface properties {
    openai: any,
    gemini: any,
    claude: any
}

interface props {
    name: string,
    description: string,
    properties: properties,
    required: string[]
}

export function get_def({ name, description, properties, required }: props): ToolMap {
    return {
        [Providers.OpenAI]: {
            type: "function",
            function: {
                name,
                description,
                parameters: {
                    type: "object",
                    properties: properties.openai,
                    required
                }
            }
        },

        [Providers.Gemini]: {
            function_declarations: [{
                name,
                description,
                parameters: {
                    type: "object",
                    properties: properties.gemini,
                    required
                }
            }]
        },

        [Providers.Claude]: {
            name,
            description,
            input_schema: {
                type: "object",
                properties: properties.claude,
                required
            }
        }
    };
}
