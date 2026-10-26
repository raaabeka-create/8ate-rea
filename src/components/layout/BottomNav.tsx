import React from 'react';
import { MessageSquare, Flame, Store, Compass, Phone, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 'CHATS' | 'WALLS' | 'HUBS' | 'DISCOVER' | 'CALLS' | 'YOU';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadChatsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadChatsCount = 0,
}) => {
  const { user } = useAuth();

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'CHATS', label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'WALLS', label: 'Walls', icon: Flame },
    { id: 'HUBS', label: 'Hubs', icon: Store },
    { id: 'DISCOVER', label: 'Discover', icon: Compass },
    { id: 'CALLS', label: 'Calls', icon: Phone },
    { id: 'YOU', label: 'You', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/98 backdrop-blur border-t border-purple-100 pb-safe shadow-lg">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id.toLowerCase()}`}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 min-h-[58px] py-1.5 px-1 flex flex-col items-center justify-center relative transition-all duration-150 rounded-xl ${
                isActive
                  ? 'text-purple-700 font-bold'
                  : 'text-gray-500 hover:text-gray-800 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.id === 'YOU' && user ? (
                  <div
                    className={`w-6 h-6 rounded-full overflow-hidden transition-all ${
                      isActive ? 'ring-2 ring-purple-600 ring-offset-1 scale-110' : 'opacity-80'
                    }`}
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                    }`}
                  />
                )}

                {/* Badge indicator */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] mt-1 whitespace-nowrap tracking-tight transition-colors ${
                  isActive ? 'text-purple-700 font-bold' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>

              {isActive && (
                <div className="absolute bottom-1 w-5 h-1 bg-purple-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
