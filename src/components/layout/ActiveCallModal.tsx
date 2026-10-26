import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Video, VideoOff, PhoneOff, MapPin, ShieldAlert } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const ActiveCallModal: React.FC = () => {
  const { activeCall, endCall, toggleMute, toggleSpeaker, toggleVideo } = useCall();

  if (!activeCall.isActive || !activeCall.otherUser) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-purple-900/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white relative">
        {/* Development Call simulation banner */}
        <div className="bg-purple-950/80 px-3 py-1.5 border-b border-purple-800/40 flex items-center justify-center gap-1.5 text-[11px] text-purple-200">
          <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          <span>8ATE Dev Call Simulation (WebRTC/VoIP ready)</span>
        </div>

        {/* Main call display */}
        <div className="p-8 flex flex-col items-center justify-center text-center flex-1">
          {/* Simulated Video Preview or Avatar */}
          {activeCall.type === 'video' && activeCall.isVideoEnabled ? (
            <div className="relative w-48 h-64 rounded-2xl overflow-hidden mb-4 border border-purple-500/40 shadow-lg bg-gray-800 flex items-center justify-center">
              <img
                src={activeCall.otherUser.avatarUrl}
                alt={activeCall.otherUser.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover brightness-90"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-semibold text-white">
                Live Video
              </div>
            </div>
          ) : (
            <div className="relative mb-6">
              <div className={`w-28 h-28 rounded-full overflow-hidden ring-4 ${activeCall.isConnecting ? 'ring-purple-400 animate-pulse' : 'ring-purple-600'}`}>
                <img
                  src={activeCall.otherUser.avatarUrl}
                  alt={activeCall.otherUser.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-white tracking-tight">
            {activeCall.otherUser.displayName}
          </h2>
          <div className="flex items-center text-xs text-purple-300 mt-1 font-medium">
            <MapPin className="w-3 h-3 mr-1 text-purple-400" />
            <span>{activeCall.otherUser.city}, {activeCall.otherUser.region}</span>
          </div>

          <div className="mt-4 px-3 py-1 rounded-full bg-gray-800/80 border border-gray-700/60 text-xs font-mono font-semibold tracking-wider text-purple-300">
            {activeCall.isConnecting ? 'Connecting across Ghana...' : formatTimer(activeCall.elapsedSeconds)}
          </div>
        </div>

        {/* Controls bar */}
        <div className="p-6 bg-gray-950 border-t border-gray-800/80 flex items-center justify-around">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            aria-label="Toggle mute"
            className={`p-3.5 rounded-full transition-all ${
              activeCall.isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Speaker toggle */}
          <button
            onClick={toggleSpeaker}
            aria-label="Toggle speaker"
            className={`p-3.5 rounded-full transition-all ${
              activeCall.isSpeakerOn
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {activeCall.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Video toggle (for video calls) */}
          {activeCall.type === 'video' && (
            <button
              onClick={toggleVideo}
              aria-label="Toggle video"
              className={`p-3.5 rounded-full transition-all ${
                !activeCall.isVideoEnabled
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
            >
              {activeCall.isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          )}

          {/* End call button */}
          <button
            onClick={endCall}
            aria-label="End call"
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-95"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
