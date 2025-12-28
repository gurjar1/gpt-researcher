'use client';

import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Backend-specific configuration
const BACKEND_CONFIG: Record<string, {
    name: string;
    libraryUrl: string;
    installUrl: string;
    installText: string;
    pullCommand?: string;
    canPullDirect: boolean;
    description: string;
}> = {
    ollama: {
        name: 'Ollama',
        libraryUrl: 'https://ollama.com/library',
        installUrl: 'https://ollama.com/download',
        installText: 'Install Ollama',
        pullCommand: 'ollama pull',
        canPullDirect: true,
        description: 'Download and run models locally with Ollama',
    },
    lm_studio: {
        name: 'LM Studio',
        libraryUrl: 'https://lmstudio.ai/models',
        installUrl: 'https://lmstudio.ai/',
        installText: 'Get LM Studio',
        canPullDirect: false,
        description: 'Discover and download models in the LM Studio app',
    },
    local_ai: {
        name: 'LocalAI',
        libraryUrl: 'https://localai.io/models/',
        installUrl: 'https://localai.io/basics/getting_started/',
        installText: 'Install LocalAI',
        canPullDirect: false,
        description: 'Browse models compatible with LocalAI',
    },
    vllm: {
        name: 'vLLM',
        libraryUrl: 'https://huggingface.co/models?library=vllm',
        installUrl: 'https://docs.vllm.ai/en/latest/getting_started/installation.html',
        installText: 'Install vLLM',
        canPullDirect: false,
        description: 'Find vLLM-compatible models on HuggingFace',
    },
    text_gen_webui: {
        name: 'text-generation-webui',
        libraryUrl: 'https://huggingface.co/models',
        installUrl: 'https://github.com/oobabooga/text-generation-webui#installation',
        installText: 'Install text-generation-webui',
        canPullDirect: false,
        description: 'Download models through the text-generation-webui interface',
    },
};

// Popular models for Ollama only
const OLLAMA_MODELS = [
    { name: 'llama3.1', size: '4.7 GB', description: 'Meta Llama 3.1 - Fast and capable', recommended: true },
    { name: 'llama3.2', size: '2.0 GB', description: 'Meta Llama 3.2 - Latest version', recommended: true },
    { name: 'mistral', size: '4.1 GB', description: 'Mistral 7B - Excellent for coding' },
    { name: 'mixtral', size: '26 GB', description: 'Mixtral 8x7B - MoE architecture' },
    { name: 'codellama', size: '3.8 GB', description: 'Code Llama - Optimized for code' },
    { name: 'phi3', size: '2.2 GB', description: 'Microsoft Phi-3 - Compact and fast' },
    { name: 'gemma2', size: '5.4 GB', description: 'Google Gemma 2 - High quality' },
    { name: 'qwen2.5', size: '4.4 GB', description: 'Alibaba Qwen 2.5 - Multilingual' },
    { name: 'deepseek-coder', size: '776 MB', description: 'DeepSeek Coder - Code specialist' },
    { name: 'neural-chat', size: '4.1 GB', description: 'Intel Neural Chat - Conversational' },
];

type Props = {
    isOpen: boolean;
    onClose: () => void;
    installedModels: string[];
    onSelectModel: (model: string) => void;
    selectedBackend: string;
};

const ModelBrowser: FC<Props> = ({ isOpen, onClose, installedModels, onSelectModel, selectedBackend }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [pullingModels, setPullingModels] = useState<Set<string>>(new Set());
    const [pullStatus, setPullStatus] = useState<Record<string, string>>({});

    const config = BACKEND_CONFIG[selectedBackend] || BACKEND_CONFIG.ollama;
    const isOllama = selectedBackend === 'ollama';

    const filteredModels = OLLAMA_MODELS.filter(model =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isInstalled = (modelName: string) => {
        return installedModels.some(m => m.startsWith(modelName));
    };

    const isPulling = (modelName: string) => {
        return pullingModels.has(modelName);
    };

    const handlePullModel = async (modelName: string) => {
        setPullingModels(prev => new Set(prev).add(modelName));
        setPullStatus(prev => ({ ...prev, [modelName]: 'Starting download...' }));

        try {
            const response = await fetch('/api/ollama-pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelName }),
            });
            const data = await response.json();

            if (data.success) {
                setPullStatus(prev => ({ ...prev, [modelName]: 'Downloading... (check Ollama)' }));
                setTimeout(() => {
                    setPullingModels(prev => {
                        const next = new Set(prev);
                        next.delete(modelName);
                        return next;
                    });
                    setPullStatus(prev => ({ ...prev, [modelName]: 'Refresh to see model' }));
                }, 5000);
            } else {
                setPullStatus(prev => ({ ...prev, [modelName]: data.message }));
                setPullingModels(prev => {
                    const next = new Set(prev);
                    next.delete(modelName);
                    return next;
                });
            }
        } catch (error) {
            setPullStatus(prev => ({ ...prev, [modelName]: 'Failed to start download' }));
            setPullingModels(prev => {
                const next = new Set(prev);
                next.delete(modelName);
                return next;
            });
        }
    };

    const handleLibrary = () => {
        window.open(config.libraryUrl, '_blank');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Get Models</h2>
                            <p className="text-xs text-gray-500">for {config.name}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content - Different for Ollama vs other backends */}
                    {isOllama ? (
                        <>
                            {/* Search - Ollama only */}
                            <div className="p-4 border-b border-gray-800">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search models..."
                                            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg 
                                                     text-white placeholder-gray-500 text-sm outline-none
                                                     focus:border-teal-500 transition-colors"
                                        />
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <button
                                        onClick={handleLibrary}
                                        className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 
                                                 text-purple-400 rounded-lg text-sm transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Browse All
                                    </button>
                                </div>
                            </div>

                            {/* Model List - Ollama only */}
                            <div className="p-4 overflow-y-auto max-h-[400px] space-y-2">
                                {filteredModels.map((model) => (
                                    <div
                                        key={model.name}
                                        className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 
                                                 rounded-xl hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium">{model.name}</span>
                                                {model.recommended && (
                                                    <span className="px-1.5 py-0.5 text-[10px] bg-teal-600/30 text-teal-400 rounded-full">
                                                        Recommended
                                                    </span>
                                                )}
                                                {isInstalled(model.name) && (
                                                    <span className="px-1.5 py-0.5 text-[10px] bg-green-600/30 text-green-400 rounded-full">
                                                        Installed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 mt-0.5">{model.description}</p>
                                            <p className="text-xs text-gray-500">{model.size}</p>
                                            {pullStatus[model.name] && (
                                                <p className="text-xs text-teal-400 mt-1">{pullStatus[model.name]}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            {isInstalled(model.name) ? (
                                                <button
                                                    onClick={() => {
                                                        onSelectModel(model.name);
                                                        onClose();
                                                    }}
                                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white 
                                                             rounded-lg text-sm transition-colors"
                                                >
                                                    Use
                                                </button>
                                            ) : isPulling(model.name) ? (
                                                <button
                                                    disabled
                                                    className="px-3 py-1.5 bg-gray-700 text-gray-400 
                                                             rounded-lg text-sm flex items-center gap-1.5"
                                                >
                                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Pulling...
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handlePullModel(model.name)}
                                                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white 
                                                             rounded-lg text-sm transition-colors flex items-center gap-1.5"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Download
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {filteredModels.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No models found matching "{searchQuery}"</p>
                                        <button
                                            onClick={handleLibrary}
                                            className="mt-2 text-teal-400 hover:text-teal-300 text-sm"
                                        >
                                            Browse all models on Ollama →
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer - Ollama */}
                            <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    Or run: <code className="px-1.5 py-0.5 bg-gray-700 rounded text-teal-400">ollama pull model-name</code>
                                </p>
                                <a
                                    href={config.installUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                >
                                    {config.installText} →
                                </a>
                            </div>
                        </>
                    ) : (
                        /* Non-Ollama Backends - Show browse link only */
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{config.name} Models</h3>
                            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                                {config.description}
                            </p>
                            <button
                                onClick={handleLibrary}
                                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white 
                                         rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Browse {config.name} Models
                            </button>
                            <p className="text-xs text-gray-500 mt-6">
                                Download models through the {config.name} interface, then select them here.
                            </p>

                            {/* Footer for non-Ollama */}
                            <div className="mt-6 pt-4 border-t border-gray-700">
                                <a
                                    href={config.installUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-purple-400 hover:text-purple-300"
                                >
                                    {config.installText} →
                                </a>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ModelBrowser;
