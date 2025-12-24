import { AgentMode } from '../types.js';
import { ToolRegistry } from '../tools/registry.js';
import { makeWebSearchTool, readFileTool, parseCodeTool, searchInFilesTool } from '../tools/definitions.js';
import { allTools } from '../tools/all.js';
import { Providers } from '../providers/index.js';

export function getToolsForMode(
    mode: AgentMode,
    provider: Providers,
    searchApi: string
): ToolRegistry {
    const registry = new ToolRegistry();

    switch (mode) {
        case AgentMode.CHAT:
            registry.register(makeWebSearchTool(searchApi));
            break;

        case AgentMode.PLAN:
            registry.register(makeWebSearchTool(searchApi));
            registry.register(readFileTool);
            registry.register(parseCodeTool);
            registry.register(searchInFilesTool);
            break;

        case AgentMode.BUILD:
            registry.registerAll(allTools(searchApi));
            break;
    }

    return registry;
}