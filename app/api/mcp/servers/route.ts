import { NextRequest, NextResponse } from 'next/server';
import { loadMCPServers, saveMCPServers, generateMCPServerId, deleteMCPServer } from '@/lib/storage';
import { MCPServerConfig } from '@/lib/types';

export async function GET() {
  try {
    const servers = loadMCPServers();
    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Failed to load MCP servers:', error);
    return NextResponse.json(
      { error: 'Failed to load servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, description, transportType, command, args, env, url } = body;

    if (!name || !transportType) {
      return NextResponse.json(
        { error: 'Name and transportType are required' },
        { status: 400 }
      );
    }

    if (!['stdio', 'sse', 'http'].includes(transportType)) {
      return NextResponse.json(
        { error: 'Invalid transport type' },
        { status: 400 }
      );
    }

    const newServer: MCPServerConfig = {
      id: generateMCPServerId(),
      name,
      description,
      transportType,
      command,
      args,
      env,
      url,
      createdAt: Date.now(),
    };

    const servers = loadMCPServers();
    servers.push(newServer);
    saveMCPServers(servers);

    return NextResponse.json({ server: newServer }, { status: 201 });
  } catch (error) {
    console.error('Failed to create MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('id');

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    deleteMCPServer(serverId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to delete server' },
      { status: 500 }
    );
  }
}

