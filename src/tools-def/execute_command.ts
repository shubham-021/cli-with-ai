import { Providers, ToolMap } from "../types.js";

export const executeCommand: ToolMap = {
    [Providers.OpenAI] : {
        type: "function",
        function: {
            name: "execute_command",
            description: "Execute shell commands like npm install, npm run dev, git commands, etc. Use this after creating project files to install dependencies or run scripts.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "The shell command to execute (e.g., 'npm install', 'npm run dev')"
                    },
                    cwd: {
                        type: "string",
                        description: "Working directory (relative path). Optional, defaults to current directory."
                    }
                },
                required: ["command"]
            }
        }
    },
    [Providers.Claude] : {
        name: "execute_command",
        description: "Execute shell commands like npm install, npm run dev, git commands, etc.",
        input_schema: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "The shell command to execute"
                },
                cwd: {
                    type: "string",
                    description: "Working directory (relative path)"
                }
            },
            required: ["command"]
        }
    },
    [Providers.Gemini] : {
        function_declarations: [{
            name: "execute_command",
            description: "Execute shell commands like npm install, npm run dev, git commands, etc.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "The shell command to execute"
                    },
                    cwd: {
                        type: "string",
                        description: "Working directory (relative path)"
                    }
                },
                required: ["command"]
            }
        }]  
    }
};
