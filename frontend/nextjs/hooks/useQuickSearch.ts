'use client';

import { useState, useCallback, useRef } from 'react';

type Source = {
    title: string;
    url: string;
    snippet: string;
};

type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type QuickSearchState = {
    isLoading: boolean;
    answer: string;
    sources: Source[];
    query: string;
    error: string | null;
    conversationHistory: ConversationMessage[];
};

type UseQuickSearchReturn = QuickSearchState & {
    search: (query: string, focusMode?: string) => Promise<void>;
    reset: () => void;
    clearHistory: () => void;
};

export function useQuickSearch(): UseQuickSearchReturn {
    const [state, setState] = useState<QuickSearchState>({
        isLoading: false,
        answer: '',
        sources: [],
        query: '',
        error: null,
        conversationHistory: [],
    });

    // Use ref to access current history in callback without stale closure
    const historyRef = useRef<ConversationMessage[]>([]);

    const reset = useCallback(() => {
        setState({
            isLoading: false,
            answer: '',
            sources: [],
            query: '',
            error: null,
            conversationHistory: [],
        });
        historyRef.current = [];
    }, []);

    const clearHistory = useCallback(() => {
        setState(prev => ({ ...prev, conversationHistory: [] }));
        historyRef.current = [];
    }, []);

    const search = useCallback(async (query: string, focusMode: string = 'quick') => {
        // Add user message to history
        const userMessage: ConversationMessage = { role: 'user', content: query };
        const currentHistory = [...historyRef.current, userMessage];
        historyRef.current = currentHistory;

        setState(prev => ({
            ...prev,
            isLoading: true,
            answer: '',
            sources: [],
            query,
            error: null,
            conversationHistory: currentHistory,
        }));

        let fullAnswer = '';

        try {
            const response = await fetch('/api/quick-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    num_results: 5,
                    model: 'llama3.1',
                    focus_mode: focusMode,
                    conversation_history: currentHistory.slice(-6), // Send last 6 messages
                }),
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process SSE events
                const events = buffer.split('\n\n');
                buffer = events.pop() || ''; // Keep incomplete event in buffer

                for (const event of events) {
                    if (event.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(event.slice(6));

                            if (data.type === 'sources') {
                                setState(prev => ({
                                    ...prev,
                                    sources: data.sources,
                                    query: data.query,
                                }));
                            } else if (data.type === 'chunk') {
                                fullAnswer += data.content;
                                setState(prev => ({
                                    ...prev,
                                    answer: prev.answer + data.content,
                                }));
                            } else if (data.type === 'done') {
                                // Add assistant response to history
                                const assistantMessage: ConversationMessage = { role: 'assistant', content: fullAnswer };
                                historyRef.current = [...historyRef.current, assistantMessage];

                                setState(prev => ({
                                    ...prev,
                                    isLoading: false,
                                    conversationHistory: historyRef.current,
                                }));
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE event:', e);
                        }
                    }
                }
            }

            // Final state update
            setState(prev => ({
                ...prev,
                isLoading: false,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Search failed',
            }));
        }
    }, []);

    return {
        ...state,
        search,
        reset,
        clearHistory,
    };
}
