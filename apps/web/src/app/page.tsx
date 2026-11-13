'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp SDK if available
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      try {
        tg.enableClosingConfirmation();
      } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  return (
    <main className="w-full h-screen overflow-hidden relative">
      {/* 
        Embeds the 1:1 original Brainrot Farm game client,
        connected directly to our NestJS API backend & Telegram Stars Bot
      */}
      <iframe
        src="/index.html"
        className="w-full h-full border-0 outline-none"
        title="Brainrot Farm"
        allow="autoplay; clipboard-write"
      />
    </main>
  );
}
