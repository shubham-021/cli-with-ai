# Gloo CLI

## Supported Providers

- OpenAI (GPT-4, GPT-4o mini, GPT-4 Turbo)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Google Gemini (Gemini 1.5 Pro, Flash, 2.5 Pro, Flash)

## Prerequisites

- Node.js 18+
- API key from your chosen provider
- Tavily API key for web search

## Installation

```sh
npm install -g @arka07/gloo
```

## Setup

```sh
gloo init
```

## Commands

| Command | Description |
|---------|-------------|
| `gloo init` | First-time setup |
| `gloo` | Interactive chat mode |
| `gloo ask <question>` | One-off question |
| `gloo debug` | Chat with debug output |

## Interactive Mode

Run `gloo` to start chatting. Press `Ctrl+S` for settings. Type `q` to quit.
