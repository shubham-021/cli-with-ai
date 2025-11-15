import { ToolMap,Providers } from "../types.js";

export const currLoc: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
          name: "current_loc",
          description: "Get the user's current working directory.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
    },
  
    [Providers.Gemini]: {
        function_declarations: [
            {
                name: "current_loc",
                description: "Get the user's current working directory.",
                parameters: {
                type: "object",
                properties: {},
                required: []
                }
            }
        ]
    },
  
    [Providers.Claude]: {
        name: "current_loc",
        description: "Get the user's current working directory.",
        input_schema: {
            type: "object",
            properties: {},
            required: []
        }
    }
};
  