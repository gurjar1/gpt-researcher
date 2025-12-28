import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // For PDF files, we'll use a simple text extraction approach
        // In production, you'd want to use pdf-parse or similar on the server
        if (file.type === 'application/pdf') {
            // Send to backend for processing
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const backendFormData = new FormData();
            backendFormData.append('file', file);

            try {
                const response = await fetch(`${backendUrl}/api/extract-pdf`, {
                    method: 'POST',
                    body: backendFormData,
                });

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json({ text: data.text, filename: file.name });
                }
            } catch {
                // If backend fails, return error
            }

            // Fallback: just return a message that PDF extraction needs backend
            return NextResponse.json(
                { text: `[PDF: ${file.name}] - PDF text extraction requires backend service.`, filename: file.name }
            );
        }

        // For text files, read directly
        const text = await file.text();
        return NextResponse.json({ text, filename: file.name });

    } catch (error) {
        console.error('Error extracting text:', error);
        return NextResponse.json(
            { error: 'Failed to process file' },
            { status: 500 }
        );
    }
}
