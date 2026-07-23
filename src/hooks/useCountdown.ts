import { useEffect, useState } from 'react';

export function useCountdown(target: Date | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return { done: true, label: '', totalMs: 0 };
  const totalMs = target.getTime() - now;
  if (totalMs <= 0) return { done: true, label: '', totalMs: 0 };
  const s = Math.floor(totalMs / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  let label = '';
  if (days > 0) label = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) label = `${hours}h ${minutes}m ${seconds}s`;
  else label = `${minutes}m ${seconds}s`;
  return { done: false, label, totalMs };
}
