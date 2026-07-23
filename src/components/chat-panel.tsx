import type { ChatMessage } from '@shared/room-connection';
import { Send } from 'lucide-react';
import { useState } from 'react';

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [text, setText] = useState('');

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }

    onSend(text);
    setText('');
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={`${message.userId}-${message.ts}-${index}`}
            className="animate-[message-fade-in_0.25s_ease-out] rounded bg-neutral-800 px-2 py-1 text-sm"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{message.nick}</span>
              <span className="shrink-0 text-[10px] text-neutral-400">
                {formatTime(message.ts)}
              </span>
            </div>
            <span className="break-words">{message.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex min-w-0 gap-2">
        <input
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="Message..."
          className="min-w-0 flex-1 rounded-lg bg-neutral-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
