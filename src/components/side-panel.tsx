import type { ChatMessage, Participant } from '@shared/room-connection';
import { Link2, MessageSquare, Users, X } from 'lucide-react';
import { ChatPanel } from './chat-panel';
import { ParticipantList, type VolumeSettings } from './participant-list';

export type SidePanelTab = 'participants' | 'chat';

export interface SidePanelProps {
  participants: Participant[];
  userId: string | null;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onClose: () => void;
  isHost: boolean;
  onInvite: () => void;
  inviteCopied: boolean;
  tab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
  unreadCount: number;
  volumes: Record<string, VolumeSettings>;
  onVolumeChange: (
    targetUserId: string,
    kind: 'mic' | 'screen',
    value: number,
  ) => void;
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
  tab,
  onTabChange,
  unreadCount,
  volumes,
  onVolumeChange,
  onMuteParticipant,
  onKickParticipant,
}: SidePanelProps) {
  return (
    <aside className="flex h-full w-72 min-w-0 flex-col overflow-x-hidden p-4">
      {isHost && tab === 'participants' && (
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
          onClick={() => onTabChange('participants')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === 'participants' ? 'bg-neutral-700' : 'bg-neutral-800'}`}
        >
          <Users size={16} />
          Участники
        </button>
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === 'chat' ? 'bg-neutral-700' : 'bg-neutral-800'}`}
        >
          <MessageSquare size={16} />
          Чат
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-neutral-800 p-1.5 hover:bg-neutral-700"
        >
          <X size={16} />
        </button>
      </div>
      {tab === 'participants' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ParticipantList
            participants={participants}
            userId={userId}
            isHost={isHost}
            volumes={volumes}
            onVolumeChange={onVolumeChange}
            onMuteParticipant={onMuteParticipant}
            onKickParticipant={onKickParticipant}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatPanel messages={chatMessages} onSend={onSendChat} />
        </div>
      )}
    </aside>
  );
}
