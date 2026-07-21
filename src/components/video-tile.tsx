import { useEffect, useRef } from 'react';

import { colorForSeed } from '@/lib/color-for-seed';
import type { Participant } from '@shared/room-connection';

export interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  muted?: boolean;
  isScreenShare?: boolean;
}

export function VideoTile({
  participant,
  stream,
  muted,
  isScreenShare,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = isScreenShare
    ? stream !== null
    : participant.camOn && stream !== null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-800">
      {/* biome-ignore lint/a11y/useMediaCaption: живое видео звонка, дорожки субтитров нет и не будет */}
      <video
        ref={videoRef}
        autoPlay
        muted={muted}
        playsInline
        className={`h-full w-full object-cover ${hasVideo ? '' : 'hidden'}`}
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
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {participant.isHost ? '👑 ' : ''}
        {participant.nick}
        {isScreenShare ? ' — экран' : ''}
      </span>
    </div>
  );
}
