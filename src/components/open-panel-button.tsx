import { useAutoHide } from '@/hooks/use-auto-hide';
import { PanelRightOpen } from 'lucide-react';

export interface OpenPanelButtonProps {
  panelOpen: boolean;
  hasUnread: boolean;
  onClick: () => void;
}

export function OpenPanelButton({
  panelOpen,
  hasUnread,
  onClick,
}: OpenPanelButtonProps) {
  const idleVisible = useAutoHide();
  const visible = idleVisible && !panelOpen;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800/90 text-white shadow-lg transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <PanelRightOpen size={18} />
      {hasUnread && (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-600" />
      )}
    </button>
  );
}
