import { ChatMessage, Participant } from "@shared/room-connection";
import { useState } from "react";
import { ParticipantList } from "./participant-list";
import { ChatPanel } from "./chat-panel";

export interface SidePanelProps {
  participants: Participant[];
  userId: string | null;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
}

export function SidePanel({
  participants,
  userId,
  chatMessages,
  onSendChat,
}: SidePanelProps) {
  const [tab, setTab] = useState<"participants" | "chat">("participants");
  return (
    <aside className="flex w-96 flex-col border-l border-neutral-800 p-4">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("participants")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${tab === "participants" ? "bg-neutral-700" : "bg-neutral-800"}`}
        >
          Участники
        </button>
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${tab === "chat" ? "bg-neutral-700" : "bg-neutral-800"}`}
        >
          Чат
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {tab === "participants" ? (
          <ParticipantList participants={participants} userId={userId} />
        ) : (
          <ChatPanel messages={chatMessages} onSend={onSendChat} />
        )}
      </div>
    </aside>
  );
}
