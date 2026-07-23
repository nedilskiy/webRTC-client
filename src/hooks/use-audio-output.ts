import { useEffect, useRef } from 'react';

export function useAudioOutput(
  stream: MediaStream | null,
  volume: number,
  outputDeviceId?: string,
): void {
  const gainNodeRef = useRef<GainNode | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: volume обновляется отдельным эффектом ниже, чтобы не пересоздавать AudioContext на каждое движение слайдера
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    // Звук идёт через MediaStreamDestination + скрытый <audio>, а не напрямую
    // в audioContext.destination — только у HTMLMediaElement есть setSinkId
    // для выбора устройства вывода, у AudioContext такого API ещё нет.
    const destinationNode = audioContext.createMediaStreamDestination();

    source.connect(gainNode);
    gainNode.connect(destinationNode);
    gainNodeRef.current = gainNode;

    const audioElement = new Audio();
    audioElement.srcObject = destinationNode.stream;
    audioElement.autoplay = true;
    if (outputDeviceId) {
      audioElement
        .setSinkId(outputDeviceId)
        .catch(error =>
          console.warn('[use-audio-output] setSinkId failed:', error),
        );
    }
    audioElement
      .play()
      .catch(error => console.warn('[use-audio-output] play failed:', error));

    return () => {
      audioElement.pause();
      audioElement.srcObject = null;
      source.disconnect();
      gainNode.disconnect();
      destinationNode.disconnect();
      audioContext.close().catch(() => undefined);
      gainNodeRef.current = null;
    };
  }, [stream, outputDeviceId]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);
}
