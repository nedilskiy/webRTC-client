import { useMediaDevices } from '@/hooks/use-media-devices';

export interface JoinDevices {
  audioDeviceId?: string;
  videoDeviceId?: string;
  audioOutputDeviceId?: string;
}

export interface DeviceFieldsProps {
  value: JoinDevices;
  onChange: (devices: JoinDevices) => void;
}

export function DeviceFields({ value, onChange }: DeviceFieldsProps) {
  const { audioInputs, videoInputs, audioOutputs, supportsOutputSelection } =
    useMediaDevices();

  return (
    <>
      <DeviceSelect
        label="Микрофон"
        options={audioInputs}
        value={value.audioDeviceId ?? ''}
        onChange={deviceId =>
          onChange({ ...value, audioDeviceId: deviceId || undefined })
        }
      />
      <DeviceSelect
        label="Камера"
        options={videoInputs}
        value={value.videoDeviceId ?? ''}
        onChange={deviceId =>
          onChange({ ...value, videoDeviceId: deviceId || undefined })
        }
      />
      {supportsOutputSelection && (
        <DeviceSelect
          label="Динамики"
          options={audioOutputs}
          value={value.audioOutputDeviceId ?? ''}
          onChange={deviceId =>
            onChange({ ...value, audioOutputDeviceId: deviceId || undefined })
          }
        />
      )}
    </>
  );
}

interface DeviceSelectProps {
  label: string;
  options: { deviceId: string; label: string }[];
  value: string;
  onChange: (deviceId: string) => void;
}

function DeviceSelect({ label, options, value, onChange }: DeviceSelectProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <label className="flex flex-col gap-1 text-sm text-neutral-300">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-lg bg-neutral-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">По умолчанию</option>
        {options.map(option => (
          <option key={option.deviceId} value={option.deviceId}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
