import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Clock,
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { PublicAnonymousWallPost, WallPair } from '../../types';
import { wallService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { CreateWallPostModal } from './CreateWallPostModal';
import { WallPostDetailModal } from './WallPostDetailModal';

export const WallFeed: React.FC = () => {
  const { user } = useAuth();
  const [wallPairs, setWallPairs] = useState<WallPair[]>([]);
  const [selectedPairId, setSelectedPairId] = useState<string>('ALL');
  const [posts, setPosts] = useState<PublicAnonymousWallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallError, setWallError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePostDetail, setActivePostDetail] = useState<PublicAnonymousWallPost | null>(null);

  const loadWallsData = async () => {
    try {
      setLoading(true);
      setWallError(null);
      const pairs = await wallService.getWallPairs();
      setWallPairs(pairs);

      const activePosts = await wallService.getActivePosts(
        selectedPairId === 'ALL' ? undefined : selectedPairId,
        undefined,
        undefined,
        user?.id
      );
      setPosts(activePosts);
    } catch (err) {
      console.error('Error loading wall feed', err);
      setWallError(err instanceof Error ? err.message : 'Could not load the Wall feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallsData();
  }, [selectedPairId, user?.id]);

  const handleVote = async (e: React.MouseEvent, post: PublicAnonymousWallPost, type: 'up' | 'down') => {
    e.stopPropagation();
    if (!user) return;
    try {
      const updated = await wallService.votePost(post.id, type, user.id);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error('Vote failed', err);
      setWallError(err instanceof Error ? err.message : 'Your vote could not be saved.');
    }
  };

  const getRemainingTime = (expiresAt: number) => {
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FC] pb-24 relative">
      {wallError && <div role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">{wallError}</div>}
      {/* Top Banner Notice */}
      <div className="p-3 bg-purple-700 text-white shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
            <div>
              <h2 className="text-xs font-black tracking-wide uppercase">
                Ghana Anonymous Regional Walls
              </h2>
              <p className="text-[11px] text-purple-200">
                Temporary cross-town conversations. Public posts use aliases; prototype storage is not secure.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Demo anonymity only</span>
          </div>
        </div>
      </div>

      {/* Regional Corridor Selector Tabs */}
      <div className="bg-white border-b border-purple-100 p-2.5 sticky top-14 z-10 shadow-2xs overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setSelectedPairId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              selectedPairId === 'ALL'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
            }`}
          >
            All Ghana Corridors
          </button>

          {wallPairs.map((pair) => (
            <button
              key={pair.id}
              onClick={() => setSelectedPairId(pair.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-tight whitespace-nowrap transition-all ${
                selectedPairId === pair.id
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
              }`}
            >
              {pair.originLocation.toUpperCase()} ↔ {pair.destinationLocation.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Stream */}
      <div className="max-w-2xl mx-auto w-full p-4 space-y-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading regional wall posts...</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Flame className="w-12 h-12 text-purple-300 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-gray-700">No active posts on this Wall corridor</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Be the first to share an anonymous story, tip, or thought with fellow Ghanaians!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Post Anonymously
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActivePostDetail(post)}
              className="p-4 rounded-2xl bg-white border border-purple-100/80 shadow-xs hover:border-purple-300 transition-all cursor-pointer relative"
            >
              {/* Corridor & Expiration header */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-extrabold text-[11px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md tracking-tight">
                  {post.originLocation.toUpperCase()} ↔ {post.destinationLocation.toUpperCase()}
                </span>

                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{getRemainingTime(post.expiresAt)}</span>
                </span>
              </div>

              {/* Content */}
              <p className="text-xs text-gray-900 font-medium leading-relaxed mb-3">
                {post.content}
              </p>

              {/* Bottom footer: Alias + Votes + Replies */}
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                {/* Anonymous Alias */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                    style={{ backgroundColor: post.anonymousAvatarBg }}
                  >
                    {post.anonymousAlias[0]}
                  </div>
                  <span className="text-[11px] font-bold text-gray-700">{post.anonymousAlias}</span>
                </div>

                {/* Vote & Reply Buttons */}
                <div className="flex items-center gap-3">
                  {/* Upvote/Downvote */}
                  <div className="flex items-center gap-0.5 bg-gray-50 px-2 py-0.5 rounded-xl border border-gray-200">
                    <button
                      onClick={(e) => handleVote(e, post, 'up')}
                      className={`p-1 rounded transition-colors ${
                        post.userVote === 'up' ? 'text-purple-700' : 'text-gray-400 hover:text-purple-600'
                      }`}
                    >
                      <ArrowBigUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-gray-800 min-w-[16px] text-center">
                      {post.upvotes - post.downvotes}
                    </span>
                    <button
                      onClick={(e) => handleVote(e, post, 'down')}
                      className={`p-1 rounded transition-colors ${
                        post.userVote === 'down' ? 'text-purple-700' : 'text-gray-400 hover:text-purple-600'
                      }`}
                    >
                      <ArrowBigDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Replies count */}
                  <div className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.replyCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button: Post to Wall */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        id="btn-post-wall"
        aria-label="Post to Wall"
        className="fixed bottom-20 right-4 sm:right-6 md:right-8 z-20 px-4 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white shadow-lg shadow-purple-700/30 flex items-center gap-2 font-bold text-xs transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Post Anonymously</span>
      </button>

      {/* Create Modal */}
      <CreateWallPostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        wallPairs={wallPairs}
        selectedPairId={selectedPairId === 'ALL' ? undefined : selectedPairId}
        onPostCreated={loadWallsData}
      />

      {/* Detail & Replies Modal */}
      <WallPostDetailModal
        post={activePostDetail}
        onClose={() => setActivePostDetail(null)}
        onPostUpdated={(updated) => {
          setActivePostDetail(updated);
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />
    </div>
  );
};
