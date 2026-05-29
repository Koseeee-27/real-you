import type { Viewport } from 'next';
import ResultPage from '@/features/result/components/ResultPage';

// キオスク（PC/タッチスクリーン）向け: 誤タップによるピンチズームを防止
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function ResultRoutePage() {
  return <ResultPage />;
}
