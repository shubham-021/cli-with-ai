import React from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { theme } from '../theme.js';

interface ToolActivityProps {
    message: string;
    isActive?: boolean;
}

export function ToolActivity({ message, isActive = true }: ToolActivityProps) {
    return (
        <Box paddingLeft={1} marginY={0}>
            {isActive ? (
                <Text color={theme.colors.secondary}>
                    <InkSpinner type="dots" />
                </Text>
            ) : (
                <Text color={theme.colors.success}>{theme.icons.success}</Text>
            )}
            <Text> </Text>
            <Text color={theme.colors.textMuted} italic>{message}</Text>
        </Box>
    );
}