import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Mic,
  MicOff,
  Send,
  Check,
  Pencil,
  X,
  Smile,
  Trash2,
  ShieldAlert,
  Play,
  Image as ImageIcon,
} from 'lucide-react';
import { Conversation, ChatMessage, UserProfile } from '../../types';
import { chatService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useReport } from '../../context/ReportContext';

interface ChatRoomProps {
  conversationId: string;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ conversationId, onBack }) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const { openReport } = useReport();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChat = async () => {
    if (!user) return;
    try {
      setChatError(null);
      const conv = await chatService.getConversationById(conversationId, user.id);
      setConversation(conv);
      const msgs = await chatService.getMessages(conversationId, user.id);
      setMessages(msgs);
      await chatService.markAsRead(conversationId, user.id);
    } catch (err) {
      console.error('Error loading chat room', err);
      setChatError('Unable to load this conversation. Check local storage and try again.');
    }
  };

  useEffect(() => {
    setEditingMessageId(null);
    setEditDraft('');
    setActiveReactionMsgId(null);
    loadChat();
  }, [conversationId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording timer
  useEffect(() => {
    let interval: any = null;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setVoiceDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setVoiceDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingVoice]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    const text = inputText;
    try {
      await chatService.sendTextMessage(conversationId, user.id, text);
      setInputText('');
      setChatError(null);
      await loadChat();
    } catch (err) {
      console.error('Failed to send text', err);
      setChatError('Message could not be saved. Your draft is still here; please try again.');
    }
  };

  const handleSendVoiceNote = async () => {
    if (!user || voiceDuration === 0) {
      setIsRecordingVoice(false);
      return;
    }
    try {
      await chatService.sendVoiceNote(conversationId, user.id, voiceDuration);
      setIsRecordingVoice(false);
      await loadChat();
    } catch (err) {
      console.error('Failed to send voice note', err);
      setChatError('The demo voice-note placeholder could not be saved.');
      setIsRecordingVoice(false);
    }
  };

  const handleSendImage = async (url: string) => {
    if (!user) return;
    try {
      await chatService.sendMediaMessage(conversationId, user.id, url, 'Photo from Ghana');
      setShowAttachMenu(false);
      await loadChat();
    } catch (err) {
      console.error('Failed to send image', err);
      setChatError('The sample image message could not be saved.');
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      await chatService.toggleReaction(messageId, conversationId, user.id, emoji);
      setActiveReactionMsgId(null);
      await loadChat();
    } catch (err) {
      console.error('Reaction failed', err);
      setChatError('Your reaction could not be saved.');
    }
  };

  const handleDeleteMsg = async (messageId: string) => {
    if (!user) return;
    try {
      await chatService.deleteMessage(messageId, conversationId, user.id);
      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setEditDraft('');
      }
      await loadChat();
    } catch (err) {
      console.error('Delete message failed', err);
      setChatError('Message could not be deleted.');
    }
  };

  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditDraft(message.content);
    setChatError(null);
    setActiveReactionMsgId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent, messageId: string) => {
    e.preventDefault();
    if (!user) return;
    try {
      await chatService.editTextMessage(messageId, conversationId, user.id, editDraft);
      setEditingMessageId(null);
      setEditDraft('');
      setChatError(null);
      await loadChat();
    } catch (err) {
      console.error('Failed to edit message', err);
      setChatError(err instanceof Error ? err.message : 'Message could not be edited.');
    }
  };

  const otherUser = conversation?.isGroup ? undefined : conversation?.participants.find((p) => p.id !== user?.id);

  const getChatTitle = () => {
    if (!conversation) return 'Chat';
    if (conversation.isGroup) return conversation.name || 'Ghana Group';
    return otherUser?.displayName || 'Contact';
  };

  const getChatSubtitle = () => {
    if (!conversation) return '';
    if (conversation.isGroup) {
      return `${conversation.participants.length} Ghanaian members`;
    }
    return otherUser ? `@${otherUser.username} • ${otherUser.city}, ${otherUser.region}` : '';
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FC] relative">
      {/* Top Header */}
      <div className="p-3 border-b border-purple-100 bg-white/95 backdrop-blur flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <img
            src={
              conversation?.isGroup
                ? conversation.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80'
                : otherUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
            }
            alt={getChatTitle()}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-200 shrink-0"
          />

          <div className="min-w-0">
            <h2 className="font-bold text-xs text-gray-900 truncate flex items-center gap-1">
              <span>{getChatTitle()}</span>
              {otherUser?.verified && <span className="text-[9px] text-purple-600" title="Demo profile flag; not identity verified">Demo</span>}
            </h2>
            <p className="text-[11px] text-purple-700 truncate font-medium">{getChatSubtitle()}</p>
          </div>
        </div>

        {/* Action buttons: Voice Call, Video Call, Report */}
        <div className="flex items-center gap-1">
          {otherUser && (
            <>
              <button
                onClick={() => startCall(otherUser, 'voice')}
                title="Voice Call"
                className="p-2 text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => startCall(otherUser, 'video')}
                title="Video Call"
                className="p-2 text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {otherUser && (
            <button
              onClick={() => openReport('user', otherUser.id, `User @${otherUser.username} (${otherUser.displayName})`)}
              title="Report / Safety"
              className="p-2 text-gray-400 hover:text-red-600 rounded-xl transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Honest development-mode privacy notice: localStorage is not end-to-end encryption. */}
        <div role="status" className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center max-w-sm mx-auto mb-2 text-[11px] text-amber-950 font-medium">
          Demo mode: messages stay in this browser, are not end-to-end encrypted, and have no real delivery/read receipts. Voice notes and calls are simulations. Do not send sensitive information.
        </div>

        {messages.map((msg) => {
          const isMine = msg.senderId === user?.id;
          const sender = conversation?.participants.find((p) => p.id === msg.senderId);
          const canEdit = isMine && msg.type === 'text' && !msg.deletedForEveryone &&
            Date.now() >= msg.timestamp && Date.now() - msg.timestamp <= 15 * 60 * 1000;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}
            >
              {conversation?.isGroup && !isMine && (
                <span className="text-[10px] font-bold text-purple-700 mb-0.5 ml-1">
                  {sender?.displayName || 'Member'}
                </span>
              )}

              <div
                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 shadow-2xs text-xs relative ${
                  isMine
                    ? 'bg-purple-700 text-white rounded-br-xs'
                    : 'bg-white text-gray-900 border border-purple-100/80 rounded-bl-xs'
                }`}
              >
                {/* Media Image message */}
                {msg.type === 'image' && msg.mediaUrl && !msg.deletedForEveryone && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                    <img
                      src={msg.mediaUrl}
                      alt="Attachment"
                      referrerPolicy="no-referrer"
                      className="w-full max-h-56 object-cover"
                    />
                  </div>
                )}

                {/* Audio messages are placeholders until real recording/storage/playback is implemented. */}
                {msg.type === 'audio' && !msg.deletedForEveryone ? (
                  <div className="flex items-center gap-3 py-1 min-w-[180px]">
                    <div
                      className={`p-2 rounded-full ${
                        isMine ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                      }`}
                      aria-hidden="true"
                    >
                      <Play className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div className={`h-full w-1/3 ${isMine ? 'bg-white' : 'bg-purple-600'}`} />
                      </div>
                      <div className={`text-[10px] mt-1 font-mono ${isMine ? 'text-purple-100' : 'text-gray-500'}`}>
                        0:{msg.audioDurationSec?.toString().padStart(2, '0') || '15'}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${isMine ? 'text-purple-100' : 'text-amber-700'}`}>
                        Demo placeholder — no audio file
                      </div>
                    </div>
                  </div>
                ) : editingMessageId === msg.id && !msg.deletedForEveryone ? (
                  <form onSubmit={(e) => handleSaveEdit(e, msg.id)} className="min-w-[220px] space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      maxLength={5000}
                      rows={3}
                      autoFocus
                      aria-label="Edit message"
                      className="w-full resize-y rounded-lg border border-purple-200 bg-white p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingMessageId(null); setEditDraft(''); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600"
                      >
                        <X className="h-3 w-3" /> Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!editDraft.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" /> Save edit
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Footer time & status */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isMine ? 'text-purple-200' : 'text-gray-400'
                  }`}
                >
                  <span>{formatTime(msg.timestamp)}</span>
                  {Boolean(msg.editedAt) && !msg.deletedForEveryone && (
                    <span className="italic">edited</span>
                  )}
                  {isMine && !msg.deletedForEveryone && (
                    <Check className="w-3.5 h-3.5 text-purple-200" aria-label="Demo only: no real delivery or read receipt" />
                  )}
                </div>

                {/* Message reactions badge */}
                {msg.reactions && msg.reactions.length > 0 && !msg.deletedForEveryone && (
                  <div className="absolute -bottom-2 right-2 bg-white px-1.5 py-0.5 rounded-full border border-purple-100 shadow-2xs flex items-center gap-0.5 text-xs">
                    {msg.reactions.map((r, i) => (
                      <span key={i}>{r.emoji}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Message hover actions (reactions / delete) */}
              <div
                className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 text-[11px] transition-opacity ${
                  msg.deletedForEveryone ? 'hidden' : ''
                } ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <button
                  onClick={() =>
                    setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                  }
                  className="p-1 text-gray-400 hover:text-purple-600 rounded-md bg-white border border-gray-100 shadow-2xs"
                >
                  <Smile className="w-3 h-3" />
                </button>

                {canEdit && (
                  <button
                    onClick={() => handleStartEdit(msg)}
                    title="Edit message (within 15 minutes)"
                    aria-label="Edit message"
                    className="p-1 text-gray-400 hover:text-purple-600 rounded-md bg-white border border-gray-100 shadow-2xs"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}

                {isMine && !msg.deletedForEveryone && (
                  <button
                    onClick={() => handleDeleteMsg(msg.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded-md bg-white border border-gray-100 shadow-2xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Reaction picker dropdown */}
              {activeReactionMsgId === msg.id && !msg.deletedForEveryone && (
                <div className="p-1.5 bg-white border border-purple-100 rounded-2xl shadow-lg flex items-center gap-2 z-30 my-1">
                  {['🇬🇭', '🔥', '❤️', '👏', '😂', '🙏', '⚡'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg.id, emoji)}
                      className="text-base hover:scale-125 transition-transform p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Attach Media Menu Simulation */}
      {showAttachMenu && (
        <div className="p-3 bg-white border-t border-purple-100 flex items-center gap-3 overflow-x-auto">
          <span className="text-[10px] text-amber-700 font-semibold shrink-0">Sample URLs only — file upload is not implemented</span>
          {[
            {
              name: 'Accra Tech Hub',
              url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
            },
            {
              name: 'Kumasi KNUST Campus',
              url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
            },
            {
              name: 'Cape Coast Harbor',
              url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80',
            },
          ].map((sample) => (
            <div
              key={sample.name}
              onClick={() => handleSendImage(sample.url)}
              className="cursor-pointer group flex flex-col items-center shrink-0"
            >
              <img
                src={sample.url}
                alt={sample.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover ring-1 ring-purple-200 group-hover:ring-purple-600"
              />
              <span className="text-[10px] text-gray-600 mt-1 font-medium">{sample.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input / Voice Composer Bar */}
      <div className="p-3 bg-white border-t border-purple-100">
        {chatError && (
          <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-800">
            {chatError}
          </div>
        )}
        {isRecordingVoice ? (
          <div className="flex items-center justify-between gap-3 bg-purple-50 p-2 rounded-2xl border border-purple-200 animate-pulse">
            <div className="flex items-center gap-2 text-purple-800 text-xs font-bold pl-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span>Voice-note demo timer — no audio is recorded (0:{voiceDuration.toString().padStart(2, '0')})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRecordingVoice(false)}
                className="px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSendVoiceNote}
                className="p-2 rounded-xl bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Placeholder</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-2.5 rounded-xl transition-colors ${
                showAttachMenu ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message in Twi, Ga, or English..."
              className="flex-1 px-3.5 py-2.5 bg-purple-50/40 border border-purple-100 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-purple-600 focus:bg-white transition-all"
            />

            {inputText.trim() ? (
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsRecordingVoice(true);
                  setVoiceDuration(0);
                }}
                className="p-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                title="Hold or click to record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
