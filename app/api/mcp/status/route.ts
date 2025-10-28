import { NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function GET() {
  try {
    const connectedServers = mcpManager.getConnectedServers();
    
    return NextResponse.json({ 
      connectedServers,
      count: connectedServers.length 
    });
  } catch (error) {
    console.error('Failed to get connection status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

