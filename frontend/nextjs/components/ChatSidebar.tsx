'use client';

import React, { FC, useState, useRef, useEffect } from 'react';
import PreferencesModal from './PreferencesModal';

type ChatSession = {
    id: string;
    title: string;
    messages: any[];
    createdAt: number;
};

type Props = {
    isOpen: boolean;
    onToggle: () => void;
    onNewChat: () => void;
    history: ChatSession[];
    onSelectChat: (session: ChatSession) => void;
    currentSessionId?: string;
    onHistoryChange?: (history: ChatSession[]) => void;
};

const ChatSidebar: FC<Props> = ({
    isOpen,
    onToggle,
    onNewChat,
    history,
    onSelectChat,
    currentSessionId,
    onHistoryChange
}) => {
    const [showPreferences, setShowPreferences] = useState(false);
    const [showHistoryMenu, setShowHistoryMenu] = useState(false);
    const [selectedModel, setSelectedModel] = useState('llama3.1');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load selected model from localStorage
    useEffect(() => {
        const model = localStorage.getItem('selectedModel') || 'llama3.1';
        setSelectedModel(model);
    }, [showPreferences]); // Re-read when preferences close

    // Clear all history
    const handleClearHistory = () => {
        if (confirm('Are you sure you want to clear all chat history?')) {
            localStorage.removeItem('quickChatHistory');
            if (onHistoryChange) onHistoryChange([]);
            setShowHistoryMenu(false);
        }
    };

    // Export history as JSON
    const handleExportHistory = () => {
        const dataStr = JSON.stringify(history, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gpt-researcher-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowHistoryMenu(false);
    };

    // Import history from JSON
    const handleImportHistory = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    const merged = [...imported, ...history].slice(0, 50);
                    localStorage.setItem('quickChatHistory', JSON.stringify(merged));
                    if (onHistoryChange) onHistoryChange(merged);
                    alert(`Imported ${imported.length} chat sessions`);
                }
            } catch (err) {
                alert('Failed to import history. Invalid file format.');
            }
        };
        reader.readAsText(file);
        setShowHistoryMenu(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <>
            <div className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 z-50
                            ${isOpen ? 'w-56' : 'w-14'} flex flex-col`}>

                {/* Header with expand button */}
                <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                    {isOpen ? (
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">Vernix</span>
                            <span className="text-xs text-gray-500 truncate max-w-[120px]" title={selectedModel}>
                                {selectedModel}
                            </span>
                        </div>
                    ) : (
                        <div className="mx-auto" title={`Model: ${selectedModel}`}>
                            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}
                    <button
                        onClick={onToggle}
                        className={`p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors ${!isOpen ? 'hidden' : ''}`}
                        title={isOpen ? 'Collapse' : 'Expand'}
                    >
                        <svg className={`w-5 h-5 transition-transform ${isOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex flex-col p-3 overflow-hidden">
                    {/* New Chat Button */}
                    <button
                        onClick={onNewChat}
                        className={`flex items-center gap-3 w-full p-2.5 mb-3 bg-teal-600/20 hover:bg-teal-600/30 
                                  border border-teal-500/30 rounded-lg text-teal-400 transition-colors
                                  ${isOpen ? '' : 'justify-center'}`}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {isOpen && <span className="text-sm">New Chat</span>}
                    </button>

                    {/* Model Info */}
                    <div className={`flex items-center gap-2 p-2 mb-3 bg-gray-800/50 rounded-lg ${isOpen ? '' : 'justify-center'}`}>
                        <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {isOpen && <span className="text-xs text-gray-400 truncate" title={selectedModel}>{selectedModel}</span>}
                    </div>

                    {/* Discover removed - navigation issues */}

                    {/* History Header with Menu */}
                    {isOpen && (
                        <div className="flex items-center justify-between mb-2 px-1">
                            <p className="text-xs text-gray-500 uppercase">History</p>
                            <div className="relative">
                                <button
                                    onClick={() => setShowHistoryMenu(!showHistoryMenu)}
                                    className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>
                                {showHistoryMenu && (
                                    <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                                        <button
                                            onClick={handleClearHistory}
                                            className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-gray-700 rounded-t-lg"
                                        >
                                            🗑️ Clear All
                                        </button>
                                        <button
                                            onClick={handleExportHistory}
                                            className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-gray-700"
                                        >
                                            📤 Export
                                        </button>
                                        <button
                                            onClick={handleImportHistory}
                                            className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-gray-700 rounded-b-lg"
                                        >
                                            📥 Import
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* History List */}
                    <div className="flex-1 overflow-y-auto">
                        {history.slice(0, 15).map((session) => (
                            <button
                                key={session.id}
                                onClick={() => onSelectChat(session)}
                                className={`flex items-center gap-2 w-full p-2 mb-1 rounded-lg 
                                          transition-colors text-left
                                          ${currentSessionId === session.id
                                        ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30'
                                        : 'hover:bg-gray-800 text-gray-400 hover:text-white'}
                                          ${isOpen ? '' : 'justify-center'}`}
                                title={session.title}
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {isOpen && <span className="text-xs truncate">{session.title}</span>}
                            </button>
                        ))}
                        {history.length === 0 && isOpen && (
                            <p className="text-xs text-gray-600 text-center py-4">No history yet</p>
                        )}
                    </div>
                </div>

                {/* Bottom: Preferences & Social Links */}
                <div className="p-3 border-t border-gray-800">
                    <button
                        onClick={() => setShowPreferences(true)}
                        className={`flex items-center gap-2 w-full p-2 mb-2 hover:bg-gray-800 rounded-lg 
                                  text-gray-400 hover:text-white transition-colors ${isOpen ? '' : 'justify-center'}`}
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {isOpen && <span className="text-sm">Preferences</span>}
                    </button>

                    <div className={`flex ${isOpen ? 'gap-2 justify-start' : 'flex-col gap-2 items-center'}`}>
                        <a href="https://github.com/assafelovic/gpt-researcher" target="_blank" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors" title="GitHub">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                        </a>
                        <a href="https://hub.docker.com/r/gptresearcher/gpt-researcher" target="_blank" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors" title="Docker">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" />
                            </svg>
                        </a>
                        <a href="https://discord.gg/gptresearcher" target="_blank" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors" title="Discord">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Preferences Modal */}
            <PreferencesModal
                isOpen={showPreferences}
                onClose={() => setShowPreferences(false)}
            />
        </>
    );
};

export default ChatSidebar;
