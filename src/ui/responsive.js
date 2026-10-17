import { useEffect, useState } from 'react';

/** Viewports that use the compact (phone) layout; must match the media queries in styles.css. */
export const COMPACT_QUERY = '(max-width: 900px), (max-height: 520px)';

export function isCompact() {
  return typeof window !== 'undefined' && !!window.matchMedia?.(COMPACT_QUERY).matches;
}

/** isCompact() as React state, updated when the window crosses the breakpoint. */
export function useCompact() {
  const [compact, setCompact] = useState(isCompact);
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.(COMPACT_QUERY) : null;
    if (!mq) return undefined;
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return compact;
}
