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

export interface PendingScreenShare {
  userId: string;
}

export interface RoomConnectionState {
  userId: string | null;
  isHost: boolean;
  participants: Participant[];
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Record<string, RemoteParticipantStreams>;
  pendingScreenShares: Record<string, PendingScreenShare>;
  chatMessages: ChatMessage[];
  wasKicked: boolean;
}

export interface RoomConnectionOptions {
  serverUrl: string;
  roomId: string;
  nick: string;
  audioDeviceId?: string;
  videoDeviceId?: string;
  onStateChange: (state: RoomConnectionState) => void;
}

type ProducerSource = 'camera' | 'screen';

interface ProducerInfo {
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
  source: ProducerSource;
}

interface ProducerClosedInfo {
  producerId: string;
  userId: string;
  source: ProducerSource;
}

interface ScreenProducerIds {
  video?: string;
  audio?: string;
}

const initialState: RoomConnectionState = {
  userId: null,
  isHost: false,
  participants: [],
  localStream: null,
  localScreenStream: null,
  remoteStreams: {},
  pendingScreenShares: {},
  chatMessages: [],
  wasKicked: false,
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
  private screenAudioProducer: Producer | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private screenAudioTrack: MediaStreamTrack | null = null;

  // userId -> { video?, audio? } producerId чужого шаринга — известно, как только
  // появился хотя бы один из треков, независимо от того, смотрим мы его или нет.
  private readonly screenProducersByUser = new Map<string, ScreenProducerIds>();
  // userId -> consumerId[] — есть запись только пока реально смотрим этот стрим.
  private readonly screenConsumerIdsByUser = new Map<string, string[]>();

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

  public muteParticipant(targetUserId: string, forceMuted: boolean): void {
    this.socket.emit('mute-participant', { targetUserId, forceMuted });
  }

  public kickParticipant(targetUserId: string): void {
    this.socket.emit('kick-participant', { targetUserId });
  }

  public async toggleScreenShare(): Promise<void> {
    if (this.screenVideoProducer) {
      await this.stopScreenShare();
    } else {
      await this.startScreenShare();
    }
  }

  public async watchScreenShare(userId: string): Promise<void> {
    const producers = this.screenProducersByUser.get(userId);
    if (!producers || !this.device || !this.recvTransport) {
      return;
    }

    const producerIds = [producers.video, producers.audio].filter(
      (id): id is string => Boolean(id),
    );
    const consumerIds: string[] = [];
    let screenStream: MediaStream | null = null;

    for (const producerId of producerIds) {
      const consumerParams = await this.emitWithAck<ConsumerOptions>(
        'media:consume',
        {
          transportId: this.recvTransport.id,
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        },
      );
      const consumer = await this.recvTransport.consume(consumerParams);
      this.socket.emit('media:resume-consumer', { consumerId: consumer.id });
      consumerIds.push(consumer.id);

      screenStream ??= new MediaStream();
      screenStream.addTrack(consumer.track);
    }

    this.screenConsumerIdsByUser.set(userId, consumerIds);

    const existing = this.state.remoteStreams[userId] ?? {
      camera: new MediaStream(),
      screen: null,
    };
    const { [userId]: _removed, ...restPending } =
      this.state.pendingScreenShares;

    this.setState({
      remoteStreams: {
        ...this.state.remoteStreams,
        [userId]: { ...existing, screen: screenStream },
      },
      pendingScreenShares: restPending,
    });
  }

  public stopWatchingScreenShare(userId: string): void {
    const consumerIds = this.screenConsumerIdsByUser.get(userId);
    if (consumerIds) {
      for (const consumerId of consumerIds) {
        this.socket.emit('media:close-consumer', { consumerId });
      }
      this.screenConsumerIdsByUser.delete(userId);
    }

    const existing = this.state.remoteStreams[userId];
    const remoteStreams = existing
      ? { ...this.state.remoteStreams, [userId]: { ...existing, screen: null } }
      : this.state.remoteStreams;

    const hasProducers = this.screenProducersByUser.has(userId);
    const pendingScreenShares = hasProducers
      ? { ...this.state.pendingScreenShares, [userId]: { userId } }
      : this.state.pendingScreenShares;

    this.setState({ remoteStreams, pendingScreenShares });
  }

  public destroy(): void {
    this.micTrack?.stop();
    this.cameraTrack?.stop();
    this.screenTrack?.stop();
    this.screenAudioTrack?.stop();
    this.socket.disconnect();
  }

  public async startScreenShare(): Promise<void> {
    if (!this.sendTransport) {
      return;
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    const screenVideoTrack = screenStream.getVideoTracks()[0];
    const screenAudioTrack = screenStream.getAudioTracks()[0] ?? null;
    this.screenTrack = screenVideoTrack;
    this.screenAudioTrack = screenAudioTrack;

    this.screenVideoProducer = await this.sendTransport.produce({
      track: screenVideoTrack,
      appData: { source: 'screen' satisfies ProducerSource },
    });

    if (screenAudioTrack) {
      this.screenAudioProducer = await this.sendTransport.produce({
        track: screenAudioTrack,
        appData: { source: 'screen' satisfies ProducerSource },
      });
    }

    const previewTracks = screenAudioTrack
      ? [screenVideoTrack, screenAudioTrack]
      : [screenVideoTrack];
    this.setState({ localScreenStream: new MediaStream(previewTracks) });
    this.socket.emit('toggle-screen-share', { screenOn: true });

    screenVideoTrack.onended = () => {
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

    if (this.screenAudioProducer) {
      this.socket.emit('media:close-producer', {
        producerId: this.screenAudioProducer.id,
      });
      this.screenAudioProducer.close();
      this.screenAudioProducer = null;
    }

    this.screenTrack?.stop();
    this.screenTrack = null;
    this.screenAudioTrack?.stop();
    this.screenAudioTrack = null;

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
      this.syncForceMuted(data);
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

    this.socket.on('kicked', () => {
      this.setState({ wasKicked: true });
    });
  }

  private syncForceMuted(participants: Participant[]): void {
    const self = participants.find(
      participant => participant.id === this.state.userId,
    );
    if (!self) {
      return;
    }
    if (this.micTrack) {
      this.micTrack.enabled = self.forceMuted ? false : self.micOn;
    }
    if (this.screenAudioTrack) {
      this.screenAudioTrack.enabled = !self.forceMuted;
    }
  }

  private handleProducerClosed(info: ProducerClosedInfo): void {
    if (info.source !== 'screen') {
      return;
    }

    const entry = this.screenProducersByUser.get(info.userId);
    if (entry) {
      if (entry.video === info.producerId) {
        entry.video = undefined;
      }
      if (entry.audio === info.producerId) {
        entry.audio = undefined;
      }
      if (!entry.video && !entry.audio) {
        this.screenProducersByUser.delete(info.userId);
      }
    }

    if (this.screenProducersByUser.has(info.userId)) {
      // одна из двух дорожек шаринга (например, звук) закрылась, но видео ещё живо —
      // ничего не скрываем, ждём полного закрытия.
      return;
    }

    this.screenConsumerIdsByUser.delete(info.userId);

    const existing = this.state.remoteStreams[info.userId];
    const remoteStreams = existing
      ? {
          ...this.state.remoteStreams,
          [info.userId]: { ...existing, screen: null },
        }
      : this.state.remoteStreams;

    const { [info.userId]: _removed, ...pendingScreenShares } =
      this.state.pendingScreenShares;

    this.setState({ remoteStreams, pendingScreenShares });
  }

  private async getLocalStream(): Promise<MediaStream> {
    const audioConstraint: MediaTrackConstraints | boolean = this.options
      .audioDeviceId
      ? { deviceId: { exact: this.options.audioDeviceId } }
      : true;
    const videoConstraint: MediaTrackConstraints | boolean = this.options
      .videoDeviceId
      ? { deviceId: { exact: this.options.videoDeviceId } }
      : true;

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: videoConstraint,
      });
    } catch (error) {
      console.warn(
        '[room-connection] audio+video getUserMedia failed, trying audio only:',
        error,
      );
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
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
        video: videoConstraint,
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
    if (this.cameraTrack) {
      this.cameraTrack.enabled = false;
    }
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
      this.handleNewProducer(info).catch(error =>
        console.error('[room-connection] consume failed:', error),
      );
    });

    const existingProducers =
      await this.emitWithAck<ProducerInfo[]>('media:get-producer');

    for (const info of existingProducers) {
      await this.handleNewProducer(info);
    }
  }

  private async handleNewProducer(info: ProducerInfo): Promise<void> {
    if (info.source === 'screen') {
      // Экран (и его звук) не подключаем автоматически — только запоминаем,
      // что он есть. Подключение (consume) происходит по явному запросу
      // через watchScreenShare.
      const entry = this.screenProducersByUser.get(info.userId) ?? {};
      if (info.kind === 'video') {
        entry.video = info.producerId;
      } else {
        entry.audio = info.producerId;
      }
      this.screenProducersByUser.set(info.userId, entry);

      this.setState({
        pendingScreenShares: {
          ...this.state.pendingScreenShares,
          [info.userId]: { userId: info.userId },
        },
      });
      return;
    }

    await this.consumeProducer(info);
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
