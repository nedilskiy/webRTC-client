import { useEffect, useState } from 'react';

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export interface MediaDevicesInfo {
  audioInputs: MediaDeviceOption[];
  videoInputs: MediaDeviceOption[];
  audioOutputs: MediaDeviceOption[];
  supportsOutputSelection: boolean;
  isReady: boolean;
}

const emptyDevices: MediaDevicesInfo = {
  audioInputs: [],
  videoInputs: [],
  audioOutputs: [],
  supportsOutputSelection: false,
  isReady: false,
};

export function useMediaDevices(): MediaDevicesInfo {
  const [devices, setDevices] = useState<MediaDevicesInfo>(emptyDevices);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let permissionStream: MediaStream | null = null;
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
      } catch (error) {
        console.warn(
          '[use-media-devices] permission request failed, device labels may be unavailable:',
          error,
        );
      }

      const list = await navigator.mediaDevices.enumerateDevices();
      for (const track of permissionStream?.getTracks() ?? []) {
        track.stop();
      }

      if (cancelled) {
        return;
      }

      setDevices({
        audioInputs: toOptions(list, 'audioinput'),
        videoInputs: toOptions(list, 'videoinput'),
        audioOutputs: toOptions(list, 'audiooutput'),
        supportsOutputSelection:
          typeof HTMLMediaElement.prototype.setSinkId === 'function',
        isReady: true,
      });
    };

    load().catch(error =>
      console.error('[use-media-devices] failed to load devices:', error),
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return devices;
}

function toOptions(
  list: MediaDeviceInfo[],
  kind: MediaDeviceKind,
): MediaDeviceOption[] {
  return list
    .filter(device => device.kind === kind)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Устройство ${index + 1}`,
    }));
}
