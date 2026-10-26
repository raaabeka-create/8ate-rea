import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Flame, Store, Compass, User, ArrowRight } from 'lucide-react';
import { searchService, SearchResults } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, HubListing, PublicAnonymousWallPost, DiscoverPost } from '../../types';
import { subscribeToBlocklistChanges } from '../../utils/safetyEvents';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  onSelectHubListing: (listing: HubListing) => void;
  onSelectWallPost: (post: PublicAnonymousWallPost) => void;
  onSelectDiscoverPost: (post: DiscoverPost) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onSelectHubListing,
  onSelectWallPost,
  onSelectDiscoverPost,
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    users: [],
    conversations: [],
    walls: [],
    hubs: [],
    discover: [],
  });
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'USERS' | 'HUBS' | 'WALLS' | 'DISCOVER'>('ALL');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ users: [], conversations: [], walls: [], hubs: [], discover: [] });
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults({ users: [], conversations: [], walls: [], hubs: [], discover: [] });
      return;
    }

    const runSearch = async () => {
      setIsSearching(true);
      try {
        const data = await searchService.globalSearch(query, user.id);
        setResults(data);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(() => { void runSearch(); }, 250);
    const unsubscribe = subscribeToBlocklistChanges(() => { void runSearch(); });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [query, user]);

  if (!isOpen) return null;

  const hasAnyResults =
    results.users.length > 0 ||
    results.conversations.length > 0 ||
    results.walls.length > 0 ||
    results.hubs.length > 0 ||
    results.discover.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Search input header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-purple-50/40">
          <Search className="w-5 h-5 text-purple-700 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Ghanaians, Hubs, Regional Walls, Topics..."
            className="w-full bg-transparent border-none text-base text-gray-900 placeholder-gray-400 focus:outline-hidden font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-sm font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {/* Filter categories */}
        {query.trim() && (
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            {(['ALL', 'USERS', 'HUBS', 'WALLS', 'DISCOVER'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeFilter === filter
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!query.trim() && (
            <div className="py-12 text-center text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-3 text-purple-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-gray-600">Search 8ATE Ghana</p>
              <p className="text-xs text-gray-400 mt-1">
                Find people by @username, explore marketplace items in ₵, or search regional walls.
              </p>
            </div>
          )}

          {query.trim() && !isSearching && !hasAnyResults && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm font-semibold text-gray-700">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching for a town (e.g. Kumasi, Osu), a category (e.g. Housing, Jobs), or a Ghanaian name.
              </p>
            </div>
          )}

          {/* Users section */}
          {(activeFilter === 'ALL' || activeFilter === 'USERS') && results.users.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>Ghanaians ({results.users.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-gray-50 hover:bg-purple-50 transition-colors flex items-center justify-between cursor-pointer border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-200"
                      />
                      <div>
                        <div className="font-bold text-sm text-gray-900">{u.displayName}</div>
                        <div className="text-xs text-purple-700 font-medium">@{u.username} • {u.city}</div>
                      </div>
                    </div>
                    <button className="text-xs font-semibold text-purple-700 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hub Listings section */}
          {(activeFilter === 'ALL' || activeFilter === 'HUBS') && results.hubs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Store className="w-3.5 h-3.5 text-purple-600" />
                <span>Ghana Hubs Marketplace ({results.hubs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.hubs.map((hub) => (
                  <div
                    key={hub.id}
                    onClick={() => {
                      onSelectHubListing(hub);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 mb-1">
                        <span>{hub.category}</span>
                        <span className="text-gray-500">{hub.city}</span>
                      </div>
                      <div className="font-bold text-sm text-gray-900 line-clamp-1">{hub.title}</div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{hub.description}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-extrabold text-sm text-purple-900">₵{hub.price.toLocaleString()}</span>
                      <span className="text-xs font-semibold text-purple-600 flex items-center">
                        View <ArrowRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regional Walls section */}
          {(activeFilter === 'ALL' || activeFilter === 'WALLS') && results.walls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Flame className="w-3.5 h-3.5 text-purple-600" />
                <span>Anonymous Regional Walls ({results.walls.length})</span>
              </div>
              <div className="space-y-2">
                {results.walls.map((wall) => (
                  <div
                    key={wall.id}
                    onClick={() => {
                      onSelectWallPost(wall);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 hover:border-purple-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-extrabold text-purple-800 tracking-tight">
                        {wall.originLocation} ↔ {wall.destinationLocation}
                      </span>
                      <span className="text-[11px] font-medium text-gray-500">
                        {wall.anonymousAlias}
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 leading-relaxed font-medium">{wall.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discover posts section */}
          {(activeFilter === 'ALL' || activeFilter === 'DISCOVER') && results.discover.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Compass className="w-3.5 h-3.5 text-purple-600" />
                <span>Discover Feeds ({results.discover.length})</span>
              </div>
              <div className="space-y-2">
                {results.discover.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      onSelectDiscoverPost(post);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-white border border-gray-200 hover:border-purple-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-gray-900">{post.author.displayName}</span>
                      <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
                        {post.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
