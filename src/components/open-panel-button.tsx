import { useAutoHide } from '@/hooks/use-auto-hide';
import { PanelRightOpen } from 'lucide-react';

export interface OpenPanelButtonProps {
  onClick: () => void;
}

export function OpenPanelButton({ onClick }: OpenPanelButtonProps) {
  const visible = useAutoHide();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800/90 text-white shadow-lg transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <PanelRightOpen size={18} />
    </button>
  );
}
