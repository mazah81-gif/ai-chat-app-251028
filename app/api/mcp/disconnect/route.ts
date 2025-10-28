import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    await mcpManager.disconnect(serverId);

    return NextResponse.json({ 
      success: true,
      message: 'Disconnected successfully' 
    });
  } catch (error) {
    console.error('Failed to disconnect from MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to disconnect: ${errorMessage}` },
      { status: 500 }
    );
  }
}

