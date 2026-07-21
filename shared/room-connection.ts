import { Device } from "mediasoup-client";
import type {
  ConsumerOptions,
  RtpCapabilities,
  TransportOptions,
} from "mediasoup-client/lib/types";
import { type Socket, io } from "socket.io-client";

export interface ChatMessage {
  userId: string;
  nick: string;
  text: string;
  ts: number;
}

export interface Participant {
  id: string;
  nick: string;
  avatar?: string;
  micOn: boolean;
  camOn: boolean;
  screenOn: boolean;
  isHost: boolean;
  forceMuted: boolean;
  socketId: string;
}

export interface RoomConnectionState {
  userId: string | null;
  isHost: boolean;
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  chatMessages: ChatMessage[];
}

export interface RoomConnectionOptions {
  serverUrl: string;
  roomId: string;
  nick: string;
  onStateChange: (state: RoomConnectionState) => void;
}

interface ProducerInfo {
  producerId: string;
  userId: string;
  kind: string;
}

const initialState: RoomConnectionState = {
  userId: null,
  isHost: false,
  participants: [],
  localStream: null,
  remoteStreams: {},
  chatMessages: [],
};

export class RoomConnection {
  private readonly socket: Socket;
  private state: RoomConnectionState = { ...initialState };
  private device: Device | null = null;
  private recvTransport: ReturnType<Device["createRecvTransport"]> | null =
    null;

  public constructor(private readonly options: RoomConnectionOptions) {
    this.socket = io(options.serverUrl);
    this.registerHandlers();
  }

  public sendChat(text: string): void {
    this.socket.emit("chat:send", { text });
  }

  public destroy(): void {
    this.socket.disconnect();
  }

  private setState(patch: Partial<RoomConnectionState>): void {
    this.state = { ...this.state, ...patch };
    this.options.onStateChange(this.state);
  }

  private registerHandlers(): void {
    this.socket.on("connect", () => {
      console.log(
        "[room-connection] connected, joining room",
        this.options.roomId,
      );
      this.socket.emit("join-room", {
        roomId: this.options.roomId,
        nick: this.options.nick,
      });
    });

    this.socket.on("joined", (data: { userId: string; isHost: boolean }) => {
      console.log("[room-connection] joined", data);
      this.setState({ userId: data.userId, isHost: data.isHost });
      this.setupMedia().catch((error) =>
        console.error("[room-connection] setupMedia failed:", error),
      );
    });

    this.socket.on("participants-updated", (data: Participant[]) => {
      console.log("[room-connection] participants-updated", data);
      this.setState({ participants: data });
    });

    this.socket.on("chat:history", (data: ChatMessage[]) => {
      this.setState({ chatMessages: data });
    });

    this.socket.on("chat:message", (data: ChatMessage) => {
      this.setState({ chatMessages: [...this.state.chatMessages, data] });
    });
  }

  private async setupMedia(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log("[room-connection] local stream tracks:", stream.getTracks());
    this.setState({ localStream: stream });

    const rtpCapabilities = await this.emitWithAck<RtpCapabilities>(
      "media:get-rtp-capabilities",
    );
    console.log("[room-connection] rtp capabilities received");

    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
    console.log("[room-connection] device loaded:", this.device.loaded);

    await this.setupSendTransport(stream);
    await this.setupRecvTransport();
  }

  private async setupSendTransport(stream: MediaStream): Promise<void> {
    if (!this.device) {
      return;
    }

    console.log("[room-connection] requesting send transport...");
    const transportParams = await this.emitWithAck<TransportOptions>(
      "media:create-transport",
    );
    console.log(
      "[room-connection] send transport params received",
      transportParams,
    );
    const sendTransport = this.device.createSendTransport(transportParams);
    console.log("[room-connection] send transport created", sendTransport.id);

    sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
      console.log("[room-connection] send transport connect event fired");
      this.socket.emit(
        "media:connect-transport",
        { transportId: sendTransport.id, dtlsParameters },
        () => {
          console.log("[room-connection] send transport connect ack received");
          callback();
        },
      );
    });

    sendTransport.on(
      "produce",
      ({ kind, rtpParameters }, callback, errback) => {
        console.log(
          "[room-connection] send transport produce event fired",
          kind,
        );
        this.socket.emit(
          "media:produce",
          { transportId: sendTransport.id, kind, rtpParameters },
          (data: { id: string }) => {
            console.log("[room-connection] produce ack received", data);
            callback(data);
          },
        );
      },
    );

    sendTransport.on("connectionstatechange", (state) => {
      console.log("[room-connection] send transport connection state:", state);
    });

    for (const track of stream.getTracks()) {
      console.log("[room-connection] calling produce for track", track.kind);
      const producer = await sendTransport.produce({ track });
      console.log("[room-connection] produced", producer.kind, producer.id);
    }
  }

  private async setupRecvTransport(): Promise<void> {
    if (!this.device) {
      return;
    }

    const transportParams = await this.emitWithAck<TransportOptions>(
      "media:create-transport",
    );
    this.recvTransport = this.device.createRecvTransport(transportParams);

    this.recvTransport.on("connect", ({ dtlsParameters }, callback) => {
      this.socket.emit(
        "media:connect-transport",
        { transportId: this.recvTransport?.id, dtlsParameters },
        callback,
      );
    });

    // Подписка на новых продюсеров — ДО запроса уже существующих, чтобы не пропустить
    // событие, если кто-то начнёт продюсить ровно в этот момент.
    this.socket.on("media:new-producer", (info: ProducerInfo) => {
      console.log("[room-connection] new-producer", info);
      this.consumeProducer(info).catch((error) =>
        console.error("[room-connection] consume failed:", error),
      );
    });

    const existingProducers =
      await this.emitWithAck<ProducerInfo[]>("media:get-producer");
    console.log("[room-connection] existing producers:", existingProducers);

    for (const info of existingProducers) {
      await this.consumeProducer(info);
    }
  }

  private async consumeProducer(info: ProducerInfo): Promise<void> {
    if (!this.device || !this.recvTransport) {
      return;
    }

    console.log("[room-connection] consuming producer", info);
    const consumerParams = await this.emitWithAck<ConsumerOptions>(
      "media:consume",
      {
        transportId: this.recvTransport.id,
        producerId: info.producerId,
        rtpCapabilities: this.device.rtpCapabilities,
      },
    );
    console.log("[room-connection] consumer params received", consumerParams);

    const consumer = await this.recvTransport.consume(consumerParams);
    console.log("[room-connection] consumer created, track:", consumer.track);
    this.socket.emit("media:resume-consumer", { consumerId: consumer.id });

    const existing = this.state.remoteStreams[info.userId];
    if (existing) {
      existing.addTrack(consumer.track);
      this.setState({ remoteStreams: { ...this.state.remoteStreams } });
      return;
    }
    this.setState({
      remoteStreams: {
        ...this.state.remoteStreams,
        [info.userId]: new MediaStream([consumer.track]),
      },
    });
  }

  private emitWithAck<T>(event: string, payload?: unknown): Promise<T> {
    return new Promise((resolve) => {
      if (payload === undefined) {
        this.socket.emit(event, resolve);
      } else {
        this.socket.emit(event, payload, resolve);
      }
    });
  }
}
