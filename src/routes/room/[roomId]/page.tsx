import { ControlsBar } from '@/components/controls-bar';
import { JoinForm } from '@/components/join-form';
import { OpenPanelButton } from '@/components/open-panel-button';
import { ParticipantList } from '@/components/participant-list';
import { SidePanel } from '@/components/side-panel';
import { VideoTile } from '@/components/video-tile';
import { useRoomConnection } from '@/hooks/use-room-connection';
import { useRoomViewModel } from '@/hooks/use-room-view-model';
import { useLocation, useNavigate, useParams } from '@modern-js/runtime/router';
import { useState } from 'react';

const RoomPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialNick =
    (location.state as { nick?: string } | null)?.nick ?? null;

  const [nick, setNick] = useState<string | null>(initialNick);
  const [copied, setCopied] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const {
    userId,
    isHost,
    participants,
    localStream,
    localScreenStream,
    remoteStreams,
    chatMessages,
    sendChat,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leave,
  } = useRoomConnection(roomId as string, nick);

  const tiles = useRoomViewModel(
    participants,
    remoteStreams,
    localStream,
    localScreenStream,
    userId,
  );
  const selfParticipant = participants.find(
    participant => participant.id === userId,
  );

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

  if (!nick) {
    return <JoinForm onSubmit={setNick} />;
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-white">
      <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg">Комната: {roomId}</p>
          {isHost && (
            <button
              type="button"
              onClick={handleInvite}
              className="rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-500"
            >
              {copied ? 'Скопировано!' : 'Пригласить'}
            </button>
          )}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fit,minmax(200px,280px))] justify-center gap-4 overflow-y-auto">
          {tiles.map(tile => (
            <VideoTile
              key={tile.key}
              participant={tile.participant}
              stream={tile.stream}
              muted={tile.isSelf}
              isScreenShare={tile.isScreenShare}
            />
          ))}
        </div>
        <ControlsBar
          micOn={selfParticipant?.micOn ?? true}
          camOn={selfParticipant?.camOn ?? true}
          screenOn={selfParticipant?.screenOn ?? false}
          onToggleMic={() => toggleMic(!(selfParticipant?.micOn ?? true))}
          onToggleCamera={() => toggleCamera(!(selfParticipant?.camOn ?? true))}
          onToggleScreenShare={toggleScreenShare}
          onDisconnect={handleDisconnect}
        />
      </div>

      {isPanelOpen ? (
        <SidePanel
          participants={participants}
          userId={userId}
          chatMessages={chatMessages}
          onSendChat={sendChat}
          onClose={() => setIsPanelOpen(false)}
        />
      ) : (
        <OpenPanelButton onClick={() => setIsPanelOpen(true)} />
      )}
    </div>
  );
};

export default RoomPage;
