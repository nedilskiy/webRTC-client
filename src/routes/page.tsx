import { useNavigate } from '@modern-js/runtime/router';
import { useState } from 'react';

const JoinPage = () => {
  const [nick, setNick] = useState('');

  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!nick.trim()) {
      return;
    }
    const roomId = crypto.randomUUID();
    navigate(`/room/${roomId}`, { state: { nick } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-80 flex-col gap-4 rounded-xl bg-neutral-800 p-6"
      >
        <h1 className="text-xl font-semibold text-white">Войти в звонок</h1>
        <input
          value={nick}
          onChange={event => setNick(event.target.value)}
          placeholder="Ваш никнейм"
          className="rounded-lg bg-neutral-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-500"
        >
          Создать комнату
        </button>
      </form>
    </div>
  );
};

export default JoinPage;
