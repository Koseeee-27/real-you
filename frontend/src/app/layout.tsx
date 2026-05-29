import type { Metadata } from 'next';
import './globals.css';
import { SITE_URL } from '@/constants/site';
import { AudioController } from '@/components/audio/AudioController';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Real You ~ 本当の私じゃだめですか？ ~',
  description:
    '3 つのミニゲームでの無意識の行動から、本当の性格を暴き出す診断 Web アプリ。',
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AudioController />
        {children}
      </body>
    </html>
  );
}
