import React, { useState, useEffect } from 'react';
import { Search, Pin, MessageSquarePlus, Users, Check } from 'lucide-react';
import { Conversation, UserProfile } from '../../types';
import { chatService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { NewChatModal } from './NewChatModal';

interface ChatListProps {
  onSelectConversation: (conversationId: string) => void;
  activeConversationId?: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({
  onSelectConversation,
  activeConversationId,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadConversations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await chatService.getConversations(user.id);
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations', err);
      setActionError('Could not load your conversations. Check browser storage and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  const handleSelectDirectUser = async (targetUser: UserProfile): Promise<string | null> => {
    if (!user) return 'Sign in to start a conversation.';
    setActionError(null);
    try {
      const conv = await chatService.startDirectChat(user.id, targetUser.id);
      await loadConversations();
      onSelectConversation(conv.id);
      return null;
    } catch (err) {
      console.error('Error starting direct chat', err);
      const message = err instanceof Error ? err.message : 'Could not start this conversation.';
      setActionError(message);
      return message;
    }
  };

  const handleCreateGroup = async (memberIds: string[], groupName: string): Promise<string | null> => {
    if (!user) return 'Sign in to create a group.';
    setActionError(null);
    try {
      const conv = await chatService.createGroupChat(user.id, memberIds, groupName);
      await loadConversations();
      onSelectConversation(conv.id);
      return null;
    } catch (err) {
      console.error('Error creating group chat', err);
      const message = err instanceof Error ? err.message : 'Could not create this group.';
      setActionError(message);
      return message;
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    if (!user) return;
    setActionError(null);
    try {
      await chatService.togglePin(conv.id, user.id, !conv.isPinned);
      await loadConversations();
    } catch (err) {
      console.error('Error updating conversation pin', err);
      setActionError(err instanceof Error ? err.message : 'Could not update this chat.');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (c.isGroup) {
      return c.name?.toLowerCase().includes(q);
    }
    const other = c.participants.find((p) => p.id !== user?.id);
    return (
      other?.displayName.toLowerCase().includes(q) ||
      other?.username.toLowerCase().includes(q) ||
      c.lastMessage?.content.toLowerCase().includes(q)
    );
  });

  const formatTimestamp = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getChatTitle = (conv: Conversation) => {
    if (conv.isGroup) return conv.name || 'Ghana Group';
    const other = conv.participants.find((p) => p.id !== user?.id);
    return other ? other.displayName : 'Conversation';
  };

  const getChatAvatar = (conv: Conversation) => {
    if (conv.isGroup) {
      return conv.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80';
    }
    const other = conv.participants.find((p) => p.id !== user?.id);
    return other?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
  };

  const getChatSubtitle = (conv: Conversation) => {
    if (conv.isGroup) {
      return `${conv.participants.length} Ghanaian members`;
    }
    const other = conv.participants.find((p) => p.id !== user?.id);
    return other ? `@${other.username} • ${other.city}` : '';
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Search Header */}
      <div className="p-3 border-b border-purple-100 bg-white sticky top-0 z-10">
        <div className="relative">
          <Search className="w-4 h-4 text-purple-600 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations & contacts..."
            className="w-full pl-9 pr-3 py-2 bg-purple-50/50 border border-purple-100 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
          {actionError}
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading your chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-16 text-center text-gray-400 px-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="text-sm font-bold text-gray-700">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Start chatting with other Ghanaian innovators, friends, or marketplace sellers on 8ATE.
            </p>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Start a Conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = activeConversationId === conv.id;
            const other = conv.participants.find((p) => p.id !== user?.id);

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors relative ${
                  isSelected ? 'bg-purple-50/80' : 'hover:bg-gray-50/80 bg-white'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={getChatAvatar(conv)}
                    alt={getChatTitle(conv)}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-purple-200"
                  />
                  {conv.isGroup && (
                    <span className="absolute -bottom-1 -right-1 p-1 bg-purple-700 text-white rounded-full">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Content info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className="font-bold text-xs text-gray-900 truncate">
                      {getChatTitle(conv)}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium shrink-0">
                      {formatTimestamp(conv.lastMessage?.timestamp || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1 font-normal">
                      {conv.lastMessage?.senderId === user?.id && (
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 inline" aria-label="Demo status only; no recipient receipt" />
                      )}
                      <span>
                        {conv.lastMessage
                          ? conv.lastMessage.content
                          : getChatSubtitle(conv)}
                      </span>
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.isPinned && (
                        <Pin className="w-3 h-3 text-purple-600 rotate-45" />
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick pin hover action */}
                <button
                  onClick={(e) => handleTogglePin(e, conv)}
                  title={conv.isPinned ? 'Unpin chat' : 'Pin chat'}
                  className="opacity-0 hover:opacity-100 p-1 text-gray-400 hover:text-purple-600 rounded-lg absolute right-2 top-2"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button: New Chat */}
      <button
        onClick={() => setIsNewChatModalOpen(true)}
        id="btn-new-chat"
        aria-label="Start new chat"
        className="fixed bottom-20 right-4 sm:right-6 md:right-8 z-20 w-12 h-12 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white shadow-lg shadow-purple-700/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSelectDirectUser={handleSelectDirectUser}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
};
