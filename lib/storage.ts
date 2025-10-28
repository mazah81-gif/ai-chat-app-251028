import { ChatHistory, Chat, Message, MCPServerConfig } from './types';

const STORAGE_KEY = 'chat_history';
const MCP_SERVERS_KEY = 'mcp_servers';
const MCP_TOOLS_ENABLED_KEY = 'mcp_tools_enabled';

export function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateChatTitle(messages: Message[]): string {
  if (messages.length === 0) return '새 채팅';
  
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return '새 채팅';
  
  // 첫 30자만 사용
  const title = firstUserMessage.content.slice(0, 30);
  return title.length < firstUserMessage.content.length ? `${title}...` : title;
}

export function loadChatHistory(): ChatHistory {
  if (typeof window === 'undefined') {
    return { chats: [], currentChatId: null };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { chats: [], currentChatId: null };
    }
    
    const parsed = JSON.parse(stored);
    
    // 구버전 데이터 마이그레이션 (messages 배열만 있는 경우)
    if (Array.isArray(parsed.messages)) {
      console.log('Migrating old chat history format...');
      const newChat: Chat = {
        id: generateChatId(),
        title: generateChatTitle(parsed.messages),
        messages: parsed.messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const migratedHistory: ChatHistory = {
        chats: parsed.messages.length > 0 ? [newChat] : [],
        currentChatId: parsed.messages.length > 0 ? newChat.id : null,
      };
      
      // 마이그레이션된 데이터 저장
      saveChatHistory(migratedHistory);
      return migratedHistory;
    }
    
    // 새 데이터 구조 검증
    if (!parsed.chats || !Array.isArray(parsed.chats)) {
      console.warn('Invalid chat history format, resetting...');
      return { chats: [], currentChatId: null };
    }
    
    return parsed as ChatHistory;
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return { chats: [], currentChatId: null };
  }
}

export function saveChatHistory(history: ChatHistory): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

export function createNewChat(): Chat {
  return {
    id: generateChatId(),
    title: '새 채팅',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function updateChat(chat: Chat, messages: Message[]): Chat {
  return {
    ...chat,
    messages,
    title: generateChatTitle(messages),
    updatedAt: Date.now(),
  };
}

export function deleteChat(history: ChatHistory, chatId: string): ChatHistory {
  const chats = history.chats.filter(c => c.id !== chatId);
  const currentChatId = history.currentChatId === chatId 
    ? (chats.length > 0 ? chats[0].id : null)
    : history.currentChatId;
  
  return { chats, currentChatId };
}

// MCP 서버 관리 함수
export function generateMCPServerId(): string {
  return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function loadMCPServers(): MCPServerConfig[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(MCP_SERVERS_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.warn('Invalid MCP servers format, resetting...');
      return [];
    }
    
    return parsed as MCPServerConfig[];
  } catch (error) {
    console.error('Failed to load MCP servers:', error);
    return [];
  }
}

export function saveMCPServers(servers: MCPServerConfig[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers));
  } catch (error) {
    console.error('Failed to save MCP servers:', error);
  }
}

export function addMCPServer(server: Omit<MCPServerConfig, 'id' | 'createdAt'>): MCPServerConfig {
  const newServer: MCPServerConfig = {
    ...server,
    id: generateMCPServerId(),
    createdAt: Date.now(),
  };
  
  const servers = loadMCPServers();
  servers.push(newServer);
  saveMCPServers(servers);
  
  return newServer;
}

export function updateMCPServer(id: string, updates: Partial<MCPServerConfig>): void {
  const servers = loadMCPServers();
  const index = servers.findIndex(s => s.id === id);
  
  if (index >= 0) {
    servers[index] = { ...servers[index], ...updates };
    saveMCPServers(servers);
  }
}

export function deleteMCPServer(id: string): void {
  const servers = loadMCPServers();
  const filtered = servers.filter(s => s.id !== id);
  saveMCPServers(filtered);
}

export function exportMCPConfig(): string {
  const servers = loadMCPServers();
  return JSON.stringify(servers, null, 2);
}

export function importMCPConfig(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!Array.isArray(parsed)) {
      return false;
    }
    
    // 기본 검증
    const isValid = parsed.every(
      server =>
        typeof server.name === 'string' &&
        typeof server.transportType === 'string' &&
        ['stdio', 'sse', 'http'].includes(server.transportType)
    );
    
    if (!isValid) {
      return false;
    }
    
    // 새로운 ID와 createdAt 할당
    const servers = parsed.map(server => ({
      ...server,
      id: generateMCPServerId(),
      createdAt: Date.now(),
    }));
    
    saveMCPServers(servers);
    return true;
  } catch (error) {
    console.error('Failed to import MCP config:', error);
    return false;
  }
}

// MCP 도구 활성화/비활성화 설정
export function loadMCPToolsEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true; // 기본값: 활성화
  }
  
  try {
    const stored = localStorage.getItem(MCP_TOOLS_ENABLED_KEY);
    if (stored === null) {
      return true; // 기본값: 활성화
    }
    return stored === 'true';
  } catch (error) {
    console.error('Failed to load MCP tools enabled setting:', error);
    return true;
  }
}

export function saveMCPToolsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(MCP_TOOLS_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error('Failed to save MCP tools enabled setting:', error);
  }
}

