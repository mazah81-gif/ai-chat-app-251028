'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MCPServerConfig, MCPServerState } from './types';
import { loadMCPServers } from './storage';

interface MCPContextValue {
  servers: MCPServerState[];
  isLoading: boolean;
  refreshServers: () => Promise<void>;
  syncConnectionState: () => Promise<void>;
  connectServer: (serverId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  getServerStatus: (serverId: string) => MCPServerState | undefined;
}

const MCPContext = createContext<MCPContextValue | undefined>(undefined);

export function MCPProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<MCPServerState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshServers = useCallback(async () => {
    try {
      setIsLoading(true);
      const configs = loadMCPServers();
      
      // 서버 상태 초기화 (연결 상태는 서버에서 확인 필요)
      const serverStates: MCPServerState[] = configs.map(config => ({
        config,
        status: 'disconnected',
      }));

      setServers(serverStates);
      
      // 서버 연결 상태 동기화
      await syncConnectionStateInternal(serverStates);
    } catch (error) {
      console.error('Failed to refresh servers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncConnectionStateInternal = async (serverStates: MCPServerState[]) => {
    try {
      // 서버에서 현재 연결된 서버 목록 가져오기
      const response = await fetch('/api/mcp/status');
      if (!response.ok) {
        console.error('Failed to fetch connection status');
        return;
      }

      const data = await response.json();
      const connectedServerIds = data.connectedServers as string[];

      // 연결 상태 업데이트
      setServers(prev =>
        prev.map(server => ({
          ...server,
          status: connectedServerIds.includes(server.config.id) 
            ? 'connected' 
            : 'disconnected',
        }))
      );
    } catch (error) {
      console.error('Failed to sync connection state:', error);
    }
  };

  const syncConnectionState = useCallback(async () => {
    await syncConnectionStateInternal(servers);
  }, [servers]);

  useEffect(() => {
    refreshServers();
  }, [refreshServers]);

  const connectServer = async (serverId: string) => {
    setServers(prev =>
      prev.map(s =>
        s.config.id === serverId ? { ...s, status: 'connecting' } : s
      )
    );

    try {
      // localStorage에서 서버 설정 가져오기
      const serverConfig = servers.find(s => s.config.id === serverId)?.config;
      
      if (!serverConfig) {
        throw new Error('Server configuration not found');
      }

      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverConfig }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect');
      }

      setServers(prev =>
        prev.map(s =>
          s.config.id === serverId
            ? { ...s, status: 'connected', lastConnected: Date.now() }
            : s
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setServers(prev =>
        prev.map(s =>
          s.config.id === serverId
            ? { ...s, status: 'error', error: errorMessage }
            : s
        )
      );
      throw error;
    }
  };

  const disconnectServer = async (serverId: string) => {
    try {
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      setServers(prev =>
        prev.map(s =>
          s.config.id === serverId
            ? { ...s, status: 'disconnected', error: undefined }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  const getServerStatus = (serverId: string) => {
    return servers.find(s => s.config.id === serverId);
  };

  return (
    <MCPContext.Provider
      value={{
        servers,
        isLoading,
        refreshServers,
        syncConnectionState,
        connectServer,
        disconnectServer,
        getServerStatus,
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCP must be used within MCPProvider');
  }
  return context;
}

