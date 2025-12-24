import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

interface StatusBarProps {
    provider?: string;
    model?: string;
}

export function StatusBar({ provider, model }: StatusBarProps) {
    return (
        <Box
            borderStyle="single"
            borderColor={theme.colors.border}
            paddingX={1}
            marginTop={1}
        >
            <Text color={theme.colors.textDim}>
                {provider && model
                    ? `${theme.icons.success} ${provider} → ${model}`
                    : `${theme.icons.warning} Not configured`
                }
            </Text>
            <Text color={theme.colors.textDim}> | </Text>
            <Text color={theme.colors.textMuted}>Type 'q' to quit , 'Ctrl+S' or Type 's' for settings</Text>
        </Box>
    )
}
