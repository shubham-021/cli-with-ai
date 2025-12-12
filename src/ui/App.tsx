import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import Conf from 'conf';
import { Banner, Spinner, StatusBar, Message, TextInput } from './components/index.js';
import { theme } from './theme.js';
import LLMCore from '../core.js';
import { Config } from '../types.js';
import { ToolActivity } from './components/ToolActivity.js';

const config = new Conf({ projectName: 'gloo-cli' });

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export function App() {
    const { exit } = useApp();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [currentTool, setCurrentTool] = useState<string | null>(null);


    const defaultConfig = config.get('default') as string | undefined;
    const currentConfig = defaultConfig ? config.get(defaultConfig) as Config : undefined;

    const handleSubmit = async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        const command = trimmed.toLowerCase();

        if (command === 'q' || command === 'quit') {
            exit();
            return;
        }

        if (command === 'help') {
            setMessages(prev => [...prev,
            { role: 'user', content: 'help' },
            { role: 'assistant', content: 'Commands: q/quit (exit) , help. Just type your question' }
            ]);

            setInput('');
            return;
        }

        if (!currentConfig?.api || !currentConfig?.search_api) {
            setError('Not configured. Run: gloo configure -n <name>');
            setInput('');
            return;
        }

        setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
        setInput('');
        setIsLoading(true);
        setStreamingText('');
        setError(null);


        try {
            const llm = new LLMCore(
                currentConfig.provider,
                currentConfig.model,
                currentConfig.api,
                currentConfig.search_api
            );

            let fullResponse = '';
            for await (const event of llm.chat(trimmed)) {
                if (event.type === 'text') {
                    setCurrentTool(null);
                    fullResponse += event.content;
                    setStreamingText(fullResponse);
                } else if (event.type === 'tool') {
                    setCurrentTool(event.message);
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
            setStreamingText('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
            setCurrentTool(null);
        }
    }

    return (
        <Box flexDirection='column' padding={1}>
            <Banner />
            <Box flexDirection='column' marginY={1}>
                {messages.map((msg, i) => (
                    <Message key={i} role={msg.role} content={msg.content} />
                ))}

                {streamingText && (
                    <Message role='assistant' content={streamingText} />
                )}

                {isLoading && !streamingText && (
                    <Box paddingLeft={1} marginY={1}>
                        <Spinner message='Thinking ...' />
                    </Box>
                )}

                {currentTool && (
                    <ToolActivity message={currentTool} isActive={true} />
                )}

                {error && (
                    <Text color={theme.colors.error}>
                        {error}
                    </Text>
                )}
            </Box>

            <StatusBar
                provider={currentConfig?.provider}
                model={currentConfig?.model}
            />

            {!isLoading && (
                <TextInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    placeholder='Ask me anything...'
                />
            )}
        </Box>
    )
}