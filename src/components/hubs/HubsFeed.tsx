import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Plus,
  MapPin,
  Bookmark,
} from 'lucide-react';
import { HubListing, HubCategory, GhanaRegion, UserProfile } from '../../types';
import { hubService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { GHANA_REGIONS } from '../../data/ghanaData';
import { CreateListingModal } from './CreateListingModal';
import { ListingDetailModal } from './ListingDetailModal';

interface HubsFeedProps {
  onStartChatWithSeller: (seller: UserProfile, listingTitle: string) => void;
}

export const HubsFeed: React.FC<HubsFeedProps> = ({ onStartChatWithSeller }) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<HubListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<HubCategory | 'ALL'>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<GhanaRegion | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeListing, setActiveListing] = useState<HubListing | null>(null);

  const categories: (HubCategory | 'ALL')[] = [
    'ALL',
    'Housing',
    'Jobs',
    'Marketplace',
    'Services',
    'Transport',
    'Food',
    'Education',
    'Events',
    'Football',
    'Music',
  ];

  const loadListings = async () => {
    try {
      setLoading(true);
      setFeedError(null);
      const data = await hubService.getListings({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        region: selectedRegion === 'ALL' ? undefined : selectedRegion,
        searchQuery: search.trim() || undefined,
      });
      setListings(data);

      if (user) {
        const saved = await hubService.getSavedListings(user.id);
        setSavedIds(new Set(saved.map((s) => s.id)));
      }
    } catch (err) {
      console.error('Failed to load Hub listings', err);
      setFeedError(err instanceof Error ? err.message : 'Could not load Hub listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [selectedCategory, selectedRegion, search, user]);

  const handleToggleSave = async (listingId: string) => {
    if (!user) return;
    try {
      const isSaved = await hubService.toggleSaveListing(listingId, user.id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
    } catch (err) {
      console.error('Save toggle failed', err);
      setFeedError(err instanceof Error ? err.message : 'Your saved-listing change could not be stored.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FC] pb-24 relative">
      {feedError && <div role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">{feedError}</div>}
      {/* Top Search & Filter Bar */}
      <div className="p-3 bg-white border-b border-purple-100 sticky top-14 z-10 space-y-2.5 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-purple-600 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items, rentals, jobs, services in Ghana..."
              className="w-full pl-9 pr-3 py-2 bg-purple-50/40 border border-purple-100 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white"
            />
          </div>

          {/* Region selector */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value as any)}
            className="px-2.5 py-2 bg-purple-50/50 border border-purple-100 rounded-xl text-xs font-bold text-purple-900 focus:outline-hidden focus:border-purple-600"
          >
            <option value="ALL">All Ghana Regions</option>
            {GHANA_REGIONS.map((r) => (
              <option key={r.region} value={r.region}>
                {r.region}
              </option>
            ))}
          </select>
        </div>

        {/* Categories Pills */}
        <div className="max-w-4xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="max-w-4xl mx-auto w-full p-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading Hub listings...</div>
        ) : listings.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Store className="w-12 h-12 text-purple-300 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-gray-700">No listings found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Try adjusting your category or region filters, or post your own listing.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Create Hub Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {listings.map((item) => {
              const isSaved = savedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveListing(item)}
                  className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-xs hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  {/* Photo banner */}
                  <div className="h-40 relative bg-gray-100 overflow-hidden">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                      {item.category}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSave(item.id);
                      }}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 backdrop-blur-xs transition-colors ${
                        isSaved ? 'text-purple-700' : 'text-gray-600 hover:text-purple-700'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-purple-700' : ''}`} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-baseline justify-between gap-1 mb-1">
                        <span className="text-base font-black text-purple-950">
                          ₵{item.price.toLocaleString()}
                        </span>
                        {item.isNegotiable && (
                          <span className="text-[10px] font-bold text-purple-700">Negotiable</span>
                        )}
                      </div>
                      <h3 className="font-bold text-xs text-gray-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">{item.city}, {item.region}</span>
                      </div>
                      <span className="text-purple-700 font-bold shrink-0">View Details</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        id="btn-new-listing"
        aria-label="Post listing"
        className="fixed bottom-20 right-4 sm:right-6 md:right-8 z-20 px-4 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white shadow-lg shadow-purple-700/30 flex items-center gap-2 font-bold text-xs transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Post Listing</span>
      </button>

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onListingCreated={loadListings}
      />

      {/* Listing Detail Modal */}
      <ListingDetailModal
        listing={activeListing}
        isSaved={activeListing ? savedIds.has(activeListing.id) : false}
        onClose={() => setActiveListing(null)}
        onStartChatWithSeller={onStartChatWithSeller}
        onToggleSave={handleToggleSave}
      />
    </div>
  );
};
