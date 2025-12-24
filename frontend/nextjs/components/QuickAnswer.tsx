'use client';

import React, { FC, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

type Source = {
    title: string;
    url: string;
    snippet: string;
};

type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type Props = {
    query: string;
    isLoading: boolean;
    answer: string;
    sources: Source[];
    error?: string;
    onFollowUp?: (question: string) => void;
    conversationHistory?: ConversationMessage[];
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

const QuickAnswer: FC<Props> = ({ query, isLoading, answer, sources, error, onFollowUp, conversationHistory = [] }) => {
    const answerRef = useRef<HTMLDivElement>(null);
    const [followUpInput, setFollowUpInput] = useState('');

    // Auto-scroll as answer streams in
    useEffect(() => {
        if (answerRef.current) {
            answerRef.current.scrollTop = answerRef.current.scrollHeight;
        }
    }, [answer, isLoading, conversationHistory]);

    const handleFollowUp = () => {
        if (followUpInput.trim() && onFollowUp) {
            onFollowUp(followUpInput.trim());
            setFollowUpInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFollowUp();
        }
    };

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/20 border border-red-500/30 rounded-lg p-3"
            >
                <p className="text-red-400 text-sm">❌ {error}</p>
            </motion.div>
        );
    }

    // Get previous messages (excluding current)
    const previousMessages = conversationHistory.slice(0, -2);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[900px] mx-auto"
        >
            {/* Sources - Compact inline */}
            <AnimatePresence>
                {sources.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-2"
                    >
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-gray-500">Sources:</span>
                            {sources.map((source, index) => (
                                <a
                                    key={index}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-800/60 hover:bg-gray-700 
                                             border border-gray-700/50 rounded text-xs transition-colors"
                                >
                                    <img src={getFavicon(source.url)} alt="" className="w-3 h-3" />
                                    <span className="text-gray-400 max-w-[100px] truncate">{source.title || new URL(source.url).hostname}</span>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Container */}
            <div
                ref={answerRef}
                className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 max-h-[400px] overflow-y-auto"
            >
                {/* Previous conversation */}
                {previousMessages.map((msg, idx) => (
                    <div key={idx} className="mb-2">
                        {msg.role === 'user' ? (
                            <p className="text-teal-400 text-sm"><strong>You:</strong> {msg.content}</p>
                        ) : (
                            <div className="text-gray-200 text-sm prose prose-sm prose-invert max-w-none 
                                          prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {previousMessages.length > 0 && <hr className="border-gray-700/50 my-2" />}

                {/* Current exchange */}
                <p className="text-teal-400 text-sm mb-1"><strong>You:</strong> {query}</p>

                {isLoading && !answer && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <span className="flex gap-0.5">
                            <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                            <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                        </span>
                        Searching...
                    </div>
                )}

                {answer && (
                    <div className="text-gray-200 text-sm prose prose-sm prose-invert max-w-none
                                  prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2">
                        <ReactMarkdown>{answer}</ReactMarkdown>
                        {isLoading && <span className="inline-block w-1 h-3 bg-teal-500 animate-pulse ml-0.5" />}
                    </div>
                )}
            </div>

            {/* Follow-up input */}
            {!isLoading && answer && onFollowUp && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                    <div className="flex items-center gap-2 p-2 bg-gray-800/40 border border-gray-700/50 rounded-lg">
                        <input
                            type="text"
                            value={followUpInput}
                            onChange={(e) => setFollowUpInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Follow-up question..."
                            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                        />
                        <button
                            onClick={handleFollowUp}
                            disabled={!followUpInput.trim()}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 
                                     disabled:text-gray-500 text-white text-xs font-medium rounded 
                                     transition-colors"
                        >
                            Send
                        </button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default QuickAnswer;
