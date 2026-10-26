import React, { useState } from 'react';
import { X, Clock, ShieldCheck, Flame, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { wallService } from '../../services';
import { WallPair, ExpirationDuration } from '../../types';

interface CreateWallPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallPairs: WallPair[];
  selectedPairId?: string;
  onPostCreated: () => void;
}

export const CreateWallPostModal: React.FC<CreateWallPostModalProps> = ({
  isOpen,
  onClose,
  wallPairs,
  selectedPairId,
  onPostCreated,
}) => {
  const { user } = useAuth();
  const [pairId, setPairId] = useState(selectedPairId || wallPairs[0]?.id || 'wall_kumasi_accra');
  const [content, setContent] = useState('');
  const [expirationHours, setExpirationHours] = useState<ExpirationDuration>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const currentPair = wallPairs.find((p) => p.id === pairId) || wallPairs[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await wallService.createAnonymousPost(
        pairId,
        currentPair ? currentPair.originLocation : 'Kumasi',
        currentPair ? currentPair.destinationLocation : 'Accra',
        content,
        expirationHours,
        user.id
      );
      setContent('');
      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create anonymous post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-base text-gray-900">Post Anonymously to Wall</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Wall Pair Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Select Regional Corridor
            </label>
            <select
              value={pairId}
              onChange={(e) => setPairId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-purple-900 focus:outline-hidden focus:border-purple-600"
            >
              {wallPairs.map((pair) => (
                <option key={pair.id} value={pair.id}>
                  {pair.originLocation.toUpperCase()} ↔ {pair.destinationLocation.toUpperCase()} ({pair.originRegion} / {pair.destinationRegion})
                </option>
              ))}
            </select>
          </div>

          {/* Expiration choices */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Post Expiration Lifetime</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {([2, 6, 12, 24] as ExpirationDuration[]).map((hours) => (
                <button
                  type="button"
                  key={hours}
                  onClick={() => setExpirationHours(hours)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    expirationHours === hours
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {hours} Hours
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              This post will automatically disappear from the Wall after {expirationHours} hours.
            </p>
          </div>

          {/* Post Content */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Anonymous Message
            </label>
            <textarea
              required
              rows={4}
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Speak your mind anonymously... (e.g. thoughts on traffic, university life, regional vibes)"
              className="w-full p-3 bg-purple-50/30 border border-purple-100 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>500 characters max</span>
              <span>{content.length}/500</span>
            </div>
          </div>

          {/* Anonymous safety reminder */}
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 flex items-start gap-2 text-xs text-purple-950">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <span className="font-bold">Prototype privacy notice:</span> The public feed displays an alias, but owner links are stored in this browser. This is not production-grade anonymity; do not post sensitive information.
            </div>
          </div>

          {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Posting...' : 'Publish to Wall'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
