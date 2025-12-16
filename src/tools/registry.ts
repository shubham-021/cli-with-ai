import { ToolDefinition, ToolSet, ToolContext } from './types.js';
import { Providers } from '../providers/index.js';
import { zodToOpenAI, zodToGemini, zodToClaude } from './schema-converters.js';

export class ToolRegistry {
    private tools: ToolSet = {};

    register(tool: ToolDefinition): void {
        this.tools[tool.name] = tool;
    }

    registerAll(tools: ToolDefinition[]): void {
        tools.forEach(t => this.register(t));
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools[name];
    }

    getForProvider(provider: Providers): any[] {
        return Object.values(this.tools).map(tool => {
            // Debug: Log raw zod schema
            // if (process.env.GLOO_DEBUG === 'true' && tool.name === 'web_search') {
            //     console.log('\n\nRAW ZOD SCHEMA for web_search:');
            //     console.log(JSON.stringify(jsonSchema, null, 2));
            // }

            switch (provider) {
                case Providers.OpenAI:
                    return {
                        type: 'function',
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: zodToOpenAI(tool.inputSchema)
                        }
                    };
                case Providers.Gemini:
                    return {
                        name: tool.name,
                        description: tool.description,
                        parameters: zodToGemini(tool.inputSchema)
                    };
                case Providers.Claude:
                    return {
                        name: tool.name,
                        description: tool.description,
                        input_schema: zodToClaude(tool.inputSchema)
                    };
            }
        });
    }

    async execute(
        name: string,
        args: Record<string, any>,
        context: ToolContext
    ): Promise<string> {
        const tool = this.tools[name];
        if (!tool) throw new Error(`Unknown tool: ${name}`);

        const parsed = tool.inputSchema.safeParse(args);
        if (!parsed.success) {
            throw new Error(`Invalid input for ${name}: ${parsed.error.message}`);
        }

        const result = await tool.execute(parsed.data, context);
        return typeof result === 'string' ? result : JSON.stringify(result);
    }
}