'use client';

import React, { FC } from 'react';
import { motion } from 'framer-motion';

export type FocusMode = 'quick' | 'reddit' | 'news' | 'shopping' | 'deep';

type FocusModeConfig = {
    id: FocusMode;
    icon: string;
    label: string;
    color: string;
};

// 5 modes: Quick, Reddit, News, Shopping, Deep
const focusModes: FocusModeConfig[] = [
    {
        id: 'quick',
        icon: '⚡',
        label: 'Quick',
        color: 'from-amber-500/30 to-orange-500/30 border-amber-500/40',
    },
    {
        id: 'reddit',
        icon: '💬',
        label: 'Reddit',
        color: 'from-orange-600/30 to-red-500/30 border-orange-500/40',
    },
    {
        id: 'news',
        icon: '📰',
        label: 'News',
        color: 'from-blue-500/30 to-indigo-500/30 border-blue-500/40',
    },
    {
        id: 'shopping',
        icon: '🛒',
        label: 'Shopping',
        color: 'from-green-500/30 to-emerald-500/30 border-green-500/40',
    },
    {
        id: 'deep',
        icon: '🔬',
        label: 'Deep',
        color: 'from-purple-500/30 to-indigo-500/30 border-purple-500/40',
    },
];

type Props = {
    selectedMode: FocusMode;
    onModeChange: (mode: FocusMode) => void;
};

const FocusModeSelector: FC<Props> = ({ selectedMode, onModeChange }) => {
    return (
        <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
                {focusModes.map((mode) => (
                    <motion.button
                        key={mode.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onModeChange(mode.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm
                            transition-all duration-200
                            ${selectedMode === mode.id
                                ? `bg-gradient-to-r ${mode.color} text-white ring-1 ring-white/20`
                                : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-800/60'
                            }
                        `}
                    >
                        <span>{mode.icon}</span>
                        <span className="font-medium">{mode.label}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default FocusModeSelector;
