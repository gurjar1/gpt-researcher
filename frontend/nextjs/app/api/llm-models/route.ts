import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const backend = searchParams.get('backend') || 'ollama';
        const url = searchParams.get('url') || '';

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const queryParams = new URLSearchParams({ backend });
        if (url) queryParams.set('url', url);

        const response = await fetch(`${backendUrl}/api/llm/models?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching LLM models:', error);
        return NextResponse.json(
            { models: [], connected: false, backend: 'ollama', error: 'Failed to fetch models' },
            { status: 500 }
        );
    }
}
