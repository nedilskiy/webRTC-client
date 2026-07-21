import { useEffect, useRef, useState } from 'react';

export function useAutoHide(timeoutMs = 2000): boolean {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setVisible(false), timeoutMs);
    };

    show();
    window.addEventListener('mousemove', show);

    return () => {
      window.removeEventListener('mousemove', show);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeoutMs]);

  return visible;
}
