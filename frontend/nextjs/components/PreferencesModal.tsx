'use client';

import React, { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModelBrowser from './ModelBrowser';

type SourceSettings = {
    quick: number;
    reddit: number;
    news: number;
    shopping: number;
    deep: number;
};

type OllamaModel = {
    name: string;
    size?: string;
    modified_at?: string;
};

const DEFAULT_SOURCE_COUNTS: SourceSettings = {
    quick: 7,
    reddit: 10,
    news: 10,
    shopping: 10,
    deep: 20,
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

type LLMBackend = {
    id: string;
    name: string;
    default_url: string;
    installUrl: string;
    installText: string;
};

const BACKENDS: LLMBackend[] = [
    { id: 'ollama', name: 'Ollama', default_url: 'http://localhost:11434', installUrl: 'https://ollama.com/download', installText: 'Install Ollama' },
    { id: 'lm_studio', name: 'LM Studio', default_url: 'http://localhost:1234', installUrl: 'https://lmstudio.ai/', installText: 'Get LM Studio' },
    { id: 'local_ai', name: 'LocalAI', default_url: 'http://localhost:8080', installUrl: 'https://localai.io/', installText: 'Install LocalAI' },
    { id: 'vllm', name: 'vLLM', default_url: 'http://localhost:8000', installUrl: 'https://docs.vllm.ai/', installText: 'Install vLLM' },
    { id: 'text_gen_webui', name: 'text-generation-webui', default_url: 'http://localhost:5000', installUrl: 'https://github.com/oobabooga/text-generation-webui', installText: 'Get text-gen-webui' },
];

const PreferencesModal: FC<Props> = ({ isOpen, onClose }) => {
    const [sourceCounts, setSourceCounts] = useState<SourceSettings>(DEFAULT_SOURCE_COUNTS);
    const [searxngUrl, setSearxngUrl] = useState('http://localhost:8080');
    const [webSearchEnabled, setWebSearchEnabled] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Backend and model selection state
    const [selectedBackend, setSelectedBackend] = useState('ollama');
    const [backendUrl, setBackendUrl] = useState('http://localhost:11434');
    const [selectedModel, setSelectedModel] = useState('llama3.1');
    const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
    const [backendConnected, setBackendConnected] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    const [showModelBrowser, setShowModelBrowser] = useState(false);

    // Load preferences from localStorage
    useEffect(() => {
        const savedCounts = localStorage.getItem('sourceCountSettings');
        if (savedCounts) {
            try {
                setSourceCounts(JSON.parse(savedCounts));
            } catch (e) {
                console.error('Failed to load source count settings', e);
            }
        }

        const savedUrl = localStorage.getItem('searxngUrl');
        if (savedUrl) {
            setSearxngUrl(savedUrl);
        }

        const savedWebSearch = localStorage.getItem('webSearchEnabled');
        if (savedWebSearch !== null) {
            setWebSearchEnabled(savedWebSearch === 'true');
        }

        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        const savedBackend = localStorage.getItem('selectedBackend');
        if (savedBackend) {
            setSelectedBackend(savedBackend);
        }

        const savedBackendUrl = localStorage.getItem('backendUrl');
        if (savedBackendUrl) {
            setBackendUrl(savedBackendUrl);
        }

        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            setSelectedModel(savedModel);
        }
    }, []);

    // Fetch models when modal opens or backend changes
    useEffect(() => {
        if (isOpen) {
            fetchModels();
        }
    }, [isOpen, selectedBackend, backendUrl]);

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const params = new URLSearchParams({ backend: selectedBackend });
            if (backendUrl) params.set('url', backendUrl);
            const response = await fetch(`/api/llm-models?${params}`);
            const data = await response.json();
            setAvailableModels(data.models || []);
            setBackendConnected(data.connected);
        } catch (error) {
            console.error('Failed to fetch models:', error);
            setBackendConnected(false);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleSave = () => {
        localStorage.setItem('sourceCountSettings', JSON.stringify(sourceCounts));
        localStorage.setItem('searxngUrl', searxngUrl);
        localStorage.setItem('webSearchEnabled', String(webSearchEnabled));
        localStorage.setItem('theme', theme);
        localStorage.setItem('selectedBackend', selectedBackend);
        localStorage.setItem('backendUrl', backendUrl);
        localStorage.setItem('selectedModel', selectedModel);
        onClose();
    };

    const handleReset = () => {
        setSourceCounts(DEFAULT_SOURCE_COUNTS);
        setSearxngUrl('http://localhost:8080');
        setWebSearchEnabled(true);
        setTheme('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        setSelectedBackend('ollama');
        setBackendUrl('http://localhost:11434');
        setSelectedModel('llama3.1');
    };

    const updateSourceCount = (mode: keyof SourceSettings, value: number) => {
        setSourceCounts(prev => ({ ...prev, [mode]: value }));
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const openSearxng = () => {
        window.open(searxngUrl, '_blank');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-xl font-bold text-white mb-6">Preferences</h2>

                    {/* Theme removed - requires extensive component updates */}

                    {/* Web Search Toggle */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                                    Web Search
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Enable to search the web for answers</p>
                            </div>
                            <button
                                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${webSearchEnabled ? 'bg-teal-600' : 'bg-gray-700'
                                    }`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${webSearchEnabled ? 'left-6' : 'left-0.5'
                                    }`} />
                            </button>
                        </div>
                    </div>

                    {/* Source Count Settings */}
                    <div className={`mb-6 ${!webSearchEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                            Sources per Mode
                        </h3>
                        <div className="space-y-3">
                            {(Object.keys(sourceCounts) as Array<keyof SourceSettings>).map((mode) => (
                                <div key={mode} className="flex items-center justify-between">
                                    <label className="text-gray-300 capitalize">{mode}</label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => updateSourceCount(mode, Math.max(0, sourceCounts[mode] - 1))}
                                            className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-l-lg
                                                     border border-gray-700 flex items-center justify-center"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            max="999"
                                            value={sourceCounts[mode]}
                                            onChange={(e) => updateSourceCount(mode, Math.min(999, Math.max(0, parseInt(e.target.value) || 0)))}
                                            className="w-16 h-8 bg-gray-800 border-y border-gray-700 text-center text-teal-400 
                                                     font-mono text-sm outline-none [appearance:textfield] 
                                                     [&::-webkit-outer-spin-button]:appearance-none 
                                                     [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button
                                            onClick={() => updateSourceCount(mode, Math.min(999, sourceCounts[mode] + 1))}
                                            className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-r-lg
                                                     border border-gray-700 flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Model Settings */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                                AI Backend
                            </h3>
                            <div className="flex items-center gap-2">
                                {backendConnected ? (
                                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        Connected
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                                        Disconnected
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Backend Selector */}
                        <div className="flex gap-2 mb-3">
                            <select
                                value={selectedBackend}
                                onChange={(e) => {
                                    const backend = BACKENDS.find(b => b.id === e.target.value);
                                    setSelectedBackend(e.target.value);
                                    if (backend) setBackendUrl(backend.default_url);
                                }}
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                                         text-white text-sm outline-none cursor-pointer
                                         focus:border-teal-500 transition-colors"
                            >
                                {BACKENDS.map((backend) => (
                                    <option key={backend.id} value={backend.id}>
                                        {backend.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Backend URL */}
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={backendUrl}
                                onChange={(e) => setBackendUrl(e.target.value)}
                                placeholder="Backend URL"
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                                         text-white placeholder-gray-500 text-sm outline-none
                                         focus:border-teal-500 transition-colors"
                            />
                        </div>

                        {/* Model Selector */}
                        <div className="flex gap-2">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                disabled={!backendConnected || loadingModels}
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                                         text-white text-sm outline-none cursor-pointer
                                         focus:border-teal-500 transition-colors disabled:opacity-50"
                            >
                                {loadingModels ? (
                                    <option>Loading models...</option>
                                ) : availableModels.length > 0 ? (
                                    availableModels.map((model) => (
                                        <option key={model.name} value={model.name}>
                                            {model.name} {model.size && `(${model.size})`}
                                        </option>
                                    ))
                                ) : (
                                    <option value={selectedModel}>{selectedModel}</option>
                                )}
                            </select>
                            <button
                                onClick={fetchModels}
                                disabled={loadingModels}
                                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 
                                         text-gray-400 hover:text-white rounded-lg transition-colors"
                                title="Refresh models"
                            >
                                <svg className={`w-5 h-5 ${loadingModels ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <button
                                onClick={() => setShowModelBrowser(true)}
                                className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Get More Models
                            </button>
                            <a
                                href={BACKENDS.find(b => b.id === selectedBackend)?.installUrl || 'https://ollama.com/download'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-gray-400"
                            >
                                {BACKENDS.find(b => b.id === selectedBackend)?.installText || 'Install Backend'}
                            </a>
                        </div>
                    </div>

                    {/* SearXNG Settings */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            SearXNG Settings
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searxngUrl}
                                onChange={(e) => setSearxngUrl(e.target.value)}
                                placeholder="http://localhost:8080"
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                                         text-white placeholder-gray-500 text-sm outline-none
                                         focus:border-teal-500 transition-colors"
                            />
                            <button
                                onClick={openSearxng}
                                className="px-3 py-2 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 
                                         text-teal-400 rounded-lg text-sm transition-colors"
                                title="Open SearXNG in new tab"
                            >
                                Open
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Configure your SearXNG instance URL for web searches
                        </p>

                        {/* Domain Filter */}
                        <div className="mt-3">
                            <label className="block text-xs text-gray-400 mb-1">Domain Filter (optional)</label>
                            <input
                                type="text"
                                value={localStorage.getItem('searchDomain') || ''}
                                onChange={(e) => localStorage.setItem('searchDomain', e.target.value)}
                                placeholder="e.g. stackoverflow.com, github.com"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                                         text-white placeholder-gray-500 text-sm outline-none
                                         focus:border-teal-500 transition-colors"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Limit search to specific domains (comma-separated)
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            Reset to Defaults
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 
                                     rounded-lg text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white 
                                     rounded-lg text-sm transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Model Browser Modal */}
            <ModelBrowser
                isOpen={showModelBrowser}
                onClose={() => setShowModelBrowser(false)}
                installedModels={availableModels.map(m => m.name)}
                onSelectModel={(model) => setSelectedModel(model)}
                selectedBackend={selectedBackend}
            />
        </AnimatePresence>
    );
};

export default PreferencesModal;

// Helper function to get source counts
export const getSourceCountSettings = (): SourceSettings => {
    if (typeof window === 'undefined') return DEFAULT_SOURCE_COUNTS;
    const saved = localStorage.getItem('sourceCountSettings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return DEFAULT_SOURCE_COUNTS;
        }
    }
    return DEFAULT_SOURCE_COUNTS;
};

// Helper function to get selected model
export const getSelectedModel = (): string => {
    if (typeof window === 'undefined') return 'llama3.1';
    return localStorage.getItem('selectedModel') || 'llama3.1';
};

// Helper function to get selected backend
export const getSelectedBackend = (): string => {
    if (typeof window === 'undefined') return 'ollama';
    return localStorage.getItem('selectedBackend') || 'ollama';
};

// Helper function to get backend URL
export const getBackendUrl = (): string => {
    if (typeof window === 'undefined') return 'http://localhost:11434';
    return localStorage.getItem('backendUrl') || 'http://localhost:11434';
};

// Helper function to check if web search is enabled
export const getWebSearchEnabled = (): boolean => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('webSearchEnabled');
    return saved === null ? true : saved === 'true';
};
