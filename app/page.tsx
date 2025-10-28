'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Settings, Wrench } from 'lucide-react';
import { Message, ChatHistory, FunctionCallInfo } from '@/lib/types';
import Link from 'next/link';
import { 
  loadChatHistory, 
  saveChatHistory, 
  createNewChat, 
  updateChat,
  deleteChat,
  loadMCPToolsEnabled,
  saveMCPToolsEnabled
} from '@/lib/storage';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { loadTheme, saveTheme, type Theme } from '@/lib/theme';
import { ChatSidebar } from '@/components/chat-sidebar';
import { FunctionCallCard } from '@/components/function-call-card';

export default function ChatPage() {
  const [chatHistory, setChatHistory] = useState<ChatHistory>({ chats: [], currentChatId: null });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('default');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chatHistory.chats.find(c => c.id === chatHistory.currentChatId);
  const messages = currentChat?.messages || [];

  useEffect(() => {
    try {
      const history = loadChatHistory();
      
      // 데이터 검증
      if (!history || !Array.isArray(history.chats) || history.chats.length === 0) {
        const newChat = createNewChat();
        setChatHistory({ chats: [newChat], currentChatId: newChat.id });
      } else {
        setChatHistory(history);
      }
      
      const savedTheme = loadTheme();
      setTheme(savedTheme);
      
      const mcpEnabled = loadMCPToolsEnabled();
      setMcpToolsEnabled(mcpEnabled);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // 오류 발생 시 새 채팅으로 시작
      const newChat = createNewChat();
      setChatHistory({ chats: [newChat], currentChatId: newChat.id });
    }
  }, []);

  useEffect(() => {
    if (currentChat && messages.length > 0) {
      const updatedChat = updateChat(currentChat, messages);
      const newHistory = {
        ...chatHistory,
        chats: chatHistory.chats.map(c => c.id === updatedChat.id ? updatedChat : c),
      };
      setChatHistory(newHistory);
      saveChatHistory(newHistory);
    }
    scrollToBottom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = () => {
    const newChat = createNewChat();
    const newHistory = {
      chats: [newChat, ...chatHistory.chats],
      currentChatId: newChat.id,
    };
    setChatHistory(newHistory);
    saveChatHistory(newHistory);
    setSidebarOpen(false);
  };

  const handleSelectChat = (chatId: string) => {
    setChatHistory({ ...chatHistory, currentChatId: chatId });
    setSidebarOpen(false);
  };

  const handleDeleteChat = (chatId: string) => {
    if (confirm('이 채팅을 삭제하시겠습니까?')) {
      const newHistory = deleteChat(chatHistory, chatId);
      
      if (newHistory.chats.length === 0) {
        const newChat = createNewChat();
        setChatHistory({ chats: [newChat], currentChatId: newChat.id });
        saveChatHistory({ chats: [newChat], currentChatId: newChat.id });
      } else {
        setChatHistory(newHistory);
        saveChatHistory(newHistory);
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'default' ? 'kakao' : 'default';
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const toggleMCPTools = () => {
    const newEnabled = !mcpToolsEnabled;
    setMcpToolsEnabled(newEnabled);
    saveMCPToolsEnabled(newEnabled);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    if (!currentChat) return;
    
    const updatedMessages = [...messages, userMessage];
    const updatedChat = updateChat(currentChat, updatedMessages);
    setChatHistory({
      ...chatHistory,
      chats: chatHistory.chats.map(c => c.id === updatedChat.id ? updatedChat : c),
    });
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history,
          mcpToolsEnabled,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let assistantContent = '';
      const functionCalls: Map<string, FunctionCallInfo> = new Map();
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        functionCalls: [],
      };

      const withAssistantMessage = [...updatedMessages, assistantMessage];
      const chatWithAssistant = updateChat(currentChat, withAssistantMessage);
      setChatHistory({
        ...chatHistory,
        chats: chatHistory.chats.map(c => c.id === chatWithAssistant.id ? chatWithAssistant : c),
      });

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 함수 호출 이벤트 파싱
        const eventRegex = /<<<FUNCTION_EVENT>>>([\s\S]*?)<<<END_EVENT>>>/g;
        let lastProcessedIndex = 0;
        let match;
        
        while ((match = eventRegex.exec(buffer)) !== null) {
          // 이벤트 이전의 텍스트를 콘텐츠에 추가
          const textBeforeEvent = buffer.substring(lastProcessedIndex, match.index);
          if (textBeforeEvent) {
            assistantContent += textBeforeEvent;
          }
          
          try {
            const eventJson = match[1].trim();
            const event = JSON.parse(eventJson);
            
            if (event.type === 'call_start') {
              // 함수 호출 시작
              functionCalls.set(event.data.name, {
                name: event.data.name,
                args: event.data.args || {},
                status: 'pending',
              });
            } else if (event.type === 'call_result') {
              // 함수 호출 결과
              const existingCall = functionCalls.get(event.data.name);
              if (existingCall) {
                existingCall.result = event.data.response;
                existingCall.status = 'success';
              }
            }
          } catch (e) {
            console.error('Failed to parse function event:', e);
          }
          
          lastProcessedIndex = match.index + match[0].length;
        }
        
        // 처리된 부분과 남은 텍스트 처리
        if (lastProcessedIndex > 0) {
          // 처리된 이벤트 이후의 텍스트
          const remainingText = buffer.substring(lastProcessedIndex);
          
          // 불완전한 이벤트 마커가 있는지 확인
          const incompleteMarkerIndex = remainingText.lastIndexOf('<<<FUNCTION_EVENT>>>');
          if (incompleteMarkerIndex !== -1) {
            // 불완전한 마커 이전의 텍스트만 추가
            const textToAdd = remainingText.substring(0, incompleteMarkerIndex);
            if (textToAdd) {
              assistantContent += textToAdd;
            }
            // 불완전한 마커부터 다음 청크를 위해 버퍼에 유지
            buffer = remainingText.substring(incompleteMarkerIndex);
          } else {
            // 이벤트 마커가 없으면 모든 텍스트 추가
            assistantContent += remainingText;
            buffer = '';
          }
        } else {
          // 이벤트가 하나도 처리되지 않았을 때
          const incompleteMarkerIndex = buffer.lastIndexOf('<<<FUNCTION_EVENT>>>');
          if (incompleteMarkerIndex !== -1) {
            // 불완전한 마커 이전까지만 추가
            const textToAdd = buffer.substring(0, incompleteMarkerIndex);
            if (textToAdd) {
              assistantContent += textToAdd;
            }
            buffer = buffer.substring(incompleteMarkerIndex);
          } else if (!buffer.includes('<<<FUNCTION_EVENT>>>')) {
            // 마커가 없으면 모든 텍스트 추가
            assistantContent += buffer;
            buffer = '';
          }
        }

        const streamingMessages = [...updatedMessages, { 
          ...assistantMessage, 
          content: assistantContent,
          functionCalls: Array.from(functionCalls.values()),
        }];
        const streamingChat = updateChat(currentChat, streamingMessages);
        setChatHistory({
          ...chatHistory,
          chats: chatHistory.chats.map(c => c.id === streamingChat.id ? streamingChat : c),
        });
      }
      
      // 남은 버퍼 처리
      if (buffer) {
        assistantContent += buffer;
        const finalMessages = [...updatedMessages, { 
          ...assistantMessage, 
          content: assistantContent,
          functionCalls: Array.from(functionCalls.values()),
        }];
        const finalChat = updateChat(currentChat, finalMessages);
        setChatHistory({
          ...chatHistory,
          chats: chatHistory.chats.map(c => c.id === finalChat.id ? finalChat : c),
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error 
          ? `오류: ${error.message}` 
          : '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: Date.now(),
      };
      
      const errorMessages = [...updatedMessages, errorMessage];
      const errorChat = updateChat(currentChat, errorMessages);
      setChatHistory({
        ...chatHistory,
        chats: chatHistory.chats.map(c => c.id === errorChat.id ? errorChat : c),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen fixed inset-0 z-50">
      <ChatSidebar
        chats={chatHistory.chats}
        currentChatId={chatHistory.currentChatId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <div className={`flex flex-col flex-1 ${
        theme === 'kakao' ? 'kakao-theme' : 'bg-background'
      }`}>
        <header className={`border-b px-4 py-3 flex items-center justify-between shrink-0 ${
          theme === 'kakao' ? 'kakao-header' : ''
        }`}>
          <h1 className="text-xl font-semibold">
            {currentChat?.title || 'AI 채팅'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMCPTools}
              className={`p-2 rounded-lg transition-colors ${
                mcpToolsEnabled
                  ? theme === 'kakao'
                    ? 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : theme === 'kakao'
                    ? 'hover:bg-yellow-400/50'
                    : 'hover:bg-accent'
              }`}
              title={mcpToolsEnabled ? 'MCP 도구 비활성화' : 'MCP 도구 활성화'}
            >
              <Wrench className="w-5 h-5" />
            </button>
            <Link
              href="/mcp"
              className={`p-2 rounded-lg transition-colors ${
                theme === 'kakao' 
                  ? 'hover:bg-yellow-400/50' 
                  : 'hover:bg-accent'
              }`}
              title="MCP 서버 관리"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'kakao' 
                  ? 'bg-yellow-400 text-gray-800 hover:bg-yellow-500' 
                  : 'hover:bg-accent'
              }`}
              title={theme === 'kakao' ? '기본 테마로 전환' : '카카오톡 테마로 전환'}
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>메시지를 입력하여 대화를 시작하세요</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isStreamingThisMessage = isLoading && isLastMessage && message.role === 'assistant';
            
            return (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
              <div className="max-w-[80%] space-y-2">
                <div
                  className={`rounded-lg px-4 py-2 ${
                    theme === 'kakao'
                      ? message.role === 'user'
                        ? 'kakao-user-bubble'
                        : 'kakao-assistant-bubble'
                      : message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                  }`}
                >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <MarkdownRenderer 
                          content={message.content} 
                          isStreaming={isStreamingThisMessage}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* 함수 호출 카드 표시 (Assistant 메시지에만) */}
                  {message.role === 'assistant' && message.functionCalls && message.functionCalls.length > 0 && (
                    <div className="space-y-2">
                      {message.functionCalls.map((functionCall, fcIndex) => (
                        <FunctionCallCard
                          key={`${index}-${fcIndex}`}
                          functionCall={functionCall}
                          theme={theme}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`border-t px-4 py-4 shrink-0 relative z-[60] ${
        theme === 'kakao' ? 'kakao-input-area' : 'bg-background'
      }`}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 ${
              theme === 'kakao'
                ? 'kakao-input'
                : 'focus:ring-primary'
            }`}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              theme === 'kakao'
                ? 'kakao-send-button'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
