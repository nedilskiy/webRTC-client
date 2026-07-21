import type { Participant } from '@shared/room-connection';

export interface ParticipantListProps {
  participants: Participant[];
  userId: string | null;
}

export function ParticipantList({
  participants,
  userId,
}: ParticipantListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {participants.map(participant => (
        <li
          key={participant.id}
          className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
        >
          {participant.nick} {participant.isHost ? '👑' : ''}{' '}
          {participant.id === userId ? '(вы)' : ''}
        </li>
      ))}
    </ul>
  );
}
