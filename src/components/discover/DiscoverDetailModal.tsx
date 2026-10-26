import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Send,
  ShieldAlert,
  MapPin,
} from 'lucide-react';
import { DiscoverPost, DiscoverComment, UserProfile } from '../../types';
import { discoverService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useReport } from '../../context/ReportContext';

interface DiscoverDetailModalProps {
  post: DiscoverPost | null;
  onClose: () => void;
  onPostUpdated: (updatedPost: DiscoverPost) => void;
  onStartDirectChat: (user: UserProfile) => void;
}

export const DiscoverDetailModal: React.FC<DiscoverDetailModalProps> = ({
  post,
  onClose,
  onPostUpdated,
  onStartDirectChat,
}) => {
  const { user } = useAuth();
  const { openReport } = useReport();
  const [comments, setComments] = useState<DiscoverComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!post) return;
    try {
      setLoadingComments(true);
      setDetailError(null);
      const data = await discoverService.getComments(post.id, user?.id);
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments', err);
      setDetailError(err instanceof Error ? err.message : 'Could not load comments.');
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (post) {
      fetchComments();
    }
  }, [post?.id]);

  if (!post || !user) return null;

  const handleToggleLike = async () => {
    try {
      const updated = await discoverService.toggleLike(post.id, user.id);
      onPostUpdated(updated);
    } catch (err) {
      console.error('Like failed', err);
      setDetailError(err instanceof Error ? err.message : 'Your like could not be saved.');
    }
  };

  const handleToggleBookmark = async () => {
    try {
      const isBookmarked = await discoverService.toggleBookmark(post.id, user.id);
      onPostUpdated({ ...post, isBookmarked });
    } catch (err) {
      console.error('Bookmark failed', err);
      setDetailError(err instanceof Error ? err.message : 'Your bookmark could not be saved.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      setDetailError(null);
      await discoverService.addComment(post.id, user.id, commentText.trim());
      setCommentText('');
      await fetchComments();
      const updated = await discoverService.getPostById(post.id, user.id);
      if (updated) onPostUpdated(updated);
    } catch (err) {
      console.error('Failed to post comment', err);
      setDetailError(err instanceof Error ? err.message : 'Your comment could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-purple-100 flex items-center justify-between bg-white">
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
              <div className="text-[11px] text-purple-700 font-medium">
                @{post.author.username} • {post.author.city}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => openReport('discover_post', post.id, `Discover Post by @${post.author.username}`)}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {detailError && <div role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">{detailError}</div>}

        {/* Scrollable Post & Comments */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Category badge */}
          <span className="inline-block px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold">
            {post.category}
          </span>

          {/* Text Content */}
          <p className="text-xs text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Photo Media */}
          {post.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img
                src={post.imageUrl}
                alt="Post Media"
                referrerPolicy="no-referrer"
                className="w-full max-h-72 object-cover"
              />
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Action Stats Bar */}
          <div className="py-2 border-y border-gray-100 flex items-center justify-around text-xs font-bold text-gray-600">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 p-1 rounded-lg transition-colors ${
                post.isLiked ? 'text-red-600' : 'hover:text-red-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-600 text-red-600' : ''}`} />
              <span>{post.likesCount}</span>
            </button>

            <div className="flex items-center gap-1.5 p-1 text-purple-700">
              <MessageSquare className="w-4 h-4" />
              <span>{post.commentsCount} comments</span>
            </div>

            <button
              onClick={handleToggleBookmark}
              className={`flex items-center gap-1.5 p-1 rounded-lg transition-colors ${
                post.isBookmarked ? 'text-purple-700' : 'hover:text-purple-700'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-purple-700' : ''}`} />
              <span>Save</span>
            </button>

            {post.author.id !== user.id && (
              <button
                onClick={() => {
                  onStartDirectChat(post.author);
                  onClose();
                }}
                className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
              >
                Chat
              </button>
            )}
          </div>

          {/* Comments list */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Discussion
            </h4>

            {loadingComments ? (
              <div className="py-6 text-center text-xs text-gray-400">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs">
                No comments yet. Join the conversation!
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-start gap-2.5"
                >
                  <img
                    src={c.author.avatarUrl}
                    alt={c.author.displayName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-200 shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-gray-900">{c.author.displayName}</span>
                      <span className="text-[10px] text-gray-400">@{c.author.username}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 leading-normal">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Comment Composer */}
        <form
          onSubmit={handleAddComment}
          className="p-3 border-t border-purple-100 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            required
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-3.5 py-2 text-xs bg-purple-50/40 border border-purple-100 rounded-xl focus:outline-hidden focus:border-purple-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={submitting || !commentText.trim()}
            className="p-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-xs disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
