import { useCallback, useEffect, useRef, useState } from 'react';

import { RoomConnection } from '@shared/room-connection';
import type { RoomConnectionState } from '@shared/room-connection';

const SERVER_URL = 'http://localhost:3000';

const initialState: RoomConnectionState = {
  userId: null,
  isHost: false,
  participants: [],
  localStream: null,
  localScreenStream: null,
  remoteStreams: {},
  pendingScreenShares: {},
  chatMessages: [],
  wasKicked: false,
};

export interface UseRoomConnectionResult extends RoomConnectionState {
  sendChat: (text: string) => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  toggleScreenShare: () => void;
  watchScreenShare: (userId: string) => void;
  stopWatchingScreenShare: (userId: string) => void;
  muteParticipant: (targetUserId: string, forceMuted: boolean) => void;
  kickParticipant: (targetUserId: string) => void;
  leave: () => void;
}

export function useRoomConnection(
  roomId: string,
  nick: string | null,
): UseRoomConnectionResult {
  const [state, setState] = useState<RoomConnectionState>(initialState);
  const connectionRef = useRef<RoomConnection | null>(null);

  useEffect(() => {
    if (!nick) {
      return;
    }

    const connection = new RoomConnection({
      serverUrl: SERVER_URL,
      roomId,
      nick,
      onStateChange: setState,
    });
    connectionRef.current = connection;

    return () => {
      connection.destroy();
      connectionRef.current = null;
    };
  }, [roomId, nick]);

  const sendChat = useCallback((text: string) => {
    connectionRef.current?.sendChat(text);
  }, []);

  const toggleMic = useCallback((enabled: boolean) => {
    connectionRef.current?.toggleMic(enabled);
  }, []);

  const toggleCamera = useCallback((enabled: boolean) => {
    connectionRef.current?.toggleCamera(enabled);
  }, []);

  const toggleScreenShare = useCallback(() => {
    connectionRef.current
      ?.toggleScreenShare()
      .catch(error =>
        console.error('[use-room-connection] toggleScreenShare failed:', error),
      );
  }, []);

  const watchScreenShare = useCallback((userId: string) => {
    connectionRef.current
      ?.watchScreenShare(userId)
      .catch(error =>
        console.error('[use-room-connection] watchScreenShare failed:', error),
      );
  }, []);

  const stopWatchingScreenShare = useCallback((userId: string) => {
    connectionRef.current?.stopWatchingScreenShare(userId);
  }, []);

  const muteParticipant = useCallback(
    (targetUserId: string, forceMuted: boolean) => {
      connectionRef.current?.muteParticipant(targetUserId, forceMuted);
    },
    [],
  );

  const kickParticipant = useCallback((targetUserId: string) => {
    connectionRef.current?.kickParticipant(targetUserId);
  }, []);

  const leave = useCallback(() => {
    connectionRef.current?.destroy();
  }, []);

  return {
    ...state,
    sendChat,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    watchScreenShare,
    stopWatchingScreenShare,
    muteParticipant,
    kickParticipant,
    leave,
  };
}
