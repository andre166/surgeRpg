import React, { useEffect, useRef, useState } from 'react';
import PixelIcon from './PixelIcon.jsx';

/** Icon button that opens a short explanation in a parchment box; a tap outside closes it. */
export default function InfoButton({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="info-wrap" ref={ref}>
      <button className={`btn small info-btn ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-label={label} aria-expanded={open} title={label}>
        <PixelIcon name="info" size={18} />
      </button>
      {open && <div className="info-pop" role="dialog" aria-label={label}>{children}</div>}
    </div>
  );
}
