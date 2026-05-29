import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_URL } from '@/constants/site';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

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
      <body>{children}</body>
    </html>
  );
}
