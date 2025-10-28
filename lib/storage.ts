import { ChatHistory, Chat, Message } from './types';

const STORAGE_KEY = 'chat_history';

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

