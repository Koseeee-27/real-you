'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { ResultResponse } from '../types';
import GameDetailTab from './GameDetailTab';
import OverviewTab from './OverviewTab';
import SharePanel from './SharePanel';

type TabId = 'overview' | 'game_1' | 'game_2' | 'game_3';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '総合診断' },
  { id: 'game_1', label: '規約の罠' },
  { id: 'game_2', label: 'AIバトル' },
  { id: 'game_3', label: '空気読み' },
];

const GAME_TAB_COLORS: Record<string, string> = {
  game_1: '#ef4444',
  game_2: '#f97316',
  game_3: '#3b82f6',
};

type ResultReportProps = {
  data: ResultResponse;
};

export default function ResultReport({ data }: ResultReportProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const handleRetake = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_id');
    }
    router.push('/');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-2 py-4 sm:px-4 sm:py-8">
      <header className="mb-4 flex items-center justify-center gap-2 sm:mb-6">
        <span className="text-xl font-bold tracking-wide text-gray-800 sm:text-2xl">
          行動解析REPORT
        </span>
      </header>

      <div className="w-full max-w-6xl rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-6">
        <nav className="mb-4 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2 sm:p-4">
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'game_1' && (
            <GameDetailTab
              detail={data.details.game_1}
              comment={data.phase_summaries.phase_1}
              tabColor={GAME_TAB_COLORS.game_1}
            />
          )}
          {activeTab === 'game_2' && (
            <GameDetailTab
              detail={data.details.game_2}
              comment={data.phase_summaries.phase_2}
              tabColor={GAME_TAB_COLORS.game_2}
            />
          )}
          {activeTab === 'game_3' && (
            <GameDetailTab
              detail={data.details.game_3}
              comment={data.phase_summaries.phase_3}
              tabColor={GAME_TAB_COLORS.game_3}
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRetake}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            もう一度診断
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('game_1')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ゲーム結果の詳細を閲覧する
          </button>
          <SharePanel title={data.feedback.title} />
        </div>
      </div>
    </div>
  );
}
