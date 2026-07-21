import { useAutoHide } from '@/hooks/use-auto-hide';

export interface ControlsBarProps {
  micOn: boolean;
  camOn: boolean;
  screenOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onDisconnect: () => void;
}

export function ControlsBar({
  micOn,
  camOn,
  screenOn,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onDisconnect,
}: ControlsBarProps) {
  const visible = useAutoHide();

  return (
    <div
      className={`absolute bottom-0 left-0 w-full flex justify-center pb-6 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex gap-3 rounded-full bg-neutral-800/90 px-4 py-3 shadow-lg">
        <button
          type="button"
          onClick={onToggleMic}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${micOn ? 'bg-neutral-700' : 'bg-red-600'}`}
        >
          {micOn ? 'ВКЛ' : 'ВЫКЛ'}
        </button>
        <button
          type="button"
          onClick={onToggleCamera}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${camOn ? 'bg-neutral-700' : 'bg-red-600'}`}
        >
          {camOn ? 'ВКЛ' : 'ВЫКЛ'}
        </button>
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${screenOn ? 'bg-blue-600' : 'bg-neutral-700'}`}
        >
          ШЕЙР
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-xl"
        >
          ДИСК
        </button>
      </div>
    </div>
  );
}
