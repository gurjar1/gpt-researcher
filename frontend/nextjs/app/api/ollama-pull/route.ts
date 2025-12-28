import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

        const response = await fetch(`${backendUrl}/api/ollama/pull`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error pulling Ollama model:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to pull model', model: '' },
            { status: 500 }
        );
    }
}
