import { useState } from 'react';

import { DeviceFields, type JoinDevices } from '@/components/device-fields';

export type { JoinDevices };

export interface JoinFormProps {
  onSubmit: (nick: string, devices: JoinDevices) => void;
}

export function JoinForm({ onSubmit }: JoinFormProps) {
  const [nickDraft, setNickDraft] = useState('');
  const [devices, setDevices] = useState<JoinDevices>({});

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nickDraft.trim()) {
      return;
    }
    onSubmit(nickDraft, devices);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-80 flex-col gap-4 rounded-xl bg-neutral-800 p-6"
      >
        <h1 className="text-xl font-semibold text-white">
          Вас пригласили в звонок
        </h1>
        <input
          value={nickDraft}
          onChange={event => setNickDraft(event.target.value)}
          placeholder="Ваш никнейм"
          className="rounded-lg bg-neutral-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
        />

        <DeviceFields value={devices} onChange={setDevices} />

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-500"
        >
          Войти
        </button>
      </form>
    </div>
  );
}
