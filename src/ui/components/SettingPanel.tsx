import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Conf from "conf";
import { theme } from "../theme.js";
import { Providers } from "../../providers/index.js";
import { getModelsForProvider, Config } from "../../types.js";
import { TextInput } from "./TextInput.js";

const config = new Conf({ projectName: 'gloo-cli' });

type View =
    | 'main'
    | 'switch'
    | 'create-provider'
    | 'create-model'
    | 'select-config-for-api'
    | 'select-config-for-search'
    | 'set-api'
    | 'set-search-api'
    | 'create-name'
    | 'create-api'
    | 'create-search-api'
    | 'delete';

interface SettingPanelProps {
    onClose: () => void;
    onConfigChange: () => void;
};

export function SettingPanel({ onClose, onConfigChange }: SettingPanelProps) {
    const [view, setView] = useState<View>('main');
    const [newConfigName, setNewConfigName] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<Providers | null>(null);
    const [selectedConfigForApi, setSelectedConfigForApi] = useState<string | null>(null);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [inputMode, setInputMode] = useState(false);
    const [newConfigApi, setNewConfigApi] = useState('');
    const [newConfigSearchApi, setNewConfigSearchApi] = useState('');
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const defaultConfigName = config.get('default') as string | undefined;
    const currentConfig = defaultConfigName ? config.get(defaultConfigName) as Config : undefined;

    const getAllConfigs = () => {
        const store = config.store as Record<string, any>;
        return Object.keys(store).filter(k => k !== 'default');
    };

    useInput((input, key) => {
        if (key.escape) {
            if (inputMode) {
                resetCreateFlow();
                setApiKeyInput('');
                setSelectedConfigForApi(null);
            } else if (view === 'main') {
                onClose();
            } else {
                resetCreateFlow();
            }
            return;
        }

        if (inputMode) return;
    });

    const mainMenuItems = [
        { label: `${theme.icons.selected} Switch Configuration`, value: 'switch' },
        { label: `${theme.icons.selected} Create New Configuration`, value: 'create' },
        { label: `${theme.icons.selected} Set LLM API Key`, value: 'set-api' },
        { label: `${theme.icons.selected} Set Search API Key`, value: 'set-search-api' },
        { label: `${theme.icons.selected} Delete Configuration`, value: 'delete' },
        { label: `${theme.icons.back} Back to Chat`, value: 'back' },
    ];

    const handleMainSelect = (item: { value: string }) => {
        switch (item.value) {
            case 'switch':
                setView('switch');
                break;
            case 'create':
                setView('create-name');
                setInputMode(true);
                break;
            case 'delete':
                setView('delete');
                break;
            case 'back':
                onClose();
                break;
            case 'set-api':
                setView('select-config-for-api');
                break;
            case 'set-search-api':
                setView('select-config-for-search');
                break;
        }
    };

    const configItems = useMemo(() => {
        const items = getAllConfigs().map(name => ({
            label: name === defaultConfigName ? `${theme.icons.selected} ${name} (current)` : `${theme.icons.unselected} ${name}`,
            value: name
        }));
        items.push({ label: `${theme.icons.back} Back`, value: '__back__' });
        return items;
    }, [defaultConfigName]);

    const handleSwitchSelect = (item: { value: string }) => {
        if (item.value === '__back__') {
            setView('main');
            return;
        }
        config.set('default', item.value);
        onConfigChange();
        setView('main');
    };

    const providerItems = useMemo(() => {
        const items: { label: string; value: string }[] = Object.values(Providers).map(p => ({ label: p, value: p }));
        items.push({ label: `${theme.icons.back} Back`, value: '__back__' });
        return items;
    }, []);

    const handleProviderSelect = (item: { value: string }) => {
        if (item.value === '__back__') {
            setView('main');
            return;
        }
        setSelectedProvider(item.value as Providers);
        setView('create-model');
    };

    const modelItems = useMemo(() => {
        const items: { label: string; value: string }[] = selectedProvider
            ? getModelsForProvider(selectedProvider).map(m => ({ label: m, value: m }))
            : [];
        items.push({ label: `${theme.icons.back} Back`, value: '__back__' });
        return items;
    }, [selectedProvider]);

    const handleModelSelect = (item: { value: string }) => {
        if (item.value === '__back__') {
            setView('create-provider');
            return;
        }

        setSelectedModel(item.value);
        setView('create-api');
        setInputMode(true);
    };

    const handleNewConfigApiSubmit = (value: string) => {
        setNewConfigApi(value.trim());
        setInputMode(false);
        setView('create-search-api');
        setInputMode(true);
    };

    const handleNewConfigSearchApiSubmit = (value: string) => {
        const searchApi = value.trim();

        if (!newConfigApi || !searchApi) {
            resetCreateFlow();
            return;
        }

        config.set(newConfigName, {
            provider: selectedProvider,
            model: selectedModel,
            api: newConfigApi,
            search_api: searchApi
        });

        config.set('default', newConfigName);
        onConfigChange();

        resetCreateFlow();
    };

    const resetCreateFlow = () => {
        setNewConfigName('');
        setSelectedProvider(null);
        setSelectedModel(null);
        setNewConfigApi('');
        setNewConfigSearchApi('');
        setInputMode(false);
        setError(null);
        setView('main');
    };

    const handleConfigNameSubmit = (value: string) => {
        const name = value.trim();
        if (!name) {
            setInputMode(false);
            setView('main');
            return;
        }

        if (config.has(name)) {
            setError(`Config "${name}" already exists. Choose a different name.`);
            return;
        }

        setError(null);
        setNewConfigName(name);
        setInputMode(false);
        setView('create-provider');
    };

    const handleApiKeySubmit = (value: string) => {
        if (value.trim() && selectedConfigForApi) {
            config.set(`${selectedConfigForApi}.api`, value.trim());
            onConfigChange();
        }
        setApiKeyInput('');
        setInputMode(false);
        setSelectedConfigForApi(null);
        setView('main');
    };

    const handleSearchApiSubmit = (value: string) => {
        if (value.trim() && selectedConfigForApi) {
            config.set(`${selectedConfigForApi}.search_api`, value.trim());
            onConfigChange();
        }
        setApiKeyInput('');
        setInputMode(false);
        setSelectedConfigForApi(null);
        setView('main');
    };

    const handleSelectConfigForApi = (item: { value: string }) => {
        if (item.value === '__back__') {
            setView('main');
            return;
        }
        setSelectedConfigForApi(item.value);
        setView('set-api');
        setInputMode(true);
    };

    const handleSelectConfigForSearch = (item: { value: string }) => {
        if (item.value === '__back__') {
            setView('main');
            return;
        }
        setSelectedConfigForApi(item.value);
        setView('set-search-api');
        setInputMode(true);
    };


    const deleteItems = useMemo(() => {
        const items = getAllConfigs()
            .filter(name => name !== defaultConfigName)
            .map(name => ({ label: `${name}`, value: name }));
        items.push({ label: `${theme.icons.back} Back`, value: '__back__' });
        return items;
    }, [defaultConfigName]);

    const handleDeleteSelect = (item: { value: string }) => {
        if (item.value === '__back__') {
            setView('main');
            return;
        }
        config.delete(item.value);
        setView('main');
    };

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.colors.primary}
            paddingX={2}
            paddingY={1}
        >

            <Box marginBottom={1}>
                <Text color={theme.colors.primary} bold>
                    {theme.icons.settings} Settings
                </Text>
                {currentConfig && (
                    <Text color={theme.colors.textMuted}>
                        {' '}| Current: {currentConfig.provider} → {currentConfig.model}
                    </Text>
                )}
            </Box>

            {view === 'main' && (
                <SelectInput
                    items={mainMenuItems}
                    onSelect={handleMainSelect}
                    indicatorComponent={({ isSelected }) => (
                        <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>
                            {isSelected ? '► ' : '  '}
                        </Text>
                    )}
                    itemComponent={({ isSelected, label }) => (
                        <Text color={isSelected ? theme.colors.text : theme.colors.textMuted}>
                            {label}
                        </Text>
                    )}
                />
            )}

            {view === 'switch' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Select a configuration:
                        </Text>
                    </Box>
                    {configItems.length > 1 ? (
                        <SelectInput
                            items={configItems}
                            onSelect={handleSwitchSelect}
                            indicatorComponent={({ isSelected }) => (
                                <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>
                                    {isSelected ? '► ' : '  '}
                                </Text>
                            )}
                        />
                    ) : (
                        <Box flexDirection="column">
                            <Text color={theme.colors.textMuted}>No configurations found.</Text>
                            <Text color={theme.colors.textDim}>Create one first!</Text>
                        </Box>
                    )}
                </Box>
            )}

            {view === 'create-provider' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Select a provider:
                        </Text>
                    </Box>
                    <SelectInput
                        items={providerItems}
                        onSelect={handleProviderSelect}
                        indicatorComponent={({ isSelected }) => (
                            <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>
                                {isSelected ? '► ' : '  '}
                            </Text>
                        )}
                    />
                </Box>
            )}

            {view === 'create-model' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Select a {selectedProvider} model:
                        </Text>
                    </Box>
                    <SelectInput
                        items={modelItems}
                        onSelect={handleModelSelect}
                        indicatorComponent={({ isSelected }) => (
                            <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>
                                {isSelected ? '► ' : '  '}
                            </Text>
                        )}
                    />
                </Box>
            )}

            {view === 'create-api' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Enter LLM API Key for "{newConfigName}":
                        </Text>
                    </Box>
                    <TextInput
                        value={newConfigApi}
                        onChange={setNewConfigApi}
                        onSubmit={handleNewConfigApiSubmit}
                        placeholder="....."
                    />
                    <Box marginTop={1}>
                        <Text color={theme.colors.textDim}>
                            Press Enter to continue, ESC to cancel
                        </Text>
                    </Box>
                </Box>
            )}

            {view === 'create-search-api' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Enter Tavily Search API Key for "{newConfigName}":
                        </Text>
                    </Box>
                    <TextInput
                        value={newConfigSearchApi}
                        onChange={setNewConfigSearchApi}
                        onSubmit={handleNewConfigSearchApiSubmit}
                        placeholder="tvly-..."
                    />
                    <Box marginTop={1}>
                        <Text color={theme.colors.textDim}>
                            Press Enter to save config, ESC to cancel
                        </Text>
                    </Box>
                </Box>
            )}

            {view === 'set-api' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Enter LLM API Key for {selectedConfigForApi}:
                        </Text>
                    </Box>
                    <TextInput
                        value={apiKeyInput}
                        onChange={setApiKeyInput}
                        onSubmit={handleApiKeySubmit}
                        placeholder="sk-..."
                    />
                    <Box marginTop={1}>
                        <Text color={theme.colors.textDim}>
                            Press Enter to save, ESC to cancel
                        </Text>
                    </Box>
                </Box>
            )}

            {view === 'set-search-api' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Enter Tavily Search API Key for {selectedConfigForApi}:
                        </Text>
                    </Box>
                    <TextInput
                        value={apiKeyInput}
                        onChange={setApiKeyInput}
                        onSubmit={handleSearchApiSubmit}
                        placeholder="tvly-..."
                    />
                    <Box marginTop={1}>
                        <Text color={theme.colors.textDim}>
                            Press Enter to save, ESC to cancel
                        </Text>
                    </Box>
                </Box>
            )}

            {view === 'delete' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.warning} bold>
                            Select configuration to delete:
                        </Text>
                    </Box>
                    {deleteItems.length > 1 ? (
                        <SelectInput
                            items={deleteItems}
                            onSelect={handleDeleteSelect}
                            indicatorComponent={({ isSelected }) => (
                                <Text color={isSelected ? theme.colors.error : theme.colors.textDim}>
                                    {isSelected ? '► ' : '  '}
                                </Text>
                            )}
                        />
                    ) : (
                        <Text color={theme.colors.textMuted}>
                            Cannot delete the current active configuration.
                        </Text>
                    )}
                </Box>
            )}

            {view === 'select-config-for-api' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Select config to set LLM API key:
                        </Text>
                    </Box>
                    <SelectInput
                        items={configItems}
                        onSelect={handleSelectConfigForApi}
                        indicatorComponent={({ isSelected }) => (
                            <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>
                                {isSelected ? '► ' : '  '}
                            </Text>
                        )}
                    />
                </Box>
            )}

            {view === 'select-config-for-search' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Select config to set Search API key:
                        </Text>
                    </Box>
                    <SelectInput
                        items={configItems}
                        onSelect={handleSelectConfigForSearch}
                        indicatorComponent={({ isSelected }) => (
                            <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>
                                {isSelected ? '► ' : '  '}
                            </Text>
                        )}
                    />
                </Box>
            )}

            {view === 'create-name' && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={theme.colors.secondary} bold>
                            Enter a name for this configuration:
                        </Text>
                    </Box>
                    <TextInput
                        value={newConfigName}
                        onChange={setNewConfigName}
                        onSubmit={handleConfigNameSubmit}
                        placeholder="e.g., work, personal, gpt-fast..."
                    />
                    {error && (
                        <Box marginTop={1}>
                            <Text color={theme.colors.error}>{error}</Text>
                        </Box>
                    )}
                    <Box marginTop={1}>
                        <Text color={theme.colors.textDim}>
                            Press Enter to continue, ESC to cancel
                        </Text>
                    </Box>
                </Box>
            )}

            <Box marginTop={1}>
                <Text color={theme.colors.textDim}>
                    ↑↓ Navigate • Enter Select • ESC Back
                </Text>
            </Box>
        </Box>
    );
}
