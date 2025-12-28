'use client';

import { useState, useCallback, useRef } from 'react';
import { getSourceCountSettings, getSelectedModel } from '../components/PreferencesModal';

type Source = {
    title: string;
    url: string;
    snippet: string;
};

type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
};

type QuickSearchState = {
    isLoading: boolean;
    currentAnswer: string;
    sources: Source[];
    query: string;
    error: string | null;
    messages: ConversationMessage[];
};

type UseQuickSearchReturn = QuickSearchState & {
    search: (query: string, focusMode?: string) => Promise<void>;
    reset: () => void;
    restoreMessages: (messages: ConversationMessage[]) => void;
    abortSearch: () => void;
    editMessage: (index: number, newContent: string) => void;
};

export function useQuickSearch(): UseQuickSearchReturn {
    const [state, setState] = useState<QuickSearchState>({
        isLoading: false,
        currentAnswer: '',
        sources: [],
        query: '',
        error: null,
        messages: [],
    });

    const messagesRef = useRef<ConversationMessage[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentSearchIdRef = useRef<string>('');

    const reset = useCallback(() => {
        // Abort any ongoing search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        currentSearchIdRef.current = '';
        setState({
            isLoading: false,
            currentAnswer: '',
            sources: [],
            query: '',
            error: null,
            messages: [],
        });
        messagesRef.current = [];
    }, []);

    const restoreMessages = useCallback((messages: ConversationMessage[]) => {
        // Abort any ongoing search when restoring
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        currentSearchIdRef.current = '';
        messagesRef.current = messages;
        setState(prev => ({
            ...prev,
            isLoading: false,
            messages,
            currentAnswer: '',
            sources: [],
            error: null,
        }));
    }, []);

    const abortSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setState(prev => ({
            ...prev,
            isLoading: false,
        }));
    }, []);

    const editMessage = useCallback((index: number, newContent: string) => {
        // Edit user message at index and remove all messages after it
        const updatedMessages = messagesRef.current.slice(0, index);
        updatedMessages.push({
            role: 'user' as const,
            content: newContent,
        });
        messagesRef.current = updatedMessages;
        setState(prev => ({
            ...prev,
            messages: updatedMessages,
        }));
    }, []);


    const search = useCallback(async (query: string, focusMode: string = 'quick') => {
        // Abort any ongoing search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller and search ID
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        const searchId = `search_${Date.now()}_${Math.random()}`;
        currentSearchIdRef.current = searchId;

        // Add user message to history immediately
        const userMessage: ConversationMessage = { role: 'user', content: query };
        const updatedMessages = [...messagesRef.current, userMessage];
        messagesRef.current = updatedMessages;

        // Start loading
        setState(prev => ({
            ...prev,
            isLoading: true,
            currentAnswer: '',
            query,
            error: null,
            messages: updatedMessages,
        }));

        let fullAnswer = '';
        let newSources: Source[] = [];

        try {
            // Get source count and model from user preferences
            const sourceSettings = getSourceCountSettings();
            const numResults = sourceSettings[focusMode as keyof typeof sourceSettings] || 7;
            const selectedModel = getSelectedModel();

            const response = await fetch('/api/quick-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    num_results: numResults,
                    model: selectedModel,
                    focus_mode: focusMode,
                    conversation_history: updatedMessages.slice(-6),
                }),
                signal: abortController.signal,
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
                // Check if this search was aborted or replaced
                if (currentSearchIdRef.current !== searchId) {
                    reader.cancel();
                    return;
                }

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const event of events) {
                    // Double-check we're still the active search
                    if (currentSearchIdRef.current !== searchId) {
                        return;
                    }

                    if (event.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(event.slice(6));

                            if (data.type === 'sources') {
                                newSources = data.sources;
                                setState(prev => ({
                                    ...prev,
                                    sources: data.sources,
                                }));
                            } else if (data.type === 'chunk') {
                                fullAnswer += data.content;
                                setState(prev => ({
                                    ...prev,
                                    currentAnswer: fullAnswer,
                                }));
                            } else if (data.type === 'done') {
                                // Add assistant message with sources to history
                                const assistantMessage: ConversationMessage = {
                                    role: 'assistant',
                                    content: fullAnswer,
                                    sources: newSources,
                                };
                                messagesRef.current = [...messagesRef.current, assistantMessage];

                                setState(prev => ({
                                    ...prev,
                                    isLoading: false,
                                    messages: messagesRef.current,
                                }));
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE event:', e);
                        }
                    }
                }
            }

            // Final state update (only if still the active search)
            if (currentSearchIdRef.current === searchId) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                }));
            }
        } catch (error) {
            // Only update state if this is still the active search
            if (currentSearchIdRef.current === searchId) {
                if (error instanceof Error && error.name === 'AbortError') {
                    // Silently ignore aborted requests
                    return;
                }
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error instanceof Error ? error.message : 'Search failed',
                }));
            }
        }
    }, []);

    return {
        ...state,
        search,
        reset,
        restoreMessages,
        abortSearch,
        editMessage,
    };
}
