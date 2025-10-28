import { NextRequest, NextResponse } from 'next/server';
import { exportMCPConfig, importMCPConfig } from '@/lib/storage';

export async function GET() {
  try {
    const config = exportMCPConfig();
    return new NextResponse(config, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="mcp-config.json"',
      },
    });
  } catch (error) {
    console.error('Failed to export MCP config:', error);
    return NextResponse.json(
      { error: 'Failed to export config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Config data is required' },
        { status: 400 }
      );
    }

    const success = importMCPConfig(typeof config === 'string' ? config : JSON.stringify(config));

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid config format' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Config imported successfully' 
    });
  } catch (error) {
    console.error('Failed to import MCP config:', error);
    return NextResponse.json(
      { error: 'Failed to import config' },
      { status: 500 }
    );
  }
}

