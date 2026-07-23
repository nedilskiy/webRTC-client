import { MicOff, MoreVertical, UserX } from 'lucide-react';
import { useState } from 'react';

export interface ParticipantMenuProps {
  isHost: boolean;
  forceMuted: boolean;
  micVolume: number;
  screenVolume: number;
  onMicVolumeChange: (value: number) => void;
  onScreenVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  onKick: () => void;
}

export function ParticipantMenu({
  isHost,
  forceMuted,
  micVolume,
  screenVolume,
  onMicVolumeChange,
  onScreenVolumeChange,
  onToggleMute,
  onKick,
}: ParticipantMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        className="rounded p-1.5 hover:bg-neutral-600"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 space-y-3 rounded-lg bg-neutral-700 p-3 shadow-xl">
            <div>
              <div className="mb-1 flex justify-between text-xs text-neutral-300">
                <span>Микрофон</span>
                <span>{Math.round(micVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                value={Math.round(micVolume * 100)}
                onChange={event =>
                  onMicVolumeChange(Number(event.target.value) / 100)
                }
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-neutral-300">
                <span>Трансляция</span>
                <span>{Math.round(screenVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                value={Math.round(screenVolume * 100)}
                onChange={event =>
                  onScreenVolumeChange(Number(event.target.value) / 100)
                }
                className="w-full"
              />
            </div>

            {isHost && (
              <div className="flex items-center justify-between border-t border-neutral-600 pt-2">
                <span className="flex items-center gap-1.5 text-sm">
                  <MicOff size={14} />
                  Замутить
                </span>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`h-5 w-9 rounded-full transition-colors ${forceMuted ? 'bg-red-600' : 'bg-neutral-600'}`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition-transform ${forceMuted ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            )}

            {isHost && (
              <button
                type="button"
                onClick={onKick}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600/80 px-2 py-1.5 text-sm hover:bg-red-600"
              >
                <UserX size={14} />
                Кикнуть
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
