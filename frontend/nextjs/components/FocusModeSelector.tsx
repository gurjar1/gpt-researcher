'use client';

import React, { FC } from 'react';
import { motion } from 'framer-motion';

export type FocusMode = 'quick' | 'reddit' | 'news' | 'shopping' | 'research' | 'deep';

type FocusModeConfig = {
    id: FocusMode;
    icon: string;
    label: string;
    description: string;
    color: string;
};

const focusModes: FocusModeConfig[] = [
    {
        id: 'quick',
        icon: '⚡',
        label: 'Quick',
        description: 'Fast answer with web search',
        color: 'from-amber-500/30 to-orange-500/30 border-amber-500/40 hover:border-amber-500/60',
    },
    {
        id: 'reddit',
        icon: '💬',
        label: 'Reddit',
        description: 'Community opinions & discussions',
        color: 'from-orange-600/30 to-red-500/30 border-orange-500/40 hover:border-orange-500/60',
    },
    {
        id: 'news',
        icon: '📰',
        label: 'News',
        description: 'Latest news & current events',
        color: 'from-blue-500/30 to-indigo-500/30 border-blue-500/40 hover:border-blue-500/60',
    },
    {
        id: 'shopping',
        icon: '🛒',
        label: 'Shopping',
        description: 'Compare prices & find deals',
        color: 'from-green-500/30 to-emerald-500/30 border-green-500/40 hover:border-green-500/60',
    },
    {
        id: 'research',
        icon: '📄',
        label: 'Research',
        description: 'Detailed report with citations',
        color: 'from-teal-500/30 to-cyan-500/30 border-teal-500/40 hover:border-teal-500/60',
    },
    {
        id: 'deep',
        icon: '🔬',
        label: 'Deep',
        description: 'Multi-agent comprehensive research',
        color: 'from-purple-500/30 to-indigo-500/30 border-purple-500/40 hover:border-purple-500/60',
    },
];

type Props = {
    selectedMode: FocusMode;
    onModeChange: (mode: FocusMode) => void;
};

const FocusModeSelector: FC<Props> = ({ selectedMode, onModeChange }) => {
    return (
        <div className="flex flex-col items-center gap-3 mb-6">
            <span className="text-gray-400 text-sm">Focus Mode</span>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {focusModes.map((mode) => (
                    <motion.button
                        key={mode.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onModeChange(mode.id)}
                        className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-xl
              border backdrop-blur-sm transition-all duration-300
              ${selectedMode === mode.id
                                ? `bg-gradient-to-r ${mode.color} ring-2 ring-white/20`
                                : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70'
                            }
            `}
                    >
                        <span className="text-lg">{mode.icon}</span>
                        <div className="flex flex-col items-start">
                            <span className={`text-sm font-medium ${selectedMode === mode.id ? 'text-white' : 'text-gray-300'}`}>
                                {mode.label}
                            </span>
                            <span className="text-xs text-gray-500 hidden sm:block">
                                {mode.description}
                            </span>
                        </div>

                        {/* Selected indicator */}
                        {selectedMode === mode.id && (
                            <motion.div
                                layoutId="focusModeIndicator"
                                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"
                                initial={false}
                            />
                        )}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default FocusModeSelector;
