'use client';

import React, { FC, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ChatSidebar from './ChatSidebar';
import FocusModeSelector, { FocusMode } from './FocusModeSelector';

type ChatSession = {
    id: string;
    title: string;
    messages: any[];
    createdAt: number;
};

type Props = {
    promptValue: string;
    setPromptValue: (value: string) => void;
    focusMode: FocusMode;
    onFocusModeChange: (mode: FocusMode) => void;
    onSubmit: (query: string) => void;
    onRestoreChat?: (messages: any[]) => void;
};

// Example suggestions
const SUGGESTIONS = [
    { icon: '📊', text: 'Stock analysis on' },
    { icon: '✈️', text: 'Help me plan an adventure to' },
    { icon: '📰', text: 'What are the latest news on' },
];

const QuickSearchHome: FC<Props> = ({
    promptValue,
    setPromptValue,
    focusMode,
    onFocusModeChange,
    onSubmit,
    onRestoreChat,
}) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const particlesContainerRef = useRef<HTMLDivElement>(null);

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

    // Create particle animations
    useEffect(() => {
        setIsVisible(true);

        if (particlesContainerRef.current) {
            const container = particlesContainerRef.current;
            const particleCount = window.innerWidth < 768 ? 15 : 30;

            container.innerHTML = '';

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');

                const size = Math.random() * 4 + 1;
                const posX = Math.random() * 100;
                const posY = Math.random() * 100;
                const duration = Math.random() * 50 + 20;
                const delay = Math.random() * 5;
                const opacity = Math.random() * 0.3 + 0.1;

                particle.className = 'absolute rounded-full bg-white';
                Object.assign(particle.style, {
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${posX}%`,
                    top: `${posY}%`,
                    opacity: opacity.toString(),
                    animation: `float ${duration}s ease-in-out ${delay}s infinite`,
                });

                container.appendChild(particle);
            }
        }

        return () => {
            if (particlesContainerRef.current) {
                particlesContainerRef.current.innerHTML = '';
            }
        };
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (promptValue.trim()) {
            onSubmit(promptValue.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSelectChat = (session: ChatSession) => {
        if (onRestoreChat) {
            onRestoreChat(session.messages);
        }
    };

    const handleHistoryChange = (newHistory: ChatSession[]) => {
        setChatHistory(newHistory);
    };

    const sidebarWidth = sidebarOpen ? 224 : 56;

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <ChatSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onNewChat={() => setPromptValue('')}
                history={chatHistory}
                onSelectChat={handleSelectChat}
                onHistoryChange={handleHistoryChange}
            />

            {/* Main Content with Gradient Background */}
            <div
                className="flex-1 relative overflow-hidden min-h-screen"
                style={{ marginLeft: sidebarWidth }}
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0d1117] via-[#0a1628] to-[#0d1117]" />

                {/* Radial gradient overlay */}
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(20,100,120,0.15),transparent_70%)]" />

                {/* Particle container */}
                <div ref={particlesContainerRef} className="absolute inset-0 -z-5 pointer-events-none" />

                {/* Content */}
                <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
                    <motion.div
                        initial="hidden"
                        animate={isVisible ? "visible" : "hidden"}
                        variants={fadeInUp}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-2xl"
                    >
                        {/* Title */}
                        <motion.h1
                            className="text-4xl font-bold text-center text-white mb-6"
                            variants={fadeInUp}
                            transition={{ delay: 0.1 }}
                        >
                            Vernix
                        </motion.h1>

                        {/* Focus Mode Selector */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ delay: 0.2 }}
                            className="mb-4"
                        >
                            <FocusModeSelector
                                selectedMode={focusMode}
                                onModeChange={onFocusModeChange}
                            />
                        </motion.div>

                        {/* Search Input */}
                        <motion.form
                            onSubmit={handleSubmit}
                            className="relative mb-6"
                            variants={fadeInUp}
                            transition={{ delay: 0.4 }}
                        >
                            <div className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-teal-500/50 via-cyan-500/40 to-blue-500/50 blur-md transition-opacity duration-300 ${isFocused ? 'opacity-60' : 'opacity-30'}`} />
                            <div className="relative flex items-start gap-3 px-4 py-4 bg-gray-900/90 border border-gray-700/50 rounded-xl">
                                <textarea
                                    value={promptValue}
                                    onChange={(e) => setPromptValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder="Enter your topic, question, or area of interest..."
                                    rows={2}
                                    className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base resize-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!promptValue.trim()}
                                    className="p-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 
                                             disabled:text-gray-500 text-white rounded-lg transition-colors mt-1"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </motion.form>

                        {/* Disclaimer */}
                        <motion.p
                            className="text-center text-gray-500 text-xs mb-6"
                            variants={fadeInUp}
                            transition={{ delay: 0.5 }}
                        >
                            Vernix may make mistakes. Verify important information and check sources.
                        </motion.p>

                        {/* Suggestions */}
                        <motion.div
                            className="flex flex-wrap gap-2 justify-center"
                            variants={fadeInUp}
                            transition={{ delay: 0.6 }}
                        >
                            {SUGGESTIONS.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPromptValue(suggestion.text)}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 
                                             bg-gray-800/60 hover:bg-gray-700/70 
                                             border border-gray-700/40 hover:border-gray-600/60 
                                             rounded-full transition-all duration-200"
                                >
                                    <span>{suggestion.icon}</span>
                                    <span>{suggestion.text}</span>
                                </button>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* CSS for particle float animation */}
            <style jsx global>{`
                @keyframes float {
                    0%, 100% {
                        transform: translate(0, 0) rotate(0deg);
                    }
                    25% {
                        transform: translate(10px, -15px) rotate(5deg);
                    }
                    50% {
                        transform: translate(-5px, 10px) rotate(-5deg);
                    }
                    75% {
                        transform: translate(-10px, -5px) rotate(3deg);
                    }
                }
            `}</style>
        </div>
    );
};

export default QuickSearchHome;
