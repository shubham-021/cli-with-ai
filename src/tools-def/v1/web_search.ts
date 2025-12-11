import { ToolMap,Providers } from "../../types.js";

export const webSearch: ToolMap = {
    [Providers.OpenAI]: {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" }
          },
          required: ["query"]
        }
      }
    },
  
    [Providers.Gemini]: {
      function_declarations: [
        {
          name: "web_search",
          description: "Search the web.",
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
      name: "web_search",
      description: "Search the web.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string" }
        },
        required: ["query"]
      }
    }
};
  