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
  chatMessages: [],
};

export interface UseRoomConnectionResult extends RoomConnectionState {
  sendChat: (text: string) => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  toggleScreenShare: () => void;
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

  const leave = useCallback(() => {
    connectionRef.current?.destroy();
  }, []);

  return {
    ...state,
    sendChat,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leave,
  };
}
