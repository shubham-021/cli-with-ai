import { saveLTMemory } from './memory.js';
import { Providers } from '../providers/index.js';

const MEMORY_EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the user's message and determine if it contains any personal information, preferences, or facts about the user that should be remembered for future conversations.

Examples of things to remember:
- "My name is John" → "User's name is John"
- "I prefer using pnpm" → "User prefers pnpm as package manager"
- "I work at Google" → "User works at Google"
- "I like dark themes" → "User prefers dark themes"
- "Remember that I use React for most projects" → "User primarily uses React"

Examples of things NOT to remember:
- "How do I create a React app?" → Nothing to remember
- "What's the weather?" → Nothing to remember
- "Fix this bug" → Nothing to remember

Respond with JSON: {"found": boolean, "preference": "string or empty"}`;

interface MemoryExtractionResult {
    found: boolean;
    preference: string;
}

const CHEAP_MODELS: Record<Providers, string> = {
    [Providers.OpenAI]: 'gpt-4o-mini',
    [Providers.Claude]: 'claude-3-haiku-20240307',
    [Providers.Gemini]: 'gemini-1.5-flash'
};

export async function analyzeForMemory(
    userMessage: string,
    provider: Providers,
    apiKey: string
): Promise<void> {
    try {
        const result = await callProvider(userMessage, provider, apiKey);

        if (result?.found && result?.preference?.trim()) {
            saveLTMemory(result.preference.trim());

            // if (process.env.GLOO_DEBUG === 'true') {
            //     console.log('Saved to memory:', result.preference);
            // }
        }
    } catch (error) {
        // if (process.env.GLOO_DEBUG === 'true') {
        //     console.error('Memory analyzer error:', error);
        // }
    }
}

async function callProvider(
    userMessage: string,
    provider: Providers,
    apiKey: string
): Promise<MemoryExtractionResult | null> {
    switch (provider) {
        case Providers.OpenAI:
            return callOpenAI(userMessage, apiKey);
        case Providers.Claude:
            return callClaude(userMessage, apiKey);
        case Providers.Gemini:
            return callGemini(userMessage, apiKey);
        default:
            return null;
    }
}

async function callOpenAI(message: string, apiKey: string): Promise<MemoryExtractionResult | null> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: CHEAP_MODELS[Providers.OpenAI],
            messages: [
                { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
                { role: 'user', content: message }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 150
        })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
}

async function callClaude(message: string, apiKey: string): Promise<MemoryExtractionResult | null> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: CHEAP_MODELS[Providers.Claude],
            max_tokens: 150,
            system: MEMORY_EXTRACTION_PROMPT,
            messages: [{ role: 'user', content: message }]
        })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}

async function callGemini(message: string, apiKey: string): Promise<MemoryExtractionResult | null> {
    const model = CHEAP_MODELS[Providers.Gemini];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${MEMORY_EXTRACTION_PROMPT}\n\nUser message: ${message}` }]
            }],
            generationConfig: {
                maxOutputTokens: 150,
                responseMimeType: 'application/json'
            }
        })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return content ? JSON.parse(content) : null;
}