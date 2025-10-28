import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// 함수 호출 이벤트를 JSON으로 인코딩하여 전송
function sendFunctionCallEvent(controller: ReadableStreamDefaultController, type: string, data: any) {
  const encoder = new TextEncoder();
  const eventMarker = `\n<<<FUNCTION_EVENT>>>${JSON.stringify({ type, data })}<<<END_EVENT>>>\n`;
  controller.enqueue(encoder.encode(eventMarker));
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response('Invalid JSON', { status: 400 });
    }

    const { message, history, mcpToolsEnabled = true } = body;

    if (!message || typeof message !== 'string') {
      console.error('Invalid message:', message);
      return new Response('Invalid message', { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      console.error('API key not configured properly');
      return new Response('API key not configured. Please set GEMINI_API_KEY in .env.local', { status: 500 });
    }

    // MCP 도구가 활성화되어 있고 연결된 서버가 있으면 도구 목록 가져오기
    console.log('[Chat API] MCP tools enabled:', mcpToolsEnabled);
    
    let tools = undefined;
    if (mcpToolsEnabled) {
      const mcpTools = await mcpManager.getAllTools();
      console.log('[Chat API] MCP tools count:', mcpTools.length);
      
      if (mcpTools.length > 0) {
        // 각 도구에 서버 ID를 접두사로 추가하여 이름 충돌 방지
        const functionDeclarations = mcpTools.map(tool => {
          const uniqueName = `${tool.serverId}__${tool.name}`;
          console.log(`[Chat API] Registering tool: ${uniqueName}`);
          
          return {
            name: uniqueName,
            description: tool.description || tool.name,
            parameters: tool.inputSchema,
          };
        });
        
        tools = [{ functionDeclarations }];
      }
    }

    console.log('[Chat API] Tools configured:', tools ? `${tools[0].functionDeclarations.length} functions` : 'none');

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash-001',
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        tools,
      },
      history: history || [],
    });
    
    console.log('[Chat API] Chat instance created with model: gemini-2.0-flash-001');

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          console.log('[Chat API] Starting stream...');
          
          let currentMessage = message;
          let iterations = 0;
          const maxIterations = 10;

          while (iterations < maxIterations) {
            iterations++;
            console.log(`[Chat API] Iteration ${iterations}`);
            
            const stream = await chat.sendMessageStream({ message: currentMessage });
            let fullResponse = '';
            let functionCalls: any[] = [];

            for await (const chunk of stream) {
              const text = chunk.text || '';
              fullResponse += text;
              
              if (text) {
                controller.enqueue(encoder.encode(text));
              }

              if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                functionCalls = chunk.functionCalls;
              }
            }

            // Function call이 없으면 완료
            if (functionCalls.length === 0) {
              console.log('[Chat API] No function calls, completing');
              break;
            }

            console.log(`[Chat API] Processing ${functionCalls.length} function calls`);

            // Function call 시작 이벤트 전송
            for (const call of functionCalls) {
              sendFunctionCallEvent(controller, 'call_start', {
                name: call.name,
                args: call.args,
              });
            }

            // Function call 실행
            const functionResponses = await Promise.all(
              functionCalls.map(async (call: any) => {
                try {
                  // serverId와 toolName 분리 (이제 __ 구분자 사용)
                  const parts = call.name.split('__');
                  if (parts.length < 2) {
                    throw new Error(`Invalid function name format: ${call.name}`);
                  }
                  
                  const serverId = parts[0];
                  const toolName = parts.slice(1).join('__');
                  
                  console.log(`[Chat API] Calling tool: ${toolName} on server: ${serverId}`);

                  // MCP tool 호출
                  const result = await mcpManager.callTool(
                    serverId,
                    toolName,
                    call.args || {}
                  );

                  console.log(`[Chat API] Tool result:`, result);

                  // Function 결과 이벤트 전송
                  sendFunctionCallEvent(controller, 'call_result', {
                    name: call.name,
                    response: result,
                  });

                  return {
                    name: call.name,
                    response: result,
                  };
                } catch (error) {
                  console.error('[Chat API] Function call error:', error);
                  
                  const errorResponse = {
                    error: error instanceof Error ? error.message : 'Unknown error'
                  };

                  sendFunctionCallEvent(controller, 'call_result', {
                    name: call.name,
                    response: errorResponse,
                  });

                  return {
                    name: call.name,
                    response: errorResponse,
                  };
                }
              })
            );

            // Function 결과를 다음 메시지로 전달
            currentMessage = JSON.stringify({ functionResponses });
          }

          console.log('[Chat API] Stream complete');
          controller.close();
        } catch (error) {
          console.error('[Chat API] Stream error:', error);
          console.error('[Chat API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          
          try {
            const errorMessage = error instanceof Error ? error.message : 'Unknown stream error';
            controller.enqueue(encoder.encode(`\n\n오류가 발생했습니다: ${errorMessage}\n\n`));
          } catch (e) {
            console.error('[Chat API] Failed to send error message:', e);
          }
          
          try {
            controller.close();
          } catch (e) {
            console.error('[Chat API] Failed to close controller:', e);
          }
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

