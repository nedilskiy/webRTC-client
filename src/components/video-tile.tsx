import { useEffect, useRef } from 'react';

import { useAudioOutput } from '@/hooks/use-audio-output';
import { useIsSpeaking } from '@/hooks/use-is-speaking';
import { colorForSeed } from '@/lib/color-for-seed';
import type { Participant } from '@shared/room-connection';
import { Crown, Play } from 'lucide-react';

export interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  muted?: boolean;
  isScreenShare?: boolean;
  isPendingScreenShare?: boolean;
  size?: 'grid' | 'focused';
  showSpeakingIndicator?: boolean;
  volume?: number;
  outputDeviceId?: string;
  onClick?: () => void;
  onWatchClick?: () => void;
}

export function VideoTile({
  participant,
  stream,
  muted,
  isScreenShare,
  isPendingScreenShare,
  size = 'grid',
  showSpeakingIndicator = true,
  volume = 1,
  outputDeviceId,
  onClick,
  onWatchClick,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSpeakingRaw = useIsSpeaking(isScreenShare ? null : stream);
  const isSpeaking = showSpeakingIndicator && isSpeakingRaw;
  // Аудио у чужих плиток играет через Web Audio (GainNode) — так можно регулировать
  // громкость лично для себя, не трогая ни сеть, ни то, что слышат другие.
  // У своей плитки (muted) звук вообще не воспроизводим — не нужно слышать себя.
  useAudioOutput(muted ? null : stream, volume, outputDeviceId);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = isScreenShare
    ? stream !== null
    : participant.camOn && stream !== null;

  const sizeClass =
    size === 'focused' ? 'h-full w-full' : 'aspect-video w-full';
  const ringClass = isSpeaking ? 'ring-4 ring-emerald-500' : '';

  if (isPendingScreenShare) {
    return (
      <div
        className={`relative ${sizeClass} overflow-hidden rounded-lg bg-neutral-800`}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <button
            type="button"
            onClick={onWatchClick}
            className="flex items-center gap-2 rounded-lg bg-neutral-700/90 px-4 py-2 font-medium text-white hover:bg-neutral-600"
          >
            <Play size={18} />
            Смотреть стрим
          </button>
        </div>
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          {participant.nick} — экран
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative block ${sizeClass} overflow-hidden rounded-lg bg-neutral-800 text-left transition-shadow ${ringClass}`}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: живое видео звонка, дорожки субтитров нет и не будет */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`h-full w-full ${isScreenShare ? 'object-contain' : 'object-cover'} ${hasVideo ? '' : 'hidden'}`}
      />
      {!hasVideo && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${colorForSeed(participant.avatar ?? participant.id)}`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/20 text-2xl font-semibold text-white">
            {participant.nick.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {participant.isHost && <Crown size={12} className="text-amber-400" />}
        {participant.nick}
        {isScreenShare ? ' — экран' : ''}
      </span>
    </button>
  );
}
