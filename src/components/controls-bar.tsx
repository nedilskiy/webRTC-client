import { useAutoHide } from '@/hooks/use-auto-hide';
import {
  Mic,
  MicOff,
  MonitorX,
  PhoneOff,
  ScreenShare,
  Video,
  VideoOff,
} from 'lucide-react';

export interface ControlsBarProps {
  micOn: boolean;
  camOn: boolean;
  screenOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onDisconnect: () => void;
  isWatchingScreenShare: boolean;
  onStopWatching: () => void;
}

export function ControlsBar({
  micOn,
  camOn,
  screenOn,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onDisconnect,
  isWatchingScreenShare,
  onStopWatching,
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
          className={`flex h-11 w-11 items-center justify-center rounded-full ${micOn ? 'bg-neutral-700' : 'bg-red-600'}`}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          type="button"
          onClick={onToggleCamera}
          className={`flex h-11 w-11 items-center justify-center rounded-full ${camOn ? 'bg-neutral-700' : 'bg-red-600'}`}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`flex h-11 w-11 items-center justify-center rounded-full ${screenOn ? 'bg-blue-600' : 'bg-neutral-700'}`}
        >
          <ScreenShare size={20} />
        </button>
        <button
          type="button"
          onClick={isWatchingScreenShare ? onStopWatching : onDisconnect}
          className={`flex h-11 items-center justify-center gap-2 rounded-full px-4 ${
            isWatchingScreenShare ? 'bg-neutral-700' : 'w-11 bg-red-600'
          }`}
        >
          {isWatchingScreenShare ? (
            <>
              <MonitorX size={20} />
              <span className="text-sm">Стоп стрим</span>
            </>
          ) : (
            <PhoneOff size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
