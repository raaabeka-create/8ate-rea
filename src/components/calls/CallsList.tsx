import React, { useState, useEffect } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { CallRecord, UserProfile } from '../../types';
import { callService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';

export const CallsList: React.FC = () => {
  const { user, allUsers } = useAuth();
  const { startCall } = useCall();
  const [callLogs, setCallLogs] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialModalOpen, setIsDialModalOpen] = useState(false);

  const loadLogs = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await callService.getCallRecords(user.id);
      setCallLogs(data);
    } catch (err) {
      console.error('Failed to load call logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [user]);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCallIcon = (record: CallRecord) => {
    if (record.direction === 'missed' || record.status === 'missed') {
      return <PhoneMissed className="w-3.5 h-3.5 text-red-500" />;
    }
    if (record.direction === 'outgoing') {
      return <PhoneOutgoing className="w-3.5 h-3.5 text-purple-600" />;
    }
    return <PhoneIncoming className="w-3.5 h-3.5 text-emerald-600" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FC] pb-24 relative">
      {/* Dev Call Architecture notice */}
      <div className="p-3 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-purple-900 font-medium">
          <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0" />
          <span>Call history is demo-only; live audio/video is not implemented.</span>
        </div>
      </div>

      {/* Call History */}
      <div className="max-w-2xl mx-auto w-full p-4 flex-1 overflow-y-auto divide-y divide-gray-100 bg-white rounded-2xl border border-purple-100 shadow-xs my-4">
        <div className="flex items-center justify-between pb-3">
          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
            Recent Calls in Ghana
          </h3>
          <button
            onClick={() => setIsDialModalOpen(true)}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Call</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading call history...</div>
        ) : callLogs.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Phone className="w-10 h-10 text-purple-300 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-xs font-bold text-gray-700">No recent calls</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Call any friend or contact across Ghana with crisp audio.
            </p>
          </div>
        ) : (
          callLogs.map((log) => {
            const other = log.otherUser;

            return (
              <div
                key={log.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-purple-50/40 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={other.avatarUrl}
                    alt={other.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-gray-900 truncate">
                      {other.displayName}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                      {getCallIcon(log)}
                      <span className="capitalize">{log.direction}</span>
                      <span>•</span>
                      <span>{formatTimestamp(log.startedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startCall(other, 'voice')}
                    className="p-2 text-purple-700 hover:bg-purple-100 rounded-xl transition-colors"
                    title="Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCall(other, 'video')}
                    className="p-2 text-purple-700 hover:bg-purple-100 rounded-xl transition-colors"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dial New Call Modal */}
      {isDialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
              <h3 className="font-bold text-sm text-gray-900">Start Call</h3>
              <button
                onClick={() => setIsDialModalOpen(false)}
                className="text-xs font-bold text-gray-500 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {allUsers
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-xl border border-gray-100 hover:bg-purple-50/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {u.displayName}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          @{u.username} • {u.city}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setIsDialModalOpen(false);
                          startCall(u, 'voice');
                        }}
                        className="p-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
                        title="Voice Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsDialModalOpen(false);
                          startCall(u, 'video');
                        }}
                        className="p-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
                        title="Video Call"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
