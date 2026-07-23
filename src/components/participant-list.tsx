import type { Participant } from '@shared/room-connection';
import { Crown, MicOff, UserX } from 'lucide-react';

export interface ParticipantListProps {
  participants: Participant[];
  userId: string | null;
  isHost: boolean;
  onMuteParticipant: (targetUserId: string, forceMuted: boolean) => void;
  onKickParticipant: (targetUserId: string) => void;
}

export function ParticipantList({
  participants,
  userId,
  isHost,
  onMuteParticipant,
  onKickParticipant,
}: ParticipantListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {participants.map(participant => {
        const isSelf = participant.id === userId;
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
            {isHost && !isSelf && (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onMuteParticipant(participant.id, !participant.forceMuted)
                  }
                  title={participant.forceMuted ? 'Снять мут' : 'Замутить'}
                  className={`rounded p-1.5 hover:bg-neutral-600 ${participant.forceMuted ? 'text-red-400' : ''}`}
                >
                  <MicOff size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onKickParticipant(participant.id)}
                  title="Кикнуть"
                  className="rounded p-1.5 hover:bg-neutral-600"
                >
                  <UserX size={14} />
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
