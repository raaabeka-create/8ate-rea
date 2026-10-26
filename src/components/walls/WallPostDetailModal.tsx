import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  ArrowBigUp,
  ArrowBigDown,
  Send,
  ShieldAlert,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { PublicAnonymousWallPost, WallReply } from '../../types';
import { wallService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useReport } from '../../context/ReportContext';

interface WallPostDetailModalProps {
  post: PublicAnonymousWallPost | null;
  onClose: () => void;
  onPostUpdated: (updatedPost: PublicAnonymousWallPost) => void;
}

export const WallPostDetailModal: React.FC<WallPostDetailModalProps> = ({
  post,
  onClose,
  onPostUpdated,
}) => {
  const { user } = useAuth();
  const { openReport } = useReport();
  const [replies, setReplies] = useState<WallReply[]>([]);
  const [newReplyText, setNewReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchReplies = async () => {
    if (!post) return;
    try {
      setLoadingReplies(true);
      const data = await wallService.getReplies(post.id);
      setReplies(data);
    } catch (err) {
      console.error('Failed to load replies', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  useEffect(() => {
    if (post) {
      fetchReplies();
    }
  }, [post?.id]);

  if (!post || !user) return null;

  const getRemainingTime = (expiresAt: number) => {
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
  };

  const handleVote = async (type: 'up' | 'down') => {
    try {
      const updated = await wallService.votePost(post.id, type, user.id);
      onPostUpdated(updated);
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  const handleVoteReply = async (replyId: string, type: 'up' | 'down') => {
    try {
      await wallService.voteReply(replyId, post.id, type, user.id);
      await fetchReplies();
    } catch (err) {
      console.error('Reply vote failed', err);
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim()) return;

    try {
      setSubmittingReply(true);
      await wallService.createReply(post.id, newReplyText.trim(), user.id);
      setNewReplyText('');
      await fetchReplies();
      // Update parent post reply count
      const updated = await wallService.getPostById(post.id);
      if (updated) onPostUpdated(updated);
    } catch (err) {
      console.error('Failed to reply', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-purple-900 bg-purple-100/80 px-2.5 py-1 rounded-lg">
              {post.originLocation.toUpperCase()} ↔ {post.destinationLocation.toUpperCase()}
            </span>
            <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getRemainingTime(post.expiresAt)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => openReport('wall_post', post.id, `Wall Post: "${post.content.slice(0, 40)}..."`)}
              title="Report post"
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main post card */}
          <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100">
            {/* Alias Badge */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                style={{ backgroundColor: post.anonymousAvatarBg }}
              >
                {post.anonymousAlias[0]}
              </div>
              <span className="font-bold text-xs text-gray-800">{post.anonymousAlias}</span>
            </div>

            <p className="text-sm text-gray-900 font-medium leading-relaxed">{post.content}</p>

            {/* Post actions */}
            <div className="mt-3 pt-3 border-t border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-xl border border-purple-100 shadow-2xs">
                <button
                  onClick={() => handleVote('up')}
                  className={`p-1 rounded transition-colors ${
                    post.userVote === 'up' ? 'text-purple-700 bg-purple-100' : 'text-gray-400 hover:text-purple-600'
                  }`}
                >
                  <ArrowBigUp className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-800 min-w-[20px] text-center">
                  {post.upvotes - post.downvotes}
                </span>
                <button
                  onClick={() => handleVote('down')}
                  className={`p-1 rounded transition-colors ${
                    post.userVote === 'down' ? 'text-purple-700 bg-purple-100' : 'text-gray-400 hover:text-purple-600'
                  }`}
                >
                  <ArrowBigDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>{replies.length} Anonymous Replies</span>
              </div>
            </div>
          </div>

          {/* Replies Thread */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Anonymous Conversation
            </h4>

            {loadingReplies ? (
              <div className="py-6 text-center text-xs text-gray-400">Loading replies...</div>
            ) : replies.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <p className="text-xs font-semibold text-gray-600">No replies yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Be the first Ghanaian to answer anonymously!
                </p>
              </div>
            ) : (
              replies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs flex items-start justify-between gap-2"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ backgroundColor: reply.anonymousAvatarBg }}
                      >
                        {reply.anonymousAlias[0]}
                      </div>
                      <span className="text-[11px] font-bold text-gray-800">
                        {reply.anonymousAlias}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 leading-normal">{reply.content}</p>
                  </div>

                  <div className="flex flex-col items-center shrink-0">
                    <button
                      onClick={() => handleVoteReply(reply.id, 'up')}
                      className={`p-0.5 ${reply.userVote === 'up' ? 'text-purple-700' : 'text-gray-400 hover:text-purple-600'}`}
                    >
                      <ArrowBigUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-bold text-gray-600">
                      {reply.upvotes - reply.downvotes}
                    </span>
                    <button
                      onClick={() => handleVoteReply(reply.id, 'down')}
                      className={`p-0.5 ${reply.userVote === 'down' ? 'text-purple-700' : 'text-gray-400 hover:text-purple-600'}`}
                    >
                      <ArrowBigDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reply input bar */}
        <form
          onSubmit={handleCreateReply}
          className="p-3 border-t border-purple-100 bg-gray-50/80 flex items-center gap-2"
        >
          <input
            type="text"
            required
            value={newReplyText}
            onChange={(e) => setNewReplyText(e.target.value)}
            placeholder="Reply anonymously as a Ghanaian alias..."
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600"
          />
          <button
            type="submit"
            disabled={submittingReply || !newReplyText.trim()}
            className="p-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-xs disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
