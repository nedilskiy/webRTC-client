import type { Participant } from '@shared/room-connection';
import { Crown } from 'lucide-react';
import { ParticipantMenu } from './participant-menu';

export interface VolumeSettings {
  mic: number;
  screen: number;
}

export interface ParticipantListProps {
  participants: Participant[];
  userId: string | null;
  isHost: boolean;
  volumes: Record<string, VolumeSettings>;
  onVolumeChange: (
    targetUserId: string,
    kind: 'mic' | 'screen',
    value: number,
  ) => void;
  onMuteParticipant: (targetUserId: string, forceMuted: boolean) => void;
  onKickParticipant: (targetUserId: string) => void;
}

export function ParticipantList({
  participants,
  userId,
  isHost,
  volumes,
  onVolumeChange,
  onMuteParticipant,
  onKickParticipant,
}: ParticipantListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {participants.map(participant => {
        const isSelf = participant.id === userId;
        const volume = volumes[participant.id] ?? { mic: 1, screen: 1 };

        return (
          <li
            key={participant.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-white"
          >
            <span className="flex items-center gap-1.5 truncate">
              {participant.isHost && (
                <Crown size={14} className="shrink-0 text-amber-400" />
              )}
              {participant.nick}
              {isSelf ? ' (вы)' : ''}
            </span>
            {!isSelf && (
              <ParticipantMenu
                isHost={isHost}
                forceMuted={participant.forceMuted}
                micVolume={volume.mic}
                screenVolume={volume.screen}
                onMicVolumeChange={value =>
                  onVolumeChange(participant.id, 'mic', value)
                }
                onScreenVolumeChange={value =>
                  onVolumeChange(participant.id, 'screen', value)
                }
                onToggleMute={() =>
                  onMuteParticipant(participant.id, !participant.forceMuted)
                }
                onKick={() => onKickParticipant(participant.id)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
