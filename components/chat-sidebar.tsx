'use client';

import { Plus, MessageSquare, Trash2, Menu, X } from 'lucide-react';
import { Chat } from '@/lib/types';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatSidebar({
  chats,
  currentChatId,
  isOpen,
  onToggle,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ChatSidebarProps) {
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed left-0 top-0 h-full bg-background border-r z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 lg:translate-x-0 lg:relative`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-semibold text-lg">채팅</h2>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 hover:bg-accent rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 새 채팅 버튼 */}
        <div className="p-3 border-b shrink-0">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">새 채팅</span>
          </button>
        </div>

        {/* 채팅 목록 */}
        <div className="flex-1 overflow-y-auto p-2">
          {sortedChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p>채팅 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="flex-1 text-sm truncate">{chat.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* 모바일 토글 버튼 */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-30 lg:hidden p-2 bg-background border rounded-lg shadow-lg hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

