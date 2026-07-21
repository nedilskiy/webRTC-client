import type { ChatMessage, Participant } from '@shared/room-connection';
import { useState } from 'react';
import { ChatPanel } from './chat-panel';
import { ParticipantList } from './participant-list';

export interface SidePanelProps {
  participants: Participant[];
  userId: string | null;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onClose: () => void;
}

export function SidePanel({
  participants,
  userId,
  chatMessages,
  onSendChat,
  onClose,
}: SidePanelProps) {
  const [tab, setTab] = useState<'participants' | 'chat'>('participants');

  return (
    <aside className="flex w-72 flex-col border-l border-neutral-800 p-4">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('participants')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${tab === 'participants' ? 'bg-neutral-700' : 'bg-neutral-800'}`}
        >
          Участники
        </button>
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${tab === 'chat' ? 'bg-neutral-700' : 'bg-neutral-800'}`}
        >
          Чат
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-neutral-800 px-2 py-1.5 text-sm hover:bg-neutral-700"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'participants' ? (
          <ParticipantList participants={participants} userId={userId} />
        ) : (
          <ChatPanel messages={chatMessages} onSend={onSendChat} />
        )}
      </div>
    </aside>
  );
}
