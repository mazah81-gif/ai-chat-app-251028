import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';
import { MCPServerConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverConfig } = body;

    if (!serverConfig) {
      return NextResponse.json(
        { error: 'Server config is required' },
        { status: 400 }
      );
    }

    // 타입 검증
    const config = serverConfig as MCPServerConfig;
    if (!config.id || !config.name || !config.transportType) {
      return NextResponse.json(
        { error: 'Invalid server config' },
        { status: 400 }
      );
    }

    await mcpManager.connect(config);

    return NextResponse.json({ 
      success: true,
      message: `Connected to ${config.name}` 
    });
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to connect: ${errorMessage}` },
      { status: 500 }
    );
  }
}

