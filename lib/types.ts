export interface FunctionCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  functionCalls?: FunctionCallInfo[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatHistory {
  chats: Chat[];
  currentChatId: string | null;
}

// MCP 관련 타입
export type MCPTransportType = 'stdio' | 'sse' | 'http';

export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  transportType: MCPTransportType;
  // STDIO 설정
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // SSE/HTTP 설정
  url?: string;
  createdAt: number;
}

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  error?: string;
  lastConnected?: number;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

