import { get_def } from "../function-temp/temp_fn.js";

const build = get_def({
    name: "build",
    description: "Handle queries that require system-related or file-related operations.",
    properties: {
        openai:{
            query: { type: "string", description: "User query requiring system operations" }
        },
        gemini:{
            query: { type: "string"}
        },
        claude:{
            query: { type: "string" }
        }
    },
    required: ["query"]
})

const search = get_def({
    name: "search",
    description: "Handle informational or research-type queries.",
    properties: {
        openai:{
            query: { type: "string", description: "User search or informational query" }
        },
        gemini:{
            query: { type: "string" }
        },
        claude:{
            query: { type: "string" }
        }
    },
    required: ["query"]
})

export const router_tool_def = [search,build];
