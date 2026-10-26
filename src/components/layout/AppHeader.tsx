import React from 'react';
import { Search, Bell, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AppHeaderProps {
  activeTab: string;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onOpenSearch,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const { user } = useAuth();

  const getTabHeading = () => {
    switch (activeTab) {
      case 'CHATS':
        return 'Chats';
      case 'WALLS':
        return 'Regional Walls';
      case 'HUBS':
        return 'Ghana Hubs';
      case 'DISCOVER':
        return 'Discover Feed';
      case 'CALLS':
        return 'Calls';
      case 'YOU':
        return 'Account & Profile';
      default:
        return '8ATE';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-purple-100 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-700 flex items-center justify-center text-white font-black text-xl shadow-xs tracking-tight select-none">
            8
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-gray-900 tracking-tight text-lg">8ATE</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                Ghana
              </span>
            </div>
            {user && (
              <div className="flex items-center text-xs text-gray-500 font-medium -mt-0.5">
                <MapPin className="w-3 h-3 text-purple-600 mr-0.5" />
                <span className="truncate max-w-[120px] sm:max-w-[180px]">
                  {user.city}, {user.region}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center section title on desktop */}
        <div className="hidden md:block text-sm font-bold text-gray-700 tracking-wide">
          {getTabHeading()}
        </div>

        {/* Actions: Search & Notifications */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSearch}
            id="global-search-btn"
            aria-label="Search"
            className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenNotifications}
            id="notifications-btn"
            aria-label="Notifications"
            className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-purple-600 rounded-full ring-2 ring-white" />
            )}
          </button>

          {user && (
            <div className="ml-1 pl-1 border-l border-gray-100 flex items-center">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-purple-300"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
