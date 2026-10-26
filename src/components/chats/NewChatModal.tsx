import React, { useState } from 'react';
import { X, Search, Users, UserPlus, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDirectUser: (user: UserProfile) => Promise<string | null>;
  onCreateGroup: (memberIds: string[], groupName: string) => Promise<string | null>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectDirectUser,
  onCreateGroup,
}) => {
  const { allUsers, user: currentUser, privateInfo } = useAuth();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const filteredUsers = allUsers.filter(
    (u) =>
      u.id !== currentUser.id &&
      !privateInfo?.blockedUserIds.includes(u.id) &&
      (u.displayName.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.city.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleMember = (userId: string) => {
    if (selectedGroupMemberIds.includes(userId)) {
      setSelectedGroupMemberIds(selectedGroupMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedGroupMemberIds([...selectedGroupMemberIds, userId]);
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMemberIds.length === 0) {
      setModalError('Enter a group name and select at least one other member.');
      return;
    }
    setModalError(null);
    const error = await onCreateGroup(selectedGroupMemberIds, groupName.trim());
    if (error) setModalError(error);
    else onClose();
  };

  const handleSelectDirectUser = async (targetUser: UserProfile) => {
    setModalError(null);
    const error = await onSelectDirectUser(targetUser);
    if (error) setModalError(error);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
          <h2 className="font-extrabold text-base text-gray-900">
            {mode === 'direct' ? 'New Conversation' : 'Create Group Chat'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="p-3 border-b border-gray-100 flex gap-2">
          <button
            onClick={() => setMode('direct')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'direct' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Direct Message</span>
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'group' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Chat</span>
          </button>
        </div>

        {/* Group Name input if mode == group */}
        {mode === 'group' && (
          <div className="px-4 pt-3">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={80}
              placeholder="Enter Group Subject (e.g. KNUST Study Circle 🇬🇭)"
              className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600"
            />
          </div>
        )}

        {modalError && (
          <div role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
            {modalError}
          </div>
        )}

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Ghanaians by name or town..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-purple-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {filteredUsers.map((u) => {
            const isSelected = selectedGroupMemberIds.includes(u.id);

            return (
              <div
                key={u.id}
                onClick={() => {
                  if (mode === 'direct') {
                    void handleSelectDirectUser(u);
                  } else {
                    toggleMember(u.id);
                  }
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatarUrl}
                    alt={u.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-200"
                  />
                  <div>
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1">
                      {u.displayName}
                      {u.verified && <span className="text-purple-600 text-[9px] font-semibold" title="Demo profile flag; not identity verified">Demo</span>}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      @{u.username} • {u.city}
                    </div>
                  </div>
                </div>

                {mode === 'direct' ? (
                  <button className="text-xs font-semibold text-purple-700 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                ) : (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMember(u.id)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Group Submit action */}
        {mode === 'group' && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-600 font-medium">
              {selectedGroupMemberIds.length} member(s) selected
            </span>
            <button
              onClick={handleCreateGroupSubmit}
              disabled={!groupName.trim() || selectedGroupMemberIds.length === 0}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
            >
              Create Group
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
