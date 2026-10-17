import React from 'react';
import { useGame } from '../stores/gameStore.js';
import PixelIcon from './PixelIcon.jsx';

/**
 * Short message at the top centre, on parchment in a wooden frame like the rest of the UI.
 * kind 'promo' (class promotion): a golden banner with the class icon, a title, the message
 * and a detail line (the new passive).
 */
export default function Toast() {
  const toast = useGame((s) => s.toast);
  if (!toast) return null;
  if (toast.kind === 'promo') {
    return (
      <div className="toast toast-promo" key={toast.id} role="status">
        {toast.icon && <span className="toast-promo-icon"><PixelIcon name={toast.icon} size={36} /></span>}
        <span className="toast-promo-body">
          {toast.title && <span className="toast-promo-title">{toast.title}</span>}
          <b className="toast-promo-text">{toast.text}</b>
          {toast.detail && <span className="toast-promo-detail">{toast.detail}</span>}
        </span>
      </div>
    );
  }
  return (
    <div className="toast" key={toast.id} role="status">
      {toast.text}
    </div>
  );
}
