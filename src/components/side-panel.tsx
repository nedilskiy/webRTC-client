import type { ChatMessage, Participant } from '@shared/room-connection';
import { Link2, MessageSquare, Users, X } from 'lucide-react';
import { useState } from 'react';
import { ChatPanel } from './chat-panel';
import { ParticipantList } from './participant-list';

export interface SidePanelProps {
  participants: Participant[];
  userId: string | null;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onClose: () => void;
  isHost: boolean;
  onInvite: () => void;
  inviteCopied: boolean;
  onMuteParticipant: (targetUserId: string, forceMuted: boolean) => void;
  onKickParticipant: (targetUserId: string) => void;
}

export function SidePanel({
  participants,
  userId,
  chatMessages,
  onSendChat,
  onClose,
  isHost,
  onInvite,
  inviteCopied,
  onMuteParticipant,
  onKickParticipant,
}: SidePanelProps) {
  const [tab, setTab] = useState<'participants' | 'chat'>('participants');

  return (
    <aside className="flex w-72 flex-col border-l border-neutral-800 p-4">
      {isHost && (
        <button
          type="button"
          onClick={onInvite}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-500"
        >
          <Link2 size={18} />
          {inviteCopied ? 'Скопировано!' : 'Пригласить'}
        </button>
      )}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('participants')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === 'participants' ? 'bg-neutral-700' : 'bg-neutral-800'}`}
        >
          <Users size={16} />
          Участники
        </button>
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === 'chat' ? 'bg-neutral-700' : 'bg-neutral-800'}`}
        >
          <MessageSquare size={16} />
          Чат
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-neutral-800 p-1.5 hover:bg-neutral-700"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'participants' ? (
          <ParticipantList
            participants={participants}
            userId={userId}
            isHost={isHost}
            onMuteParticipant={onMuteParticipant}
            onKickParticipant={onKickParticipant}
          />
        ) : (
          <ChatPanel messages={chatMessages} onSend={onSendChat} />
        )}
      </div>
    </aside>
  );
}
