import { useMemo } from 'react';

import type {
  Participant,
  RemoteParticipantStreams,
} from '@shared/room-connection';

export interface ParticipantTile {
  key: string;
  participant: Participant;
  stream: MediaStream | null;
  isSelf: boolean;
  isScreenShare: boolean;
}

export function useRoomViewModel(
  participants: Participant[],
  remoteStreams: Record<string, RemoteParticipantStreams>,
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
      });

      const screenStream = isSelf
        ? localScreenStream
        : (remoteStreams[participant.id]?.screen ?? null);
      if (screenStream) {
        tiles.push({
          key: `${participant.id}-screen`,
          participant,
          stream: screenStream,
          isSelf,
          isScreenShare: true,
        });
      }
    }

    return tiles;
  }, [participants, remoteStreams, localStream, localScreenStream, userId]);
}
