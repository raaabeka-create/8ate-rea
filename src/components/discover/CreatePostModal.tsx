import React, { useState } from 'react';
import { X, Compass, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { discoverService } from '../../services';
import { DiscoverCategory } from '../../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<DiscoverCategory>('Ghana Now');
  const [tagsInput, setTagsInput] = useState('#AccraVibes #GhanaNow');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const categories: DiscoverCategory[] = [
    'Trending',
    'Ghana Now',
    'Campus Life',
    'Tech & Startups',
    'Football',
    'Entertainment',
    'Business',
    'Lifestyle',
  ];

  const sampleImages = [
    { label: 'None', url: '' },
    { label: 'Accra Skyline', url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80' },
    { label: 'Ghana Tech / Work', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80' },
    { label: 'Campus / Students', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80' },
    { label: 'Ghana Football', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const tags = tagsInput
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await discoverService.createPost(
        user.id,
        content.trim(),
        category,
        tags,
        selectedImageUrl || undefined
      );

      setContent('');
      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish Discover post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-base text-gray-900">Create Discover Post</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Select Category
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    category === cat
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Post Content */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              What&apos;s happening in Ghana?
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share news, campus updates, Ghanaian business insights, or community questions..."
              className="w-full p-3 bg-purple-50/30 border border-purple-100 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="#Kumasi #Tech #GhanaNow"
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600"
            />
          </div>

          {/* Photo sample selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Add Photo Banner (optional)
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sampleImages.map((sample) => (
                <div
                  key={sample.label}
                  onClick={() => setSelectedImageUrl(sample.url ? sample.url : null)}
                  className={`cursor-pointer rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImageUrl === sample.url || (!selectedImageUrl && !sample.url)
                      ? 'border-purple-600 ring-2 ring-purple-300'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {sample.url ? (
                    <img
                      src={sample.url}
                      alt={sample.label}
                      referrerPolicy="no-referrer"
                      className="w-16 h-12 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                      No Photo
                    </div>
                  )}
                  <div className="text-[9px] font-bold text-center bg-gray-900/80 text-white truncate px-1">
                    {sample.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
              <span>{loading ? 'Posting...' : 'Share to Discover'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
