import { Device } from 'mediasoup-client';
import type {
  ConsumerOptions,
  Producer,
  RtpCapabilities,
  TransportOptions,
} from 'mediasoup-client/lib/types';
import { type Socket, io } from 'socket.io-client';

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

export interface RemoteParticipantStreams {
  camera: MediaStream;
  screen: MediaStream | null;
}

export interface RoomConnectionState {
  userId: string | null;
  isHost: boolean;
  participants: Participant[];
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Record<string, RemoteParticipantStreams>;
  chatMessages: ChatMessage[];
}

export interface RoomConnectionOptions {
  serverUrl: string;
  roomId: string;
  nick: string;
  onStateChange: (state: RoomConnectionState) => void;
}

type ProducerSource = 'camera' | 'screen';

interface ProducerInfo {
  producerId: string;
  userId: string;
  kind: string;
  source: ProducerSource;
}

interface ProducerClosedInfo {
  producerId: string;
  userId: string;
  source: ProducerSource;
}

const initialState: RoomConnectionState = {
  userId: null,
  isHost: false,
  participants: [],
  localStream: null,
  localScreenStream: null,
  remoteStreams: {},
  chatMessages: [],
};

export class RoomConnection {
  private readonly socket: Socket;
  private state: RoomConnectionState = { ...initialState };
  private device: Device | null = null;
  private recvTransport: ReturnType<Device['createRecvTransport']> | null =
    null;
  private sendTransport: ReturnType<Device['createSendTransport']> | null =
    null;

  private micTrack: MediaStreamTrack | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private cameraVideoProducer: Producer | null = null;
  private screenVideoProducer: Producer | null = null;
  private screenTrack: MediaStreamTrack | null = null;

  public constructor(private readonly options: RoomConnectionOptions) {
    this.socket = io(options.serverUrl);
    this.registerHandlers();
  }

  public sendChat(text: string): void {
    this.socket.emit('chat:send', { text });
  }

  public toggleMic(enabled: boolean): void {
    if (this.micTrack) {
      this.micTrack.enabled = enabled;
    }
    this.socket.emit('toggle-mic', { micOn: enabled });
  }

  public toggleCamera(enabled: boolean): void {
    if (this.cameraTrack) {
      this.cameraTrack.enabled = enabled;
    }
    this.socket.emit('toggle-camera', { camOn: enabled });
  }

  public async toggleScreenShare(): Promise<void> {
    if (this.screenVideoProducer) {
      await this.stopScreenShare();
    } else {
      await this.startScreenShare();
    }
  }

  public destroy(): void {
    this.micTrack?.stop();
    this.cameraTrack?.stop();
    this.screenTrack?.stop();
    this.socket.disconnect();
  }

  public async startScreenShare(): Promise<void> {
    if (!this.sendTransport) {
      return;
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const screenTrack = screenStream.getVideoTracks()[0];
    this.screenTrack = screenTrack;

    this.screenVideoProducer = await this.sendTransport.produce({
      track: screenTrack,
      appData: { source: 'screen' satisfies ProducerSource },
    });

    this.setState({ localScreenStream: new MediaStream([screenTrack]) });
    this.socket.emit('toggle-screen-share', { screenOn: true });

    screenTrack.onended = () => {
      this.stopScreenShare().catch(error =>
        console.error('[room-connection] stopScreenShare failed:', error),
      );
    };
  }

  public async stopScreenShare(): Promise<void> {
    if (!this.screenVideoProducer) {
      return;
    }

    this.socket.emit('media:close-producer', {
      producerId: this.screenVideoProducer.id,
    });
    this.screenVideoProducer.close();
    this.screenVideoProducer = null;

    this.screenTrack?.stop();
    this.screenTrack = null;

    this.setState({ localScreenStream: null });
    this.socket.emit('toggle-screen-share', { screenOn: false });
  }

  private setState(patch: Partial<RoomConnectionState>): void {
    this.state = { ...this.state, ...patch };
    this.options.onStateChange(this.state);
  }

  private registerHandlers(): void {
    this.socket.on('connect', () => {
      this.socket.emit('join-room', {
        roomId: this.options.roomId,
        nick: this.options.nick,
      });
    });

    this.socket.on('joined', (data: { userId: string; isHost: boolean }) => {
      this.setState({ userId: data.userId, isHost: data.isHost });
      this.setupMedia().catch(error =>
        console.error('[room-connection] setupMedia failed:', error),
      );
    });

    this.socket.on('participants-updated', (data: Participant[]) => {
      this.setState({ participants: data });
    });

    this.socket.on('chat:history', (data: ChatMessage[]) => {
      this.setState({ chatMessages: data });
    });

    this.socket.on('chat:message', (data: ChatMessage) => {
      this.setState({ chatMessages: [...this.state.chatMessages, data] });
    });

    this.socket.on('media:producer-closed', (info: ProducerClosedInfo) => {
      this.handleProducerClosed(info);
    });
  }

  private handleProducerClosed(info: ProducerClosedInfo): void {
    if (info.source !== 'screen') {
      return;
    }
    const existing = this.state.remoteStreams[info.userId];
    if (!existing) {
      return;
    }
    this.setState({
      remoteStreams: {
        ...this.state.remoteStreams,
        [info.userId]: { ...existing, screen: null },
      },
    });
  }

  private async getLocalStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
    } catch (error) {
      console.warn(
        '[room-connection] audio+video getUserMedia failed, trying audio only:',
        error,
      );
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (error) {
      console.warn(
        '[room-connection] audio-only getUserMedia failed, trying video only:',
        error,
      );
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
    } catch (error) {
      console.warn(
        '[room-connection] video-only getUserMedia failed, joining without local media:',
        error,
      );
    }

    return new MediaStream();
  }

  private async setupMedia(): Promise<void> {
    const stream = await this.getLocalStream();

    this.micTrack = stream.getAudioTracks()[0] ?? null;
    this.cameraTrack = stream.getVideoTracks()[0] ?? null;
    this.setState({ localStream: stream });

    const rtpCapabilities = await this.emitWithAck<RtpCapabilities>(
      'media:get-rtp-capabilities',
    );

    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });

    await this.setupSendTransport(stream);
    await this.setupRecvTransport();
  }

  private async setupSendTransport(stream: MediaStream): Promise<void> {
    if (!this.device) {
      return;
    }

    const transportParams = await this.emitWithAck<TransportOptions>(
      'media:create-transport',
    );
    const sendTransport = this.device.createSendTransport(transportParams);
    this.sendTransport = sendTransport;

    sendTransport.on('connect', ({ dtlsParameters }, callback) => {
      this.socket.emit(
        'media:connect-transport',
        { transportId: sendTransport.id, dtlsParameters },
        () => callback(),
      );
    });

    sendTransport.on(
      'produce',
      ({ kind, rtpParameters, appData }, callback) => {
        const source =
          (appData as { source?: ProducerSource }).source ?? 'camera';
        this.socket.emit(
          'media:produce',
          { transportId: sendTransport.id, kind, rtpParameters, source },
          (data: { id: string }) => callback(data),
        );
      },
    );

    for (const track of stream.getTracks()) {
      const producer = await sendTransport.produce({
        track,
        appData: { source: 'camera' satisfies ProducerSource },
      });
      if (producer.kind === 'video') {
        this.cameraVideoProducer = producer;
      }
    }
  }

  private async setupRecvTransport(): Promise<void> {
    if (!this.device) {
      return;
    }

    const transportParams = await this.emitWithAck<TransportOptions>(
      'media:create-transport',
    );
    this.recvTransport = this.device.createRecvTransport(transportParams);

    this.recvTransport.on('connect', ({ dtlsParameters }, callback) => {
      this.socket.emit(
        'media:connect-transport',
        { transportId: this.recvTransport?.id, dtlsParameters },
        callback,
      );
    });

    // Подписка на новых продюсеров — ДО запроса уже существующих, чтобы не пропустить
    // событие, если кто-то начнёт продюсить ровно в этот момент.
    this.socket.on('media:new-producer', (info: ProducerInfo) => {
      this.consumeProducer(info).catch(error =>
        console.error('[room-connection] consume failed:', error),
      );
    });

    const existingProducers =
      await this.emitWithAck<ProducerInfo[]>('media:get-producer');

    for (const info of existingProducers) {
      await this.consumeProducer(info);
    }
  }

  private async consumeProducer(info: ProducerInfo): Promise<void> {
    if (!this.device || !this.recvTransport) {
      return;
    }

    const consumerParams = await this.emitWithAck<ConsumerOptions>(
      'media:consume',
      {
        transportId: this.recvTransport.id,
        producerId: info.producerId,
        rtpCapabilities: this.device.rtpCapabilities,
      },
    );

    const consumer = await this.recvTransport.consume(consumerParams);
    this.socket.emit('media:resume-consumer', { consumerId: consumer.id });

    const existing: RemoteParticipantStreams = this.state.remoteStreams[
      info.userId
    ] ?? { camera: new MediaStream(), screen: null };

    if (info.source === 'screen') {
      const screenStream = existing.screen ?? new MediaStream();
      screenStream.addTrack(consumer.track);
      this.setState({
        remoteStreams: {
          ...this.state.remoteStreams,
          [info.userId]: { ...existing, screen: screenStream },
        },
      });
      return;
    }

    existing.camera.addTrack(consumer.track);
    this.setState({
      remoteStreams: {
        ...this.state.remoteStreams,
        [info.userId]: existing,
      },
    });
  }

  private emitWithAck<T>(event: string, payload?: unknown): Promise<T> {
    return new Promise(resolve => {
      if (payload === undefined) {
        this.socket.emit(event, resolve);
      } else {
        this.socket.emit(event, payload, resolve);
      }
    });
  }
}
