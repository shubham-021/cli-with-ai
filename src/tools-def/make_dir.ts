import { ToolMap,Providers } from "../types.js";

export const currLoc: ToolMap = {
    [Providers.OpenAI]: {
        type: "function",
        function: {
            name: "make_dir",
            description: "Create a directory. Relative paths resolve from current working directory.",
            parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Directory path to create" }
            },
            required: ["path"]
            }
        }
    },
  
    [Providers.Gemini]: {
        function_declarations: [{
            name: "make_dir",
            description: "Create a directory. Relative paths resolve from current working directory.",
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
        name: "make_dir",
        description: "Create a directory. Relative paths resolve from current working directory.",
        input_schema: {
            type: "object",
            properties: {
            path: { type: "string" }
            },
            required: ["path"]
        }
    }
};
  