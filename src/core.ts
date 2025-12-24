import { createProvider, Providers } from './providers/index.js';
import { Agent } from './agent/index.js';
import { ToolRegistry } from './tools/registry.js';
import { allTools } from './tools/all.js';
import { AgentEvent } from './types.js';


class LLMCore {
    private agent: Agent;

    constructor(
        provider: Providers,
        model: string,
        api: string,
        searchApi: string
    ) {
        const llm = createProvider(provider, model, api);

        const toolRegistry = new ToolRegistry();
        toolRegistry.registerAll(allTools(searchApi));

        this.agent = new Agent({ llm, toolRegistry, provider, apiKey: api });
    }

    async *chat(query: string): AsyncGenerator<AgentEvent> {
        yield* this.agent.run(query);
    }
}
export default LLMCore;