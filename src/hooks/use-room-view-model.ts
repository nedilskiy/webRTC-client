import { useMemo } from 'react';

import type {
  Participant,
  PendingScreenShare,
  RemoteParticipantStreams,
} from '@shared/room-connection';

export interface ParticipantTile {
  key: string;
  participant: Participant;
  stream: MediaStream | null;
  isSelf: boolean;
  isScreenShare: boolean;
  isPendingScreenShare: boolean;
}

export function useRoomViewModel(
  participants: Participant[],
  remoteStreams: Record<string, RemoteParticipantStreams>,
  pendingScreenShares: Record<string, PendingScreenShare>,
  localStream: MediaStream | null,
  localScreenStream: MediaStream | null,
  userId: string | null,
): ParticipantTile[] {
  return useMemo(() => {
    const tiles: ParticipantTile[] = [];

    for (const participant of participants) {
      const isSelf = participant.id === userId;
      const cameraStream = isSelf
        ? localStream
        : (remoteStreams[participant.id]?.camera ?? null);
      tiles.push({
        key: participant.id,
        participant,
        stream: cameraStream,
        isSelf,
        isScreenShare: false,
        isPendingScreenShare: false,
      });

      const screenStream = isSelf
        ? localScreenStream
        : (remoteStreams[participant.id]?.screen ?? null);
      const isPending = !isSelf && Boolean(pendingScreenShares[participant.id]);

      if (screenStream || isPending) {
        tiles.push({
          key: `${participant.id}-screen`,
          participant,
          stream: screenStream,
          isSelf,
          isScreenShare: true,
          isPendingScreenShare: isPending,
        });
      }
    }

    return tiles;
  }, [
    participants,
    remoteStreams,
    pendingScreenShares,
    localStream,
    localScreenStream,
    userId,
  ]);
}
