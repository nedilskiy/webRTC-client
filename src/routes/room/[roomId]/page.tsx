import { JoinForm } from "@/components/join-form";
import { ParticipantList } from "@/components/participant-list";
import { SidePanel } from "@/components/side-panel";
import { VideoTile } from "@/components/video-tile";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useRoomViewModel } from "@/hooks/use-room-view-model";
import { useLocation, useParams } from "@modern-js/runtime/router";
import { useState } from "react";

const RoomPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const initialNick =
    (location.state as { nick?: string } | null)?.nick ?? null;

  const [nick, setNick] = useState<string | null>(initialNick);
  const [copied, setCopied] = useState(false);

  const {
    userId,
    isHost,
    participants,
    localStream,
    remoteStreams,
    chatMessages,
    sendChat,
  } = useRoomConnection(roomId as string, nick);
  const tiles = useRoomViewModel(
    participants,
    remoteStreams,
    localStream,
    userId,
  );

  const handleInvite = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/room/${roomId}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!nick) {
    return <JoinForm onSubmit={setNick} />;
  }

  return (
    <div className="flex min-h-screen bg-neutral-900 text-white">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg">Комната: {roomId}</p>
          {isHost && (
            <button
              type="button"
              onClick={handleInvite}
              className="rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-500"
            >
              {copied ? "Скопировано!" : "Пригласить"}
            </button>
          )}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fit,minmax(200px,280px))] justify-center gap-4 overflow-y-auto">
          {tiles.map((tile) => (
            <VideoTile
              key={tile.participant.id}
              participant={tile.participant}
              stream={tile.stream}
              muted={tile.isSelf}
            />
          ))}
        </div>
      </div>
      <SidePanel
        participants={participants}
        userId={userId}
        chatMessages={chatMessages}
        onSendChat={sendChat}
      />
    </div>
  );
};

export default RoomPage;
