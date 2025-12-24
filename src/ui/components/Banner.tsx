import React, { memo, useMemo } from 'react';
import { Box, Text } from 'ink';
import figlet from 'figlet';
import { theme } from '../theme.js';

export const Banner = memo(function Banner() {
    const ascii = useMemo(() => figlet.textSync('Gloo', {
        font: 'Small',
        horizontalLayout: 'fitted'
    }), []);

    return (
        <Box flexDirection='column' marginBottom={1} paddingBottom={1}>
            <Text color={theme.colors.primary}>{ascii}</Text>
            <Text color={theme.colors.textMuted}>Your AI assistant in the terminal</Text>
        </Box >
    )
});