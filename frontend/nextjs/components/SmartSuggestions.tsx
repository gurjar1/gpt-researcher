'use client';

import React, { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Props = {
    query: string;
    answer: string;
    onSelect: (suggestion: string) => void;
    isVisible: boolean;
};

// AI-powered suggestion generation
const generateAISuggestions = async (query: string, answer: string): Promise<string[]> => {
    try {
        const selectedBackend = localStorage.getItem('selectedBackend') || 'ollama';
        const backendUrl = localStorage.getItem('backendUrl') || 'http://localhost:11434';
        const selectedModel = localStorage.getItem('selectedModel') || 'llama3.1';

        const prompt = `Based on this Q&A, generate exactly 4 short follow-up questions the user might ask next.

Question: ${query}
Answer: ${answer.slice(0, 500)}

Output ONLY the 4 questions, one per line, no numbering or bullets. Keep each under 50 characters.`;

        // Use OpenAI-compatible API
        const apiUrl = selectedBackend === 'ollama'
            ? `${backendUrl}/api/generate`
            : `${backendUrl}/v1/chat/completions`;

        if (selectedBackend === 'ollama') {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 150 }
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const lines = data.response.split('\n').filter((l: string) => l.trim().length > 5);
                return lines.slice(0, 4);
            }
        } else {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 150,
                    temperature: 0.7,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.choices[0]?.message?.content || '';
                const lines = content.split('\n').filter((l: string) => l.trim().length > 5);
                return lines.slice(0, 4);
            }
        }
    } catch (e) {
        console.error('Failed to generate AI suggestions:', e);
    }

    // Fallback suggestions if AI fails
    return [
        `Tell me more about ${query.split(' ').slice(0, 3).join(' ')}`,
        'What are the alternatives?',
        'Can you explain in more detail?',
        'What are the pros and cons?'
    ];
};

const SmartSuggestions: FC<Props> = ({ query, answer, onSelect, isVisible }) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isVisible && query && answer) {
            setLoading(true);
            generateAISuggestions(query, answer)
                .then(setSuggestions)
                .finally(() => setLoading(false));
        }
    }, [isVisible, query, answer]);

    if (!isVisible) return null;

    if (loading) {
        return (
            <div className="mt-4 flex items-center gap-2 text-gray-500 text-xs">
                <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                Generating suggestions...
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-wrap gap-2"
        >
            <span className="text-xs text-gray-500 mr-2 self-center">Related:</span>
            {suggestions.map((suggestion, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSelect(suggestion)}
                    className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 
                             rounded-full text-xs text-gray-300 hover:text-white transition-colors"
                >
                    {suggestion}
                </motion.button>
            ))}
        </motion.div>
    );
};

export default SmartSuggestions;

