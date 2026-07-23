import { ControlsBar } from '@/components/controls-bar';
import { JoinForm } from '@/components/join-form';
import { OpenPanelButton } from '@/components/open-panel-button';
import { SidePanel } from '@/components/side-panel';
import { VideoTile } from '@/components/video-tile';
import { useRoomConnection } from '@/hooks/use-room-connection';
import { useRoomViewModel } from '@/hooks/use-room-view-model';
import { useLocation, useNavigate, useParams } from '@modern-js/runtime/router';
import { useEffect, useState } from 'react';

const RoomPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialNick =
    (location.state as { nick?: string } | null)?.nick ?? null;

  const [nick, setNick] = useState<string | null>(initialNick);
  const [copied, setCopied] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const {
    userId,
    isHost,
    participants,
    localStream,
    localScreenStream,
    remoteStreams,
    pendingScreenShares,
    chatMessages,
    sendChat,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    watchScreenShare,
    stopWatchingScreenShare,
    muteParticipant,
    kickParticipant,
    wasKicked,
    leave,
  } = useRoomConnection(roomId as string, nick);

  useEffect(() => {
    if (wasKicked) {
      navigate('/');
    }
  }, [wasKicked, navigate]);

  const tiles = useRoomViewModel(
    participants,
    remoteStreams,
    pendingScreenShares,
    localStream,
    localScreenStream,
    userId,
  );
  const selfParticipant = participants.find(
    participant => participant.id === userId,
  );
  const focusedTile = tiles.find(tile => tile.key === focusedKey) ?? null;

  const watchedUserIds = Object.entries(remoteStreams)
    .filter(([, streams]) => streams.screen !== null)
    .map(([watchedUserId]) => watchedUserId);
  const isWatchingScreenShare = watchedUserIds.length > 0;

  const handleInvite = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/room/${roomId}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    leave();
    navigate('/');
  };

  const handleStopWatching = () => {
    for (const watchedUserId of watchedUserIds) {
      stopWatchingScreenShare(watchedUserId);
    }
  };

  if (!nick) {
    return <JoinForm onSubmit={setNick} />;
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-white">
      <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <p className="text-lg">Комната: {roomId}</p>
        {focusedTile ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 pb-28">
            <div className="min-h-0 flex-1">
              <VideoTile
                participant={focusedTile.participant}
                stream={focusedTile.stream}
                muted={focusedTile.isSelf}
                isScreenShare={focusedTile.isScreenShare}
                isPendingScreenShare={focusedTile.isPendingScreenShare}
                size="focused"
                showSpeakingIndicator={false}
                onClick={() => setFocusedKey(null)}
                onWatchClick={() =>
                  watchScreenShare(focusedTile.participant.id)
                }
              />
            </div>
            <div className="flex gap-4 overflow-x-auto p-1">
              {tiles.map(tile => (
                <div key={tile.key} className="w-40 flex-shrink-0">
                  <VideoTile
                    participant={tile.participant}
                    stream={tile.stream}
                    muted={tile.isSelf}
                    isScreenShare={tile.isScreenShare}
                    isPendingScreenShare={tile.isPendingScreenShare}
                    onClick={() => setFocusedKey(tile.key)}
                    onWatchClick={() => watchScreenShare(tile.participant.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fit,minmax(200px,280px))] justify-center gap-4 overflow-y-auto pb-28">
            {tiles.map(tile => (
              <VideoTile
                key={tile.key}
                participant={tile.participant}
                stream={tile.stream}
                muted={tile.isSelf}
                isScreenShare={tile.isScreenShare}
                isPendingScreenShare={tile.isPendingScreenShare}
                onClick={() => setFocusedKey(tile.key)}
                onWatchClick={() => watchScreenShare(tile.participant.id)}
              />
            ))}
          </div>
        )}
        <ControlsBar
          micOn={selfParticipant?.micOn ?? true}
          camOn={selfParticipant?.camOn ?? false}
          screenOn={selfParticipant?.screenOn ?? false}
          onToggleMic={() => toggleMic(!(selfParticipant?.micOn ?? true))}
          onToggleCamera={() =>
            toggleCamera(!(selfParticipant?.camOn ?? false))
          }
          onToggleScreenShare={toggleScreenShare}
          onDisconnect={handleDisconnect}
          isWatchingScreenShare={isWatchingScreenShare}
          onStopWatching={handleStopWatching}
        />
      </div>

      {isPanelOpen ? (
        <SidePanel
          participants={participants}
          userId={userId}
          chatMessages={chatMessages}
          onSendChat={sendChat}
          onClose={() => setIsPanelOpen(false)}
          isHost={isHost}
          onInvite={handleInvite}
          inviteCopied={copied}
          onMuteParticipant={muteParticipant}
          onKickParticipant={kickParticipant}
        />
      ) : (
        <OpenPanelButton onClick={() => setIsPanelOpen(true)} />
      )}
    </div>
  );
};

export default RoomPage;
