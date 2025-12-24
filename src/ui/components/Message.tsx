import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

interface MessageProps {
    role: 'user' | 'assistant';
    content: string;
}

export const Message = memo(function Message({ role, content }: MessageProps) {
    const isUser = role === 'user';

    return (
        <Box marginY={1} paddingLeft={1} flexDirection='column'>
            <Box gap={1}>
                <Text color={isUser ? theme.colors.user : theme.colors.assistant} bold>
                    {isUser ? theme.icons.user : theme.icons.assistant}
                </Text>
                <Text></Text>
                <Text color={isUser ? theme.colors.user : theme.colors.assistant} bold>{isUser ? 'You' : 'Gloo'}</Text>
            </Box>
            <Box paddingLeft={2}>
                <Text color={theme.colors.text}>{content}</Text>
            </Box>
        </Box>
    );
});