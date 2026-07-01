import { create } from 'zustand';

export type CallType = 'voice' | 'video';

export interface ActiveCall {
  callId: string;
  conversationId: string;
  participants: string[];
  type: CallType;
  startedAt: string;
}

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  type: CallType;
}

interface CallState {
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  isInCall: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
}

interface CallActions {
  startCall: (call: ActiveCall) => void;
  endCall: () => void;
  setIncomingCall: (call: IncomingCall | null) => void;
  acceptCall: (activeCall: ActiveCall) => void;
  rejectCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setCallDuration: (duration: number) => void;
}

type CallStore = CallState & CallActions;

export const useCallStore = create<CallStore>((set) => ({
  activeCall: null,
  incomingCall: null,
  isInCall: false,
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,

  startCall: (activeCall) =>
    set({
      activeCall,
      isInCall: true,
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),

  endCall: () =>
    set({
      activeCall: null,
      isInCall: false,
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),

  setIncomingCall: (incomingCall) => set({ incomingCall }),

  acceptCall: (activeCall) =>
    set({
      activeCall,
      incomingCall: null,
      isInCall: true,
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),

  rejectCall: () => set({ incomingCall: null }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),

  setCallDuration: (callDuration) => set({ callDuration }),
}));
