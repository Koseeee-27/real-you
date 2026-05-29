'use client';

import { useState } from 'react';
import type { ResultResponse } from '../types';
import { GAME_META } from '../data/gameMeta';

type Props = { data: ResultResponse };

export default function DebugCommentPanel({ data }: Props) {
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      {/* トグルボタン */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9999,
          background: '#1e293b',
          color: '#f8fafc',
          border: 'none',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          opacity: 0.85,
          letterSpacing: '0.03em',
        }}
      >
        {open ? '✕ 閉じる' : '🔍 BEコメント確認'}
      </button>

      {/* パネル本体 */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 52,
            right: 16,
            zIndex: 9998,
            width: 420,
            maxHeight: '70vh',
            overflowY: 'auto',
            background: '#0f172a',
            color: '#e2e8f0',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              background: '#1e293b',
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: 12,
              color: '#94a3b8',
              letterSpacing: '0.06em',
              borderRadius: '10px 10px 0 0',
              borderBottom: '1px solid #334155',
            }}
          >
            BEコメント一覧（dev only）
          </div>

          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 総合 feedback.description */}
            <Section label="総合 / feedback.description" color="#f97316">
              <RawText text={data.feedback.description} />
            </Section>

            {/* 各ゲームの analysis_comment */}
            {data.details.map((detail) => {
              const meta = GAME_META[detail.game_id];
              return (
                <Section
                  key={detail.game_id}
                  label={`${meta?.label ?? detail.game_id} / analysis_comment`}
                  color={meta?.color ?? '#64748b'}
                >
                  {detail.analysis_comment.map((line, i) => (
                    <RawText key={i} index={i + 1} text={line} />
                  ))}
                </Section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color,
          letterSpacing: '0.05em',
          marginBottom: 5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: '#1e293b',
          borderRadius: 6,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          borderLeft: `3px solid ${color}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RawText({ text, index }: { text: string; index?: number }) {
  return (
    <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 }}>
      {index !== undefined && (
        <span style={{ color: '#64748b', fontWeight: 700, marginRight: 6 }}>
          {index}.
        </span>
      )}
      {text}
    </p>
  );
}
