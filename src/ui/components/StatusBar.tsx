import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { AgentMode } from '../../types.js';

interface StatusBarProps {
    provider?: string;
    model?: string;
    mode: AgentMode
}

const MODE_DISPLAY: Record<AgentMode, { label: string; color: string; icon: string }> = {
    [AgentMode.CHAT]: { label: 'Chat', color: '#60a5fa', icon: '' },
    [AgentMode.PLAN]: { label: 'Plan', color: '#fbbf24', icon: '' },
    [AgentMode.BUILD]: { label: 'Build', color: '#4ade80', icon: '' },
    [AgentMode.ROAST]: { label: 'Roast', color: '#ef4444', icon: '' }
};

export function StatusBar({ provider, model, mode }: StatusBarProps) {

    const modeInfo = MODE_DISPLAY[mode];

    return (
        <Box
            borderStyle="single"
            borderColor={theme.colors.border}
            paddingX={1}
            marginTop={1}
        >
            <Text color={modeInfo.color} bold>
                {modeInfo.label}
            </Text>
            <Text color={theme.colors.textDim}> | </Text>
            <Text color={theme.colors.textDim}>
                {provider && model
                    ? `${theme.icons.success} ${provider} → ${model}`
                    : `${theme.icons.warning} Not configured`
                }
            </Text>
            <Text color={theme.colors.textDim}> | </Text>
            <Text color={theme.colors.textMuted}>help for commands</Text>
        </Box>
    )
}
