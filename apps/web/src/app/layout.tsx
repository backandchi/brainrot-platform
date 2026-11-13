import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brainrot Farm | Keyslar va O\'yinlar',
  description: 'Roblox Brainrot Case-Opening, Farming & Multi-Game Telegram Mini App',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body className="antialiased bg-[#0e0a14] text-white overflow-x-hidden select-none">
        {children}
      </body>
    </html>
  );
}
