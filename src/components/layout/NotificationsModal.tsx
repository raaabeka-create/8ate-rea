import React, { useEffect, useState } from 'react';
import { Bell, Check, X, MessageSquare, Flame, Store, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services';
import { AppNotification } from '../../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tabName: 'CHATS' | 'WALLS' | 'HUBS' | 'DISCOVER') => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifs();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    await fetchNotifs();
  };

  const handleItemClick = async (notif: AppNotification) => {
    await notificationService.markAsRead(notif.id);
    onClose();
    if (notif.type === 'new_message') {
      onNavigateToTab('CHATS');
    } else if (notif.type === 'wall_reply' || notif.type === 'wall_upvote') {
      onNavigateToTab('WALLS');
    } else if (notif.type === 'hub_inquiry') {
      onNavigateToTab('HUBS');
    } else {
      onNavigateToTab('DISCOVER');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'wall_reply':
      case 'wall_upvote':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'hub_inquiry':
        return <Store className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-base text-gray-900">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-2 text-purple-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-gray-600">No new notifications</p>
              <p className="text-xs text-gray-400 mt-1">You are all caught up on 8ATE!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  n.isRead
                    ? 'bg-white border-gray-100 text-gray-700 hover:border-purple-200'
                    : 'bg-purple-50/60 border-purple-200 text-gray-900 shadow-2xs'
                }`}
              >
                <div className="p-2 rounded-xl bg-white shadow-2xs border border-purple-100 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={`text-xs ${n.isRead ? 'font-semibold text-gray-800' : 'font-extrabold text-purple-950'}`}>
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {n.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
