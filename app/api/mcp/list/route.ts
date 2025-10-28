import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const type = searchParams.get('type');

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    if (!type || !['tools', 'prompts', 'resources'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type (tools, prompts, resources) is required' },
        { status: 400 }
      );
    }

    if (!mcpManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'tools':
        result = await mcpManager.listTools(serverId);
        break;
      case 'prompts':
        result = await mcpManager.listPrompts(serverId);
        break;
      case 'resources':
        result = await mcpManager.listResources(serverId);
        break;
    }

    return NextResponse.json({ [type]: result });
  } catch (error) {
    console.error('Failed to list MCP items:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to list: ${errorMessage}` },
      { status: 500 }
    );
  }
}

