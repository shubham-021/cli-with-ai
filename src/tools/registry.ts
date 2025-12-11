import { ToolDefinition, ToolSet, ToolContext } from './types.js';
import { Providers } from '../providers/index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
            const fullSchema = zodToJsonSchema(tool.inputSchema as any);

            const jsonSchema = {
                type: 'object',
                properties: (fullSchema as any).properties ?? {},
                required: (fullSchema as any).required ?? []
            };

            switch (provider) {
                case Providers.OpenAI:
                    return {
                        type: 'function',
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: jsonSchema
                        }
                    };
                case Providers.Gemini:
                    return {
                        function_declarations: [{
                            name: tool.name,
                            description: tool.description,
                            parameters: jsonSchema
                        }]
                    };
                case Providers.Claude:
                    return {
                        name: tool.name,
                        description: tool.description,
                        input_schema: jsonSchema
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