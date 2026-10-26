import React, { useState, useEffect } from 'react';
import {
  Compass,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { DiscoverPost, DiscoverCategory, UserProfile } from '../../types';
import { discoverService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { CreatePostModal } from './CreatePostModal';
import { DiscoverDetailModal } from './DiscoverDetailModal';

interface DiscoverFeedProps {
  onStartDirectChat: (user: UserProfile) => void;
}

export const DiscoverFeed: React.FC<DiscoverFeedProps> = ({ onStartDirectChat }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DiscoverCategory | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePost, setActivePost] = useState<DiscoverPost | null>(null);

  const categories: (DiscoverCategory | 'ALL')[] = [
    'ALL',
    'Trending',
    'Ghana Now',
    'Campus Life',
    'Tech & Startups',
    'Football',
    'Entertainment',
    'Business',
    'Lifestyle',
  ];

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await discoverService.getPosts(
        selectedCategory === 'ALL' ? undefined : selectedCategory,
        undefined,
        user?.id
      );
      setPosts(data);
    } catch (err) {
      console.error('Failed to load Discover posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, user?.id]);

  const handleToggleLike = async (e: React.MouseEvent, post: DiscoverPost) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const updated = await discoverService.toggleLike(post.id, user.id);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error('Like toggle failed', err);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent, post: DiscoverPost) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const isBookmarked = await discoverService.toggleBookmark(post.id, user.id);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isBookmarked } : p))
      );
    } catch (err) {
      console.error('Bookmark toggle failed', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FC] pb-24 relative">
      {/* Categories Bar */}
      <div className="p-3 bg-white border-b border-purple-100 sticky top-14 z-10 shadow-2xs overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center gap-1.5 min-w-max">
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
              {cat === 'Trending' ? '🔥 Trending' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Stream */}
      <div className="max-w-2xl mx-auto w-full p-4 space-y-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading Discover feed...</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Compass className="w-12 h-12 text-purple-300 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-gray-700">No posts in this category yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Share what is happening around you in Ghana today!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Create First Post
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActivePost(post)}
              className="bg-white rounded-2xl border border-purple-100/80 shadow-xs hover:border-purple-300 transition-all cursor-pointer overflow-hidden p-4 group"
            >
              {/* Author Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={post.author.avatarUrl}
                    alt={post.author.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-200"
                  />
                  <div>
                    <div className="flex items-center gap-1 font-bold text-xs text-gray-900">
                      <span>{post.author.displayName}</span>
                      {post.author.verified && (
                        <span className="text-[9px] text-purple-600 font-semibold" title="Demo profile flag; not identity verified">Demo</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">
                      @{post.author.username} • {post.author.city}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold">
                  {post.category}
                </span>
              </div>

              {/* Text content */}
              <p className="text-xs text-gray-900 leading-relaxed font-medium mb-3 whitespace-pre-wrap">
                {post.content}
              </p>

              {/* Optional Photo */}
              {post.imageUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 max-h-72">
                  <img
                    src={post.imageUrl}
                    alt="Post Media"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-300"
                  />
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] text-purple-700 font-semibold bg-purple-50/60 px-2 py-0.5 rounded-md"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                <div className="flex items-center gap-4">
                  {/* Like */}
                  <button
                    onClick={(e) => handleToggleLike(e, post)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      post.isLiked ? 'text-red-600' : 'hover:text-red-600'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        post.isLiked ? 'fill-red-600 text-red-600' : ''
                      }`}
                    />
                    <span>{post.likesCount}</span>
                  </button>

                  {/* Comment */}
                  <div className="flex items-center gap-1.5 text-gray-600 hover:text-purple-700">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Bookmark */}
                  <button
                    onClick={(e) => handleToggleBookmark(e, post)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      post.isBookmarked ? 'text-purple-700' : 'hover:text-purple-700'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        post.isBookmarked ? 'fill-purple-700' : ''
                      }`}
                    />
                  </button>

                  {post.author.id !== user?.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartDirectChat(post.author);
                      }}
                      className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      Chat
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button: Create Post */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        id="btn-new-discover-post"
        aria-label="Create Post"
        className="fixed bottom-20 right-4 sm:right-6 md:right-8 z-20 px-4 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white shadow-lg shadow-purple-700/30 flex items-center gap-2 font-bold text-xs transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Create Post</span>
      </button>

      {/* Create Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={loadPosts}
      />

      {/* Detail Modal */}
      <DiscoverDetailModal
        post={activePost}
        onClose={() => setActivePost(null)}
        onPostUpdated={(updated) => {
          setActivePost(updated);
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
        onStartDirectChat={onStartDirectChat}
      />
    </div>
  );
};
