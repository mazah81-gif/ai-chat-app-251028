import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, action, name, arguments: args, uri } = body;

    if (!serverId || !action) {
      return NextResponse.json(
        { error: 'Server ID and action are required' },
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

    switch (action) {
      case 'callTool':
        if (!name) {
          return NextResponse.json(
            { error: 'Tool name is required' },
            { status: 400 }
          );
        }
        result = await mcpManager.callTool(serverId, name, args || {});
        break;

      case 'getPrompt':
        if (!name) {
          return NextResponse.json(
            { error: 'Prompt name is required' },
            { status: 400 }
          );
        }
        result = await mcpManager.getPrompt(serverId, name, args);
        break;

      case 'readResource':
        if (!uri) {
          return NextResponse.json(
            { error: 'Resource URI is required' },
            { status: 400 }
          );
        }
        result = await mcpManager.readResource(serverId, uri);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Failed to execute MCP action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to execute: ${errorMessage}` },
      { status: 500 }
    );
  }
}

