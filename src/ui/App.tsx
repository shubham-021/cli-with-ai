import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, Static } from 'ink';
import Conf from 'conf';
import { Banner, Spinner, StatusBar, Message, TextInput, DebugBox, ApprovalPrompt } from './components/index.js';
import { theme } from './theme.js';
import LLMCore from '../core.js';
import { Config } from '../types.js';
import { ToolActivity } from './components/ToolActivity.js';

const config = new Conf({ projectName: 'gloo-cli' });

type ChatItem =
    | { type: 'banner'; id: number }
    | { type: 'message'; id: number; role: 'user' | 'assistant'; content: string }
    | { type: 'debug'; id: number; level: 'error' | 'warning' | 'info'; title: string; message: string; details?: string };

let itemIdCounter = 0;

export function App() {
    const { exit } = useApp();
    const [input, setInput] = useState('');
    const [chatItems, setChatItems] = useState<ChatItem[]>([
        { type: 'banner', id: ++itemIdCounter }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTool, setCurrentTool] = useState<string | null>(null);
    const [pendingApproval, setPendingApproval] = useState<{
        toolName: string;
        args: Record<string, any>;
        resolve: (approved: boolean) => void;
    } | null>(null);

    const streamingBufferRef = useRef('');
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        if (!isLoading) {
            if (displayText !== '') {
                setDisplayText('');
            }
            return;
        }

        const interval = setInterval(() => {
            const currentBuffer = streamingBufferRef.current;
            if (currentBuffer !== displayText) {
                setDisplayText(currentBuffer);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isLoading, displayText]);

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
            setChatItems(prev => [...prev,
            { type: 'message', id: ++itemIdCounter, role: 'user', content: 'help' },
            { type: 'message', id: ++itemIdCounter, role: 'assistant', content: 'Commands: q/quit (exit) , help. Just type your question' }
            ]);

            setInput('');
            return;
        }

        if (!currentConfig?.api || !currentConfig?.search_api) {
            setError('Not configured. Run: gloo configure -n <name>');
            setInput('');
            return;
        }

        setChatItems(prev => [...prev, { type: 'message', id: ++itemIdCounter, role: 'user', content: trimmed }]);
        setInput('');
        setIsLoading(true);
        streamingBufferRef.current = '';
        setDisplayText('');
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
                    streamingBufferRef.current = fullResponse;
                } else if (event.type === 'tool') {
                    setCurrentTool(event.message);
                } else if (event.type === 'debug') {
                    setChatItems(prev => [...prev, {
                        type: 'debug',
                        id: ++itemIdCounter,
                        level: event.level,
                        title: event.title,
                        message: event.message,
                        details: event.details
                    }]);
                } else if (event.type === 'approval') {
                    setPendingApproval({
                        toolName: event.toolName,
                        args: event.args,
                        resolve: event.resolve
                    });
                }
            }

            setChatItems(prev => [...prev, { type: 'message', id: ++itemIdCounter, role: 'assistant', content: fullResponse }]);
            streamingBufferRef.current = '';
        } catch (err) {
            if (process.env.GLOO_DEBUG === 'true') {
                setChatItems(prev => [...prev, {
                    type: 'debug',
                    id: ++itemIdCounter,
                    level: 'error',
                    title: 'Error',
                    message: (err as Error).message,
                    details: (err as Error).stack
                }]);
            }
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
            setCurrentTool(null);
        }
    }

    const renderChatItem = (item: ChatItem) => {
        if (item.type === 'banner') {
            return <Banner key={item.id} />;
        } else if (item.type === 'message') {
            return <Message key={item.id} role={item.role} content={item.content} />;
        } else if (item.type === 'debug' && process.env.GLOO_DEBUG === 'true') {
            return (
                <DebugBox
                    key={item.id}
                    type={item.level}
                    title={item.title}
                    message={item.message}
                    details={item.details}
                />
            );
        }
        return null;
    };

    return (
        <Box flexDirection='column' padding={1}>
            <Static items={chatItems}>
                {renderChatItem}
            </Static>

            <Box flexDirection='column' marginY={1}>
                {displayText && (
                    <Message role='assistant' content={displayText} />
                )}

                {isLoading && !displayText && !currentTool && (
                    <Box paddingLeft={1} marginY={1}>
                        <Spinner message='Thinking ...' />
                    </Box>
                )}

                {currentTool && (
                    <Box paddingLeft={1} marginY={1}>
                        <ToolActivity message={currentTool} isActive={true} />
                    </Box>
                )}

                {pendingApproval && (
                    <ApprovalPrompt
                        toolName={pendingApproval.toolName}
                        args={pendingApproval.args}
                        onApprove={() => {
                            pendingApproval.resolve(true);
                            setPendingApproval(null);
                        }}
                        onDeny={() => {
                            pendingApproval.resolve(false);
                            setPendingApproval(null);
                        }}
                    />
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