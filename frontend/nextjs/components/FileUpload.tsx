'use client';

import React, { FC, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onTextExtracted: (text: string, filename: string) => void;
};

const FileUpload: FC<Props> = ({ isOpen, onClose, onTextExtracted }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supportedTypes = [
        { ext: '.pdf', type: 'application/pdf', icon: '📄' },
        { ext: '.txt', type: 'text/plain', icon: '📝' },
        { ext: '.md', type: 'text/markdown', icon: '📖' },
    ];

    const processFile = async (file: File) => {
        setIsProcessing(true);
        setError(null);

        try {
            if (file.type === 'application/pdf') {
                // For PDF, we'll use the backend to extract text
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/extract-text', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Failed to extract text from PDF');
                }

                const data = await response.json();
                onTextExtracted(data.text, file.name);
            } else {
                // For text files, read directly
                const text = await file.text();
                onTextExtracted(text, file.name);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process file');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Upload Document</h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging
                                ? 'border-teal-500 bg-teal-500/10'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                    >
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-gray-400">Processing document...</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-4xl mb-3">📁</div>
                                <p className="text-gray-300 mb-2">
                                    Drag & drop a file here, or{' '}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-teal-400 hover:text-teal-300 underline"
                                    >
                                        browse
                                    </button>
                                </p>
                                <p className="text-xs text-gray-500">
                                    Supported: {supportedTypes.map(t => t.ext).join(', ')}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Supported Types */}
                    <div className="mt-4 flex justify-center gap-4">
                        {supportedTypes.map((type) => (
                            <div key={type.ext} className="flex items-center gap-1 text-gray-500 text-xs">
                                <span>{type.icon}</span>
                                <span>{type.ext}</span>
                            </div>
                        ))}
                    </div>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FileUpload;
