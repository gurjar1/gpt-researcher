'use client';

import React, { FC, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ChatSidebar from './ChatSidebar';
import SmartSuggestions from './SmartSuggestions';

type Source = {
    title: string;
    url: string;
    snippet: string;
};

type Message = {
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
};

type ChatSession = {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
};

type Props = {
    messages: Message[];
    currentAnswer: string;
    currentSources: Source[];
    isLoading: boolean;
    error?: string;
    onSendMessage: (message: string) => void;
    onEditMessage?: (index: number, newContent: string) => void;
    onNewChat: () => void;
    onRestoreChat?: (messages: Message[]) => void;
};

// Extract favicon from URL
const getFavicon = (url: string): string => {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
        return '/img/web.svg';
    }
};

// Validate and render citations - only link to valid sources
const renderWithCitations = (text: string, sources: Source[]) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, idx) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
            const num = parseInt(match[1]);
            const source = sources[num - 1];
            if (source) {
                return (
                    <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[10px] 
                                 bg-teal-600 hover:bg-teal-500 text-white rounded-full
                                 transition-colors cursor-pointer no-underline align-middle"
                        title={source.title}
                    >
                        {num}
                    </a>
                );
            } else {
                // Invalid citation - render as gray (not clickable)
                return (
                    <span
                        key={idx}
                        className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[10px] 
                                 bg-gray-600 text-gray-400 rounded-full align-middle"
                        title="Source not available"
                    >
                        {num}
                    </span>
                );
            }
        }
        return <span key={idx}>{part}</span>;
    });
};

// User message bubble with edit support
const UserBubble: FC<{
    content: string;
    onEdit?: (newContent: string) => void;
    canEdit?: boolean;
}> = ({ content, onEdit, canEdit = true }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    const [showEditConfirm, setShowEditConfirm] = useState(false);

    const handleSubmit = () => {
        if (editContent.trim() && editContent !== content && onEdit) {
            onEdit(editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditContent(content);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end mb-4 group"
        >
            <div className="max-w-[75%] px-4 py-2.5 bg-teal-600/20 border border-teal-500/30 rounded-2xl rounded-br-md relative">
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-teal-500 resize-none"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-100">{content}</p>
                )}
            </div>
        </motion.div>
    );
};

// Extract hostname helper
const getHostname = (url: string): string => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

// Strip LLM-generated References/Sources/Citations section from content
const stripReferencesFromContent = (content: string): string => {
    // Expanded patterns to catch various reference section headers
    const patterns = [
        // Match "References:", "**References:**", "Sources:", "Citations:", "Bibliography:"
        /\n+(?:\*{0,2})(?:References|Sources|Citations|Bibliography)(?:\*{0,2}):?\s*\n[\s\S]*/i,
        // Match markdown headers "### References", "## Sources", etc.
        /\n+#{1,3}\s*(?:References|Sources|Citations|Bibliography)[\s\S]*/i,
        // Match separator + references (e.g., "---\nReferences")
        /\n+[-_]{3,}\s*\n+(?:\*{0,2})(?:References|Sources|Citations|Bibliography)[\s\S]*/i,
        // Match numbered list that starts with "[1]" at end (common LLM pattern)
        /\n{2,}\[\d+\]\s+https?:\/\/[\s\S]*$/i,
    ];
    let cleaned = content;
    for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.trim();
};

// AI message bubble with inline references
const AIBubble: FC<{ content: string; sources: Source[]; isStreaming?: boolean }> = ({
    content, sources = [], isStreaming
}) => {
    // Clean content by removing LLM-generated References section
    const cleanedContent = isStreaming ? content : stripReferencesFromContent(content);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
        >
            <div className="max-w-[85%] px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-2xl rounded-bl-md">
                <div className="text-sm text-gray-200 prose prose-sm prose-invert max-w-none
                          prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 
                          prose-headings:my-2 prose-code:bg-gray-700 prose-code:px-1 prose-code:rounded
                          prose-strong:text-teal-300">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ children }) => (
                                <p className="my-1.5">
                                    {React.Children.map(children, child => {
                                        if (typeof child === 'string') {
                                            return renderWithCitations(child, sources);
                                        }
                                        return child;
                                    })}
                                </p>
                            ),
                            li: ({ children }) => (
                                <li>
                                    {React.Children.map(children, child => {
                                        if (typeof child === 'string') {
                                            return renderWithCitations(child, sources);
                                        }
                                        return child;
                                    })}
                                </li>
                            ),
                        }}
                    >
                        {cleanedContent}
                    </ReactMarkdown>
                    {isStreaming && <span className="inline-block w-1.5 h-4 bg-teal-500 animate-pulse ml-1" />}
                </div>

                {/* Inline References section with divider */}
                {!isStreaming && sources && sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-600/50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">References</p>
                        <div className="space-y-1.5">
                            {sources.map((source, idx) => (
                                <div key={idx} className="text-xs">
                                    <span className="text-gray-500">[{idx + 1}]</span>{' '}
                                    <span className="text-gray-400">{getHostname(source.url)}.</span>{' '}
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-400 hover:text-teal-300 transition-colors"
                                    >
                                        {source.title || 'Untitled'}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
// Bottom References Section with site name, date, title, link
const ReferencesSection: FC<{ sources: Source[] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    // Extract hostname from URL
    const getHostname = (url: string): string => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    };

    return (
        <div className="mb-6 p-5 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <h3 className="text-base font-bold text-white mb-4">References</h3>
            <div className="space-y-3">
                {sources.map((source, idx) => (
                    <div key={idx} className="text-sm">
                        <p className="text-gray-300">
                            <span className="text-gray-500">[{idx + 1}]</span>{' '}
                            <span className="text-gray-400">{getHostname(source.url)}.</span>{' '}
                            <span className="text-white font-medium">{source.title || 'Untitled'}</span>
                        </p>
                        <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:text-teal-300 text-xs break-all transition-colors ml-5"
                        >
                            {source.url}
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

const QuickAnswer: FC<Props> = ({
    messages,
    currentAnswer,
    currentSources,
    isLoading,
    error,
    onSendMessage,
    onEditMessage,
    onNewChat,
    onRestoreChat,
}) => {
    const chatRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>('');

    // Load chat history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('quickChatHistory');
        if (saved) {
            try {
                setChatHistory(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load chat history', e);
            }
        }
    }, []);

    // Save current chat when messages change
    useEffect(() => {
        if (messages.length >= 2) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            const title = firstUserMsg?.content.slice(0, 25) + '...' || 'New Chat';
            const sessionId = currentSessionId || `chat_${Date.now()}`;

            if (!currentSessionId) {
                setCurrentSessionId(sessionId);
            }

            setChatHistory(prev => {
                const existing = prev.find(s => s.id === sessionId);
                let updated;
                if (existing) {
                    updated = prev.map(s => s.id === sessionId ? { ...s, messages, title } : s);
                } else {
                    updated = [{ id: sessionId, title, messages, createdAt: Date.now() }, ...prev].slice(0, 20);
                }
                localStorage.setItem('quickChatHistory', JSON.stringify(updated));
                return updated;
            });
        }
    }, [messages, currentSessionId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages, currentAnswer, isLoading]);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSelectChat = (session: ChatSession) => {
        setCurrentSessionId(session.id);
        if (onRestoreChat) {
            onRestoreChat(session.messages);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId('');
        onNewChat();
    };

    // Get sources for references section
    const allSources = messages
        .filter(m => m.role === 'assistant' && m.sources)
        .flatMap(m => m.sources || []);
    const latestSources = currentSources.length > 0 ? currentSources : allSources.slice(-5);

    const sidebarWidth = sidebarOpen ? 224 : 56;

    return (
        <div className="flex min-h-screen bg-[#0d1117]">
            {/* Shared Sidebar */}
            <ChatSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onNewChat={handleNewChat}
                history={chatHistory}
                onSelectChat={handleSelectChat}
                currentSessionId={currentSessionId}
            />

            {/* Main Chat Area */}
            <div
                className="flex flex-col min-h-screen flex-1 transition-all duration-300"
                style={{ marginLeft: sidebarWidth }}
            >
                {/* Scrollable Chat Area */}
                <div
                    ref={chatRef}
                    className="flex-1 overflow-y-auto px-4 pt-6 pb-32"
                >
                    <div className="max-w-3xl mx-auto">
                        {/* Error display */}
                        {error && (
                            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
                                <p className="text-red-400 text-sm">❌ {error}</p>
                            </div>
                        )}

                        {/* Messages */}
                        {messages.map((msg, idx) => (
                            msg.role === 'user'
                                ? <UserBubble
                                    key={idx}
                                    content={msg.content}
                                    onEdit={onEditMessage ? (newContent) => onEditMessage(idx, newContent) : undefined}
                                    canEdit={!isLoading}
                                />
                                : <AIBubble key={idx} content={msg.content} sources={msg.sources || []} />
                        ))}

                        {/* Current streaming response */}
                        {isLoading && (
                            currentAnswer ? (
                                <AIBubble content={currentAnswer} sources={currentSources} isStreaming={true} />
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start mb-4"
                                >
                                    <div className="px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-2xl rounded-bl-md">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <span className="flex gap-1">
                                                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                                                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                            </span>
                                            Searching...
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        )}

                        {/* Smart Suggestions - shown after last AI response when not loading */}
                        {!isLoading && messages.length >= 2 && messages[messages.length - 1]?.role === 'assistant' && (
                            <SmartSuggestions
                                query={messages.filter(m => m.role === 'user').pop()?.content || ''}
                                answer={messages[messages.length - 1].content}
                                onSelect={(suggestion) => onSendMessage(suggestion)}
                                isVisible={true}
                            />
                        )}

                        {/* References are now shown inline with each message bubble */}
                    </div>
                </div>

                {/* Fixed Input Footer */}
                <div
                    className="fixed bottom-0 bg-[#0d1117] border-t border-gray-800 py-4 px-4 z-40"
                    style={{
                        left: sidebarWidth,
                        right: 0,
                    }}
                >
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-xl">
                            {/* Attachment button */}
                            <button
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.txt,.md';
                                    input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                            const text = await file.text();
                                            onSendMessage(`[Attached: ${file.name}]\n\n${text.slice(0, 2000)}${text.length > 2000 ? '...(truncated)' : ''}`);
                                        }
                                    };
                                    input.click();
                                }}
                                className="p-2 text-gray-400 hover:text-teal-400 transition-colors"
                                title="Attach file (PDF, TXT, MD)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>

                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a follow-up question..."
                                disabled={isLoading}
                                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                            />

                            {/* Export button - only show when there are messages */}
                            {messages.length > 0 && (
                                <button
                                    onClick={async () => {
                                        const { exportToPDF } = await import('../utils/exportPdf');
                                        const lastAI = messages.filter(m => m.role === 'assistant').pop();
                                        if (lastAI) {
                                            exportToPDF(lastAI.content, lastAI.sources || [], 'vernix-export');
                                        }
                                    }}
                                    className="p-2 text-gray-400 hover:text-teal-400 transition-colors"
                                    title="Export to PDF"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </button>
                            )}

                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="p-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 
                                         disabled:text-gray-500 text-white rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickAnswer;
