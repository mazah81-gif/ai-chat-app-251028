import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response('Invalid JSON', { status: 400 });
    }

    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      console.error('Invalid message:', message);
      return new Response('Invalid message', { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      console.error('API key not configured properly');
      return new Response('API key not configured. Please set GEMINI_API_KEY in .env.local', { status: 500 });
    }

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash-001',
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      history: history || [],
    });

    const stream = await chat.sendMessageStream({ message });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text || '';
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(errorMessage, { status: 500 });
  }
}

