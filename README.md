# Arka CLI

Arka is a terminal-first AI assistant that lets you route prompts to OpenAI, Anthropic, or Google Gemini models, execute planning workflows, and augment responses with Tavily-powered search results. It stores multiple credentialed configurations locally so you can swap providers or models on demand without re-entering keys.

## Features
- Provider-agnostic setup with curated OpenAI, Claude, and Gemini model menus.
- Local key management via `conf`, including separate LLM and Tavily search API keys.
- Automated detection of simple chats vs. build-style requests that trigger a planner/executor loop.
- LangChain-powered tool calling with a shared tool registry, including web search.
- Persistent memory summaries so answers stay grounded in prior conversations.
- Commander-based CLI with interactive flows powered by Inquirer and informative Chalk/ORA UI.

## Installation
```bash
npm install -g @arka07/clai
```
The binary is exposed as `arka`. Ensure you have Node.js 18+ and a Tavily account alongside your chosen LLM provider.

## Quick Start
1. `arka configure -n <config_name>` to pick a provider and model (stored as default).
2. `arka -n <config_name> set-api --api <llm_api_key>` to save the LLM key.
3. `arka -n <config_name> set-api --search <tavily_api_key>` to enable tool calls.
4. `arka ask "Who won the recent FIFA World Cup ?"`

The spinner shows progress while the agent streams through LangChain; final answers render once tool executions finish.

## CLI Commands
- `arka configure (-n <name>)`: Create or update a config. Without `-m` or `-p`, launches provider+model selection and seeds empty API fields. With `-m`, only the model picker runs for that config; with `-p`, you can reselect provider and model together.
- `arka set-api -n <name> (--api|--search <key>)`: Persist the model or Tavily key for the named config. Requires an existing configuration.
- `arka delete-config -n <name>`: Remove a configuration (and its stored keys) from the Conf store.
- `arka see-config`: Presents saved configurations via Inquirer and prints the chosen payload as JSON.
- `arka see-api`: Prints the default config’s API and search keys if present.
- `arka switch -n <name>`: Mark a different configuration as the global default.
- `arka ask <query>`: Runs the conversational agent using the default configuration, including planner/executor mode when the classifier deems the request a build task.

## Configuration Details
Each config is shaped as:
```
{
  "provider": "openai" | "gemini" | "claude",
  "model": "<model_name>",
  "api": "<llm_key>",
  "search_api": "<tavily_key>"
}
```
- Provider menus mirror `Providers` from `src/types.ts`, exposing GPT-5/4 variants, Gemini 1.5/2.5, and Claude 3 family models.
- Models are instantiated via LangChain adapters defined in `ProviderMap`.
- Tavily search is required for tool-augmented answers; without it, `arka ask` will exit with an error before invoking the LLM.

## How It Works
- `src/core.ts` constructs `LLMCore`, which routes prompts through a DEC classifier to choose between the simple prompt template or the planner/executor pipeline.
- Tool definitions come from `src/tools.ts`, and `Tools` keeps a lookup map so the agent can respond to tool call IDs.
- After each interaction, `loadMemory` and `saveMemory` compress the transcript into a summary that seeds future System messages.

## Development
- Run `pnpm install` to fetch dependencies, then `pnpm start` to execute `src/main.ts` directly.
- Build output should live in `dist/`; publish-ready bundles should include compiled JavaScript plus the CLI bin entry noted in `package.json`.
