import React from 'react';
import { X, MapPin, Tag, MessageSquare, ShieldAlert, CheckCircle2, Bookmark } from 'lucide-react';
import { HubListing, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useReport } from '../../context/ReportContext';

interface ListingDetailModalProps {
  listing: HubListing | null;
  isSaved?: boolean;
  onClose: () => void;
  onStartChatWithSeller: (seller: UserProfile, listingTitle: string) => void;
  onToggleSave: (listingId: string) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  isSaved = false,
  onClose,
  onStartChatWithSeller,
  onToggleSave,
}) => {
  const { user } = useAuth();
  const { openReport } = useReport();

  if (!listing) return null;

  const isMyListing = user?.id === listing.sellerId;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold">
            {listing.category}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleSave(listing.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isSaved
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-purple-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-purple-700' : ''}`} />
            </button>
            <button
              onClick={() => openReport('hub_listing', listing.id, `Listing: "${listing.title}"`)}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main Photo */}
          {listing.images && listing.images.length > 0 && (
            <div className="w-full h-56 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={listing.images[0]}
                alt={listing.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & Price */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-extrabold text-gray-900 leading-snug">
                {listing.title}
              </h2>
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-purple-900">
                  ₵{listing.price.toLocaleString()}
                </span>
                {listing.isNegotiable && (
                  <span className="block text-[10px] font-semibold text-purple-700">Negotiable</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>
                {listing.city}, {listing.region}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Description
            </h4>
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {/* Seller Card */}
          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={listing.seller.avatarUrl}
                alt={listing.seller.displayName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-200"
              />
              <div>
                <div className="text-xs font-extrabold text-gray-900 flex items-center gap-1">
                  <span>{listing.seller.displayName}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-[11px] text-purple-700 font-medium">
                  @{listing.seller.username} • {listing.seller.city}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
          {!isMyListing ? (
            <button
              onClick={() => {
                onStartChatWithSeller(
                  {
                    id: listing.seller.id,
                    username: listing.seller.username,
                    displayName: listing.seller.displayName,
                    avatarUrl: listing.seller.avatarUrl,
                    region: listing.seller.region,
                    city: listing.seller.city,
                    phoneNumber: '',
                    createdAt: Date.now(),
                  },
                  listing.title
                );
                onClose();
              }}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message Seller on 8ATE Chat</span>
            </button>
          ) : (
            <div className="w-full py-2 text-center text-xs font-bold text-gray-500 bg-gray-100 rounded-xl">
              This is your listing
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
