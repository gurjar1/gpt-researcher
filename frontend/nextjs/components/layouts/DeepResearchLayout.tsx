'use client';

import { ReactNode, useRef, useState, useEffect, Dispatch, SetStateAction } from "react";
import { Toaster } from "react-hot-toast";
import ChatSidebar from "@/components/ChatSidebar";
import { ChatBoxSettings } from "@/types/data";

type ChatSession = {
    id: string;
    title: string;
    messages: any[];
    createdAt: number;
};

interface DeepResearchLayoutProps {
    children: ReactNode;
    loading: boolean;
    isStopped: boolean;
    showResult: boolean;
    onStop?: () => void;
    onNewResearch: () => void;
    chatBoxSettings: ChatBoxSettings;
    setChatBoxSettings: Dispatch<SetStateAction<ChatBoxSettings>>;
    mainContentRef?: React.RefObject<HTMLDivElement>;
    showScrollButton?: boolean;
    onScrollToBottom?: () => void;
    toastOptions?: object;
}

export default function DeepResearchLayout({
    children,
    loading,
    isStopped,
    showResult,
    onStop,
    onNewResearch,
    chatBoxSettings,
    setChatBoxSettings,
    mainContentRef,
    showScrollButton = false,
    onScrollToBottom,
    toastOptions = {}
}: DeepResearchLayoutProps) {
    const defaultRef = useRef<HTMLDivElement>(null);
    const contentRef = mainContentRef || defaultRef;
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

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

    const handleHistoryChange = (newHistory: ChatSession[]) => {
        setChatHistory(newHistory);
    };

    const sidebarWidth = sidebarOpen ? 224 : 56;

    return (
        <main className="flex min-h-screen bg-[#0d1117]">
            <Toaster
                position="bottom-center"
                toastOptions={toastOptions}
            />

            {/* ChatSidebar */}
            <ChatSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onNewChat={onNewResearch}
                history={chatHistory}
                onSelectChat={() => { }} // Placeholder - research history is separate
                onHistoryChange={handleHistoryChange}
            />

            {/* Main Content */}
            <div
                ref={contentRef}
                className="flex-1 min-h-screen transition-all duration-300"
                style={{ marginLeft: sidebarWidth }}
            >
                {children}
            </div>

            {showScrollButton && showResult && (
                <button
                    onClick={onScrollToBottom}
                    className="fixed bottom-8 right-8 flex items-center justify-center w-12 h-12 text-white bg-gradient-to-br from-teal-500 to-teal-600 rounded-full hover:from-teal-600 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg z-50 backdrop-blur-sm border border-teal-400/20"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                    </svg>
                </button>
            )}
        </main>
    );
}
