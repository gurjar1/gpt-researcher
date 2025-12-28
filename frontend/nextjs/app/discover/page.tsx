'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ChatSidebar from '../../components/ChatSidebar';

type TrendingTopic = {
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
};

// Sample trending topics - in production, fetch from an API
const TRENDING_TOPICS: TrendingTopic[] = [
    { id: '1', title: 'AI Agents 2025', description: 'The rise of autonomous AI agents and their applications', category: 'Technology', icon: '🤖' },
    { id: '2', title: 'Web3 Gaming', description: 'How blockchain is transforming the gaming industry', category: 'Gaming', icon: '🎮' },
    { id: '3', title: 'Climate Tech', description: 'Innovations in sustainable technology and clean energy', category: 'Environment', icon: '🌍' },
    { id: '4', title: 'Quantum Computing', description: 'Recent breakthroughs in quantum computing research', category: 'Science', icon: '⚛️' },
    { id: '5', title: 'Space Exploration', description: 'Latest missions and discoveries in space', category: 'Science', icon: '🚀' },
    { id: '6', title: 'Cybersecurity Trends', description: 'Emerging threats and protection strategies', category: 'Security', icon: '🔒' },
    { id: '7', title: 'Remote Work Tools', description: 'Best tools for distributed teams in 2025', category: 'Productivity', icon: '💼' },
    { id: '8', title: 'Mental Health Tech', description: 'Apps and devices for mental wellness', category: 'Health', icon: '🧠' },
];

const CATEGORIES = ['All', 'Technology', 'Science', 'Gaming', 'Environment', 'Security', 'Health', 'Productivity'];

export default function DiscoverPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const filteredTopics = selectedCategory === 'All'
        ? TRENDING_TOPICS
        : TRENDING_TOPICS.filter(t => t.category === selectedCategory);

    const sidebarWidth = sidebarOpen ? '14rem' : '3.5rem';

    const handleSelectTopic = (topic: string) => {
        // Store query in localStorage and navigate to home
        localStorage.setItem('pendingQuery', topic);
        router.push('/');
    };

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <ChatSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onNewChat={() => router.push('/')}
                history={[]}
                onSelectChat={() => { }}
            />

            <div
                className="flex-1 p-8 transition-all duration-300"
                style={{ marginLeft: sidebarWidth }}
            >
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">🔬 Discover</h1>
                        <p className="text-gray-400">Explore trending topics and start researching</p>
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        {CATEGORIES.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm transition-colors ${selectedCategory === category
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Topics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTopics.map((topic, idx) => (
                            <motion.button
                                key={topic.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => handleSelectTopic(topic.title)}
                                className="p-5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 
                                         rounded-xl text-left transition-colors group"
                            >
                                <div className="flex items-start gap-4">
                                    <span className="text-3xl">{topic.icon}</span>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white group-hover:text-teal-400 transition-colors">
                                            {topic.title}
                                        </h3>
                                        <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                                        <span className="inline-block mt-2 text-xs text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded">
                                            {topic.category}
                                        </span>
                                    </div>
                                    <svg
                                        className="w-5 h-5 text-gray-600 group-hover:text-teal-400 transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* Daily Picks */}
                    <div className="mt-12">
                        <h2 className="text-xl font-bold text-white mb-4">📰 Today's Picks</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {TRENDING_TOPICS.slice(0, 3).map((topic) => (
                                <button
                                    key={`daily-${topic.id}`}
                                    onClick={() => handleSelectTopic(`Latest news about ${topic.title}`)}
                                    className="p-4 bg-gradient-to-br from-teal-900/30 to-cyan-900/30 
                                             border border-teal-500/20 rounded-xl text-left hover:border-teal-500/50 transition-colors"
                                >
                                    <span className="text-2xl">{topic.icon}</span>
                                    <p className="text-white font-medium mt-2">{topic.title}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
