'use client';

import React, { FC, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onFileContent: (content: string, filename: string) => void;
};

const FileUploadModal: FC<Props> = ({ isOpen, onClose, onFileContent }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processFile = async (file: File) => {
        setProcessing(true);
        setError(null);

        try {
            const extension = file.name.split('.').pop()?.toLowerCase();

            if (extension === 'txt' || extension === 'md') {
                const text = await file.text();
                onFileContent(text, file.name);
                onClose();
            } else if (extension === 'pdf') {
                // For PDF, try to use backend extraction
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch('/api/extract-text', {
                        method: 'POST',
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        onFileContent(data.text, file.name);
                        onClose();
                    } else {
                        setError('PDF extraction failed. Try a TXT or MD file.');
                    }
                } catch {
                    setError('PDF extraction not available. Use TXT or MD files.');
                }
            } else {
                setError('Unsupported file type. Use PDF, TXT, or MD files.');
            }
        } catch (err) {
            setError('Failed to read file. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

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
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Upload File</h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${isDragging
                                ? 'border-teal-500 bg-teal-500/10'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                    >
                        {processing ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-gray-400">Processing file...</p>
                            </div>
                        ) : (
                            <>
                                <svg
                                    className="w-12 h-12 mx-auto mb-4 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                                <p className="text-gray-300 mb-2">
                                    Drag and drop a file here
                                </p>
                                <p className="text-gray-500 text-sm mb-4">
                                    or click to browse
                                </p>
                                <input
                                    type="file"
                                    accept=".pdf,.txt,.md"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg cursor-pointer transition-colors"
                                >
                                    Choose File
                                </label>
                                <p className="text-xs text-gray-500 mt-3">
                                    Supported: PDF, TXT, MD
                                </p>
                            </>
                        )}
                    </div>

                    {error && (
                        <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FileUploadModal;
