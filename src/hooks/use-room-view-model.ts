import { Participant } from "@shared/room-connection";
import { useMemo } from "react";

export interface ParticipantTile {
  participant: Participant;
  stream: MediaStream | null;
  isSelf: boolean;
}

export function useRoomViewModel(
  participants: Participant[],
  remoteStreams: Record<string, MediaStream>,
  localStream: MediaStream | null,
  userId: string | null,
): ParticipantTile[] {
  return useMemo(
    () =>
      participants.map((participant) => {
        const isSelf = participant.id === userId;
        return {
          participant,
          stream: isSelf
            ? localStream
            : (remoteStreams[participant.id] ?? null),
          isSelf,
        };
      }),
    [participants, remoteStreams, localStream, userId],
  );
}
