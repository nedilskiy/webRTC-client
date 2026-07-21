import type { ChatMessage } from '@shared/room-connection';
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
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={`${message.userId}-${message.ts}-${index}`}
            className="rounded bg-neutral-800 px-2 py-1 text-sm"
          >
            <span className="font-semibold">{message.nick}: </span>
            <span>{message.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-lg bg-neutral-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}
