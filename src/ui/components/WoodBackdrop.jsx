import React from 'react';

const HOME_ART = `${import.meta.env.BASE_URL}assets/ui/home.png`;

/** Backdrop of a .wood-screen: the title's key art, blurred under a warm light veil. */
export default function WoodBackdrop() {
  return <div className="wood-backdrop" style={{ backgroundImage: `url(${HOME_ART})` }} aria-hidden="true" />;
}
