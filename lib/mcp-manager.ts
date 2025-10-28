import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { MCPServerConfig, MCPTool, MCPPrompt, MCPResource } from './types';

interface MCPClientInstance {
  client: Client;
  config: MCPServerConfig;
  connectedAt: number;
}

// Node.js global 타입 확장 (HMR 대응)
declare global {
  var mcpManagerInstance: MCPManager | undefined;
}

class MCPManager {
  private clients: Map<string, MCPClientInstance> = new Map();

  private constructor() {}

  static getInstance(): MCPManager {
    // 전역 객체에서 인스턴스 가져오기 (HMR 시에도 유지)
    if (!global.mcpManagerInstance) {
      global.mcpManagerInstance = new MCPManager();
    }
    return global.mcpManagerInstance;
  }

  // 모든 연결된 클라이언트 반환 (mcpToTool에 사용)
  getConnectedClients(): Client[] {
    return Array.from(this.clients.values()).map(instance => instance.client);
  }

  async connect(config: MCPServerConfig): Promise<void> {
    // 이미 연결되어 있다면 기존 연결 재사용
    if (this.clients.has(config.id)) {
      return;
    }

    const client = new Client({
      name: `mcp-client-${config.name}`,
      version: '1.0.0',
    });

    let transport;

    try {
      switch (config.transportType) {
        case 'stdio':
          if (!config.command) {
            throw new Error('STDIO transport requires command');
          }
          transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: config.env,
          });
          break;

        case 'sse':
          if (!config.url) {
            throw new Error('SSE transport requires URL');
          }
          transport = new SSEClientTransport(new URL(config.url));
          break;

        case 'http':
          if (!config.url) {
            throw new Error('HTTP transport requires URL');
          }
          transport = new StreamableHTTPClientTransport(new URL(config.url));
          break;

        default:
          throw new Error(`Unknown transport type: ${config.transportType}`);
      }

      await client.connect(transport);

      this.clients.set(config.id, {
        client,
        config,
        connectedAt: Date.now(),
      });
    } catch (error) {
      // 연결 실패 시 정리
      try {
        await client.close();
      } catch (e) {
        // 정리 중 에러는 무시
      }
      throw error;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      return;
    }

    try {
      await instance.client.close();
    } finally {
      this.clients.delete(serverId);
    }
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await instance.client.listTools();
    return result.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
    }));
  }

  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await instance.client.listPrompts();
    return result.prompts.map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    }));
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await instance.client.listResources();
    return result.resources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await instance.client.callTool({
      name: toolName,
      arguments: args,
    });

    return result.structuredContent || result.content;
  }

  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>
  ): Promise<unknown> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await instance.client.getPrompt({
      name: promptName,
      arguments: args,
    });

    return result;
  }

  async readResource(serverId: string, uri: string): Promise<unknown> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await instance.client.readResource({ uri });
    return result.contents;
  }

  async getAllTools(): Promise<Array<MCPTool & { serverId: string }>> {
    const allTools: Array<MCPTool & { serverId: string }> = [];

    for (const [serverId, instance] of this.clients) {
      try {
        const tools = await this.listTools(serverId);
        allTools.push(
          ...tools.map(tool => ({
            ...tool,
            serverId,
          }))
        );
      } catch (error) {
        console.error(`Failed to list tools from server ${serverId}:`, error);
      }
    }

    return allTools;
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map(serverId =>
      this.disconnect(serverId)
    );
    await Promise.all(disconnectPromises);
  }
}

export const mcpManager = MCPManager.getInstance();

