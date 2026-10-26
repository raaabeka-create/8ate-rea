import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, CallType, CallRecord } from '../types';
import { callService } from '../services';
import { useAuth } from './AuthContext';

interface CallContextType {
  activeCall: {
    isActive: boolean;
    otherUser: UserProfile | null;
    type: CallType;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isVideoEnabled: boolean;
    elapsedSeconds: number;
    isConnecting: boolean;
  };
  startCall: (otherUser: UserProfile, type: CallType) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<{
    isActive: boolean;
    otherUser: UserProfile | null;
    type: CallType;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isVideoEnabled: boolean;
    elapsedSeconds: number;
    isConnecting: boolean;
  }>({
    isActive: false,
    otherUser: null,
    type: 'voice',
    isMuted: false,
    isSpeakerOn: false,
    isVideoEnabled: true,
    elapsedSeconds: 0,
    isConnecting: true,
  });

  // Call timer effect
  useEffect(() => {
    let interval: any = null;
    if (activeCall.isActive && !activeCall.isConnecting) {
      interval = setInterval(() => {
        setActiveCall((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall.isActive, activeCall.isConnecting]);

  // Connection simulation timer
  useEffect(() => {
    let connectTimeout: any = null;
    if (activeCall.isActive && activeCall.isConnecting) {
      connectTimeout = setTimeout(() => {
        setActiveCall((prev) => ({
          ...prev,
          isConnecting: false,
        }));
      }, 2000);
    }
    return () => {
      if (connectTimeout) clearTimeout(connectTimeout);
    };
  }, [activeCall.isActive, activeCall.isConnecting]);

  const startCall = (otherUser: UserProfile, type: CallType) => {
    setActiveCall({
      isActive: true,
      otherUser,
      type,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: type === 'video',
      elapsedSeconds: 0,
      isConnecting: true,
    });
  };

  const endCall = () => {
    if (user && activeCall.otherUser && activeCall.elapsedSeconds > 0) {
      void callService.recordCall(
        user.id,
        activeCall.otherUser,
        activeCall.type,
        'outgoing',
        activeCall.elapsedSeconds
      ).catch((error) => console.error('Failed to save demo call history', error));
    }
    setActiveCall({
      isActive: false,
      otherUser: null,
      type: 'voice',
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: true,
      elapsedSeconds: 0,
      isConnecting: true,
    });
  };

  const toggleMute = () => {
    setActiveCall((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const toggleSpeaker = () => {
    setActiveCall((prev) => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  };

  const toggleVideo = () => {
    setActiveCall((prev) => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        startCall,
        endCall,
        toggleMute,
        toggleSpeaker,
        toggleVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
