'use client';

import { useState, useEffect } from 'react';
import { useMCP } from '@/lib/mcp-context';
import { MCPServerConfig, MCPTransportType, MCPTool, MCPPrompt, MCPResource } from '@/lib/types';
import { 
  loadMCPServers, 
  saveMCPServers, 
  deleteMCPServer, 
  exportMCPConfig,
  importMCPConfig,
  generateMCPServerId 
} from '@/lib/storage';
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload,
  ChevronDown,
  ChevronUp,
  Home,
  Play,
  RefreshCw,
  Edit,
  Plug,
  PlugZap
} from 'lucide-react';
import Link from 'next/link';

export default function MCPManagePage() {
  const { servers, refreshServers, syncConnectionState, connectServer, disconnectServer } = useMCP();
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'prompts' | 'resources'>('tools');
  const [isSyncing, setIsSyncing] = useState(false);

  // 서버 등록 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    transportType: 'stdio' as MCPTransportType,
    command: '',
    args: '',
    url: '',
  });

  const handleAddServer = async () => {
    if (!formData.name || !formData.transportType) {
      alert('이름과 전송 방식은 필수입니다');
      return;
    }

    const newServer: MCPServerConfig = {
      id: generateMCPServerId(),
      name: formData.name,
      description: formData.description,
      transportType: formData.transportType,
      command: formData.command || undefined,
      args: formData.args ? formData.args.split(',').map(s => s.trim()) : undefined,
      url: formData.url || undefined,
      createdAt: Date.now(),
    };

    const servers = loadMCPServers();
    servers.push(newServer);
    saveMCPServers(servers);

    setFormData({
      name: '',
      description: '',
      transportType: 'stdio',
      command: '',
      args: '',
      url: '',
    });
    setIsAddingServer(false);
    await refreshServers();
  };

  const handleEditServer = (server: MCPServerConfig) => {
    setEditingServerId(server.id);
    setFormData({
      name: server.name,
      description: server.description || '',
      transportType: server.transportType,
      command: server.command || '',
      args: server.args ? server.args.join(', ') : '',
      url: server.url || '',
    });
    // 폼으로 스크롤
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleUpdateServer = async () => {
    if (!editingServerId || !formData.name || !formData.transportType) {
      alert('이름과 전송 방식은 필수입니다');
      return;
    }

    const servers = loadMCPServers();
    const index = servers.findIndex(s => s.id === editingServerId);
    
    if (index >= 0) {
      servers[index] = {
        ...servers[index],
        name: formData.name,
        description: formData.description,
        transportType: formData.transportType,
        command: formData.command || undefined,
        args: formData.args ? formData.args.split(',').map(s => s.trim()) : undefined,
        url: formData.url || undefined,
      };
      
      saveMCPServers(servers);
    }

    setFormData({
      name: '',
      description: '',
      transportType: 'stdio',
      command: '',
      args: '',
      url: '',
    });
    setEditingServerId(null);
    await refreshServers();
  };

  const cancelEdit = () => {
    setEditingServerId(null);
    setFormData({
      name: '',
      description: '',
      transportType: 'stdio',
      command: '',
      args: '',
      url: '',
    });
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('이 서버를 삭제하시겠습니까?')) {
      return;
    }

    deleteMCPServer(serverId);
    await refreshServers();
  };

  const handleConnect = async (serverId: string) => {
    try {
      await connectServer(serverId);
    } catch (error) {
      alert(error instanceof Error ? error.message : '연결 실패');
    }
  };

  const handleDisconnect = async (serverId: string) => {
    try {
      await disconnectServer(serverId);
    } catch (error) {
      alert(error instanceof Error ? error.message : '연결 해제 실패');
    }
  };

  const handleExport = () => {
    const config = exportMCPConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const success = importMCPConfig(text);
      
      if (success) {
        alert('설정을 가져왔습니다');
        await refreshServers();
      } else {
        alert('잘못된 설정 파일입니다');
      }
    };
    input.click();
  };

  const toggleExpand = (serverId: string) => {
    setExpandedServer(expandedServer === serverId ? null : serverId);
  };

  const handleSyncState = async () => {
    setIsSyncing(true);
    try {
      await syncConnectionState();
    } catch (error) {
      console.error('Failed to sync state:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="채팅으로 돌아가기"
            >
              <Home className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">MCP 서버 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSyncState}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="연결 상태 동기화"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '동기화 중...' : '상태 동기화'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              내보내기
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              가져오기
            </button>
            <button
              onClick={() => setIsAddingServer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              서버 추가
            </button>
          </div>
        </div>

        {/* 서버 추가/수정 폼 */}
        {(isAddingServer || editingServerId) && (
          <div className="mb-6 p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">
              {editingServerId ? 'MCP 서버 수정' : '새 MCP 서버 등록'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="My MCP Server"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="서버 설명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">전송 방식 *</label>
                <select
                  value={formData.transportType}
                  onChange={(e) => setFormData({ ...formData, transportType: e.target.value as MCPTransportType })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="stdio">STDIO</option>
                  <option value="sse">SSE</option>
                  <option value="http">HTTP</option>
                </select>
              </div>

              {formData.transportType === 'stdio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">명령어 *</label>
                    <input
                      type="text"
                      value={formData.command}
                      onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="node"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">인자 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={formData.args}
                      onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="server.js, --port, 3000"
                    />
                  </div>
                </>
              )}

              {(formData.transportType === 'sse' || formData.transportType === 'http') && (
                <div>
                  <label className="block text-sm font-medium mb-1">URL *</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="http://localhost:3000/mcp"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={editingServerId ? handleUpdateServer : handleAddServer}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                >
                  {editingServerId ? '수정' : '추가'}
                </button>
                <button
                  onClick={() => {
                    if (editingServerId) {
                      cancelEdit();
                    } else {
                      setIsAddingServer(false);
                    }
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 서버 목록 */}
        <div className="space-y-4">
          {servers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>등록된 MCP 서버가 없습니다</p>
              <p className="text-sm mt-2">상단의 &quot;서버 추가&quot; 버튼을 클릭하여 시작하세요</p>
            </div>
          ) : (
                  servers.map((server) => (
              <ServerCard
                key={server.config.id}
                server={{ ...server.config, status: server.status }}
                isExpanded={expandedServer === server.config.id}
                onToggleExpand={() => toggleExpand(server.config.id)}
                onConnect={() => handleConnect(server.config.id)}
                onDisconnect={() => handleDisconnect(server.config.id)}
                onEdit={() => handleEditServer(server.config)}
                onDelete={() => handleDeleteServer(server.config.id)}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 서버 카드 컴포넌트
function ServerCard({
  server,
  isExpanded,
  onToggleExpand,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  activeTab,
  onTabChange,
}: {
  server: MCPServerConfig & { status?: string; lastConnected?: number; error?: string };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  activeTab: 'tools' | 'prompts' | 'resources';
  onTabChange: (tab: 'tools' | 'prompts' | 'resources') => void;
}) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executeResult, setExecuteResult] = useState<unknown>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/mcp/list?serverId=${server.id}&type=${activeTab}`
      );
      const data = await response.json();
      
      if (activeTab === 'tools') {
        setTools(data.tools || []);
      } else if (activeTab === 'prompts') {
        setPrompts(data.prompts || []);
      } else if (activeTab === 'resources') {
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isExpanded && server.status === 'connected') {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, server.status, activeTab]);

  const handleExecuteTool = async (toolName: string) => {
    const argsStr = prompt('인자를 JSON 형식으로 입력하세요 (예: {"arg1": "value"})');
    if (argsStr === null) return;

    try {
      const args = argsStr ? JSON.parse(argsStr) : {};
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: server.id,
          action: 'callTool',
          name: toolName,
          arguments: args,
        }),
      });

      const data = await response.json();
      setExecuteResult({ tool: toolName, result: data.result });
    } catch (error) {
      alert(error instanceof Error ? error.message : '실행 실패');
    }
  };

  const handleReadResource = async (uri: string) => {
    try {
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: server.id,
          action: 'readResource',
          uri,
        }),
      });

      const data = await response.json();
      setExecuteResult({ resource: uri, result: data.result });
    } catch (error) {
      alert(error instanceof Error ? error.message : '읽기 실패');
    }
  };

  const getStatusColor = () => {
    switch (server.status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <div>
            <h3 className="font-semibold">{server.name}</h3>
            <p className="text-sm text-muted-foreground">
              {server.transportType.toUpperCase()}
              {server.description && ` • ${server.description}`}
              {server.status === 'connected' && server.lastConnected && (
                <span className="ml-2 text-green-600">
                  • 연결됨 ({new Date(server.lastConnected).toLocaleTimeString()})
                </span>
              )}
              {server.status === 'error' && (
                <span className="ml-2 text-red-600">
                  • 오류: {server.error}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {server.status === 'connected' ? (
            <button
              onClick={onDisconnect}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
              title="연결 해제"
            >
              <Plug className="w-5 h-5" />
              <span className="text-sm font-medium">연결 해제</span>
            </button>
          ) : server.status === 'error' ? (
            <button
              onClick={onConnect}
              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-2"
              title="재연결"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="text-sm font-medium">재연결</span>
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="연결"
              disabled={server.status === 'connecting'}
            >
              <PlugZap className="w-5 h-5" />
              <span className="text-sm font-medium">
                {server.status === 'connecting' ? '연결 중...' : '연결'}
              </span>
            </button>
          )}

          <button
            onClick={onEdit}
            className="p-2 hover:bg-blue-500/10 text-blue-600 rounded-lg transition-colors"
            title="수정"
          >
            <Edit className="w-5 h-5" />
          </button>

          <button
            onClick={onDelete}
            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
            title="삭제"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title={isExpanded ? '접기' : '펼치기'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && server.status === 'connected' && (
        <div className="border-t p-4">
          {/* 탭 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => onTabChange('tools')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'tools' ? 'bg-primary text-primary-foreground' : 'bg-accent'
              }`}
            >
              Tools
            </button>
            <button
              onClick={() => onTabChange('prompts')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'prompts' ? 'bg-primary text-primary-foreground' : 'bg-accent'
              }`}
            >
              Prompts
            </button>
            <button
              onClick={() => onTabChange('resources')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'resources' ? 'bg-primary text-primary-foreground' : 'bg-accent'
              }`}
            >
              Resources
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : (
            <>
              {activeTab === 'tools' && (
                <div className="space-y-2">
                  {tools.length === 0 ? (
                    <p className="text-muted-foreground">사용 가능한 도구가 없습니다</p>
                  ) : (
                    tools.map((tool) => (
                      <div
                        key={tool.name}
                        className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent/50"
                      >
                        <div>
                          <p className="font-medium">{tool.name}</p>
                          {tool.description && (
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleExecuteTool(tool.name)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          title="실행"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'prompts' && (
                <div className="space-y-2">
                  {prompts.length === 0 ? (
                    <p className="text-muted-foreground">사용 가능한 프롬프트가 없습니다</p>
                  ) : (
                    prompts.map((prompt) => (
                      <div key={prompt.name} className="p-3 border rounded-lg">
                        <p className="font-medium">{prompt.name}</p>
                        {prompt.description && (
                          <p className="text-sm text-muted-foreground">{prompt.description}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-2">
                  {resources.length === 0 ? (
                    <p className="text-muted-foreground">사용 가능한 리소스가 없습니다</p>
                  ) : (
                    resources.map((resource) => (
                      <div
                        key={resource.uri}
                        className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent/50"
                      >
                        <div>
                          <p className="font-medium">{resource.name}</p>
                          <p className="text-sm text-muted-foreground">{resource.uri}</p>
                        </div>
                        <button
                          onClick={() => handleReadResource(resource.uri)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          title="읽기"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {executeResult && (
                <div className="mt-4 p-4 border rounded-lg bg-muted">
                  <p className="font-medium mb-2">실행 결과:</p>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(executeResult, null, 2)}
                  </pre>
                  <button
                    onClick={() => setExecuteResult(null)}
                    className="mt-2 px-3 py-1 bg-accent hover:bg-accent/80 rounded text-sm"
                  >
                    닫기
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isExpanded && server.status === 'error' && (
        <div className="border-t p-4 bg-destructive/10">
          <p className="text-destructive">오류: {server.error}</p>
        </div>
      )}
    </div>
  );
}

