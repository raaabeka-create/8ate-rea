import React, { useState, useEffect } from 'react';
import { AppHeader } from './AppHeader';
import { BottomNav, NavTab } from './BottomNav';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationsModal } from './NotificationsModal';
import { ActiveCallModal } from './ActiveCallModal';
import { ReportModal } from './ReportModal';
import { ChatList } from '../chats/ChatList';
import { ChatRoom } from '../chats/ChatRoom';
import { WallFeed } from '../walls/WallFeed';
import { HubsFeed } from '../hubs/HubsFeed';
import { DiscoverFeed } from '../discover/DiscoverFeed';
import { CallsList } from '../calls/CallsList';
import { UserProfileScreen } from '../you/UserProfileScreen';
import { useAuth } from '../../context/AuthContext';
import { chatService, notificationService } from '../../services';
import { UserProfile, HubListing, PublicAnonymousWallPost, DiscoverPost } from '../../types';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('CHATS');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showPrototypeNotice, setShowPrototypeNotice] = useState(true);
  const [globalActionError, setGlobalActionError] = useState<string | null>(null);

  // Unread counts
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  const refreshUnreadCounters = async () => {
    if (!user) return;
    try {
      const convs = await chatService.getConversations(user.id);
      const totalUnread = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadChatsCount(totalUnread);

      const notifs = await notificationService.getNotifications(user.id);
      setUnreadNotifsCount(notifs.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error('Failed to refresh counters', err);
    }
  };

  useEffect(() => {
    refreshUnreadCounters();
    const interval = setInterval(refreshUnreadCounters, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    // If switching main tab, clear active open chat room
    if (tab !== 'CHATS') {
      setSelectedConversationId(null);
    }
  };

  // Jump handlers from Search or Hubs
  const handleStartChatWithSeller = async (seller: UserProfile, listingTitle: string) => {
    if (!user) return;
    try {
      const conv = await chatService.startDirectChat(user.id, seller.id);
      await chatService.sendTextMessage(
        conv.id,
        user.id,
        `Hello ${seller.displayName}, I am inquiring about your 8ATE Hub listing: "${listingTitle}". Is it still available?`
      );
      setSelectedConversationId(conv.id);
      setActiveTab('CHATS');
      refreshUnreadCounters();
    } catch (err) {
      console.error('Error starting seller chat', err);
      setGlobalActionError(err instanceof Error ? err.message : 'Could not start a conversation with this seller.');
    }
  };

  const handleStartDirectChatWithUser = async (targetUser: UserProfile) => {
    if (!user) return;
    try {
      const conv = await chatService.startDirectChat(user.id, targetUser.id);
      setSelectedConversationId(conv.id);
      setActiveTab('CHATS');
      refreshUnreadCounters();
    } catch (err) {
      console.error('Error starting direct chat', err);
      setGlobalActionError(err instanceof Error ? err.message : 'Could not start this conversation.');
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'CHATS':
        return selectedConversationId ? 'Chat' : 'Chats';
      case 'WALLS':
        return 'Regional Walls';
      case 'HUBS':
        return 'Ghana Hubs';
      case 'DISCOVER':
        return 'Discover';
      case 'CALLS':
        return 'Voice & Video Calls';
      case 'YOU':
        return 'You';
      default:
        return '8ATE';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-gray-900 select-none">
      {/* Top Header (only hidden when in full screen chat room on mobile) */}
      {!selectedConversationId && (
        <AppHeader
          activeTab={activeTab}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsModalOpen(true)}
          unreadNotificationsCount={unreadNotifsCount}
        />
      )}

      {!selectedConversationId && showPrototypeNotice && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] text-amber-900">
          <span><strong>Prototype only:</strong> data is browser-local, not securely shared, and not end-to-end encrypted. Do not enter sensitive information.</span>
          <button type="button" onClick={() => setShowPrototypeNotice(false)} aria-label="Dismiss prototype notice" className="shrink-0 font-bold text-amber-900">Dismiss</button>
        </div>
      )}
      {globalActionError && (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
          <span>{globalActionError}</span>
          <button type="button" onClick={() => setGlobalActionError(null)} aria-label="Dismiss error" className="shrink-0 font-bold">Dismiss</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'CHATS' && (
          selectedConversationId ? (
            <ChatRoom
              conversationId={selectedConversationId}
              onBack={() => {
                setSelectedConversationId(null);
                refreshUnreadCounters();
              }}
            />
          ) : (
            <ChatList
              onSelectConversation={(convId) => {
                setSelectedConversationId(convId);
              }}
              activeConversationId={selectedConversationId}
            />
          )
        )}

        {activeTab === 'WALLS' && <WallFeed />}

        {activeTab === 'HUBS' && (
          <HubsFeed onStartChatWithSeller={handleStartChatWithSeller} />
        )}

        {activeTab === 'DISCOVER' && (
          <DiscoverFeed onStartDirectChat={handleStartDirectChatWithUser} />
        )}

        {activeTab === 'CALLS' && <CallsList />}

        {activeTab === 'YOU' && <UserProfileScreen />}
      </main>

      {/* Persistent Bottom Navigation (hidden when inside an active conversation) */}
      {!selectedConversationId && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadChatsCount={unreadChatsCount}
        />
      )}

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectUser={handleStartDirectChatWithUser}
        onSelectHubListing={() => {
          setActiveTab('HUBS');
        }}
        onSelectWallPost={() => {
          setActiveTab('WALLS');
        }}
        onSelectDiscoverPost={() => {
          setActiveTab('DISCOVER');
        }}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          refreshUnreadCounters();
        }}
      />

      {/* Active VoIP / WebRTC Simulated Call Modal */}
      <ActiveCallModal />

      {/* Report / Safety Community Modal */}
      <ReportModal />
    </div>
  );
};
