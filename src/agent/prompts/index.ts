import { AgentMode } from '../../types.js';
import { getAwarenessPrompt } from './awareness.js';
import { CHAT_PROMPT } from './chat.js';
import { PLAN_PROMPT } from './plan.js';
import { BUILD_PROMPT } from './build.js';

const MODE_PROMPTS: Record<AgentMode, string> = {
    [AgentMode.CHAT]: CHAT_PROMPT,
    [AgentMode.PLAN]: PLAN_PROMPT,
    [AgentMode.BUILD]: BUILD_PROMPT
};

interface PromptContext {
    cwd: string;
    date: string;
    shortTermMemory: any[];
    longTermMemory: any[];
    mode: AgentMode;
}

export function getSystemPrompt(ctx: PromptContext): string {
    const awareness = getAwarenessPrompt({
        cwd: ctx.cwd,
        date: ctx.date,
        shortTermMemory: ctx.shortTermMemory,
        longTermMemory: ctx.longTermMemory
    });

    const modePrompt = MODE_PROMPTS[ctx.mode];

    return `${awareness}\n\n${modePrompt}`;
}