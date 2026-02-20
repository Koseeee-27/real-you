import Link from 'next/link';

export default function TopPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <h1 className="text-4xl font-bold">性格診断ゲーム</h1>
      <p className="text-lg text-gray-600">
        あなたの本当の性格を、ゲームを通じて診断します
      </p>
      <Link
        href="/games/terms"
        className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
      >
        診断スタート
      </Link>
    </div>
  );
}
