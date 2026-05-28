'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** フォーカス可能な要素のセレクタ（disabled / tabindex=-1 は除外） */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** コンテナ内の「いま見えていてフォーカス可能な」要素を文書順で返す */
function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  // getClientRects().length > 0 で可視判定する（display:none を除外しつつ、
  // position:fixed 配下の要素も正しく可視と判定できる。offsetParent は fixed に弱い）。
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => el.getClientRects().length > 0);
}

/**
 * フッターの 3 ボタン（戻る / 次へ / 主ボタン）で共通する
 * ネオブルータリズム調のベースクラス。
 * 色（bg/text）と左右余白（px）だけが各ボタンで異なるため、それらは
 * 個別に上書きする前提で、ここでは押下感まわりだけ統一する。
 */
const NEO_FOOTER_BUTTON_BASE =
  'rounded-xl border-[3px] border-black py-2 text-sm font-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] sm:py-3 sm:text-base';

/**
 * 各スロットのクラスを上書きするための入れ物。
 * 既定値（統一されたネオブルータリズムのサイズ・色）は `cn()` でマージされるため、
 * 渡したクラスが既定より後勝ちになる。必要な場所だけ上書きすればよい。
 */
export interface SlideModalClassNames {
  /** 背景オーバーレイ */
  overlay?: string;
  /** カード本体 */
  card?: string;
  /** 進捗ドットの行（複数スライド時のみ表示） */
  header?: string;
  /** スライド本体の領域（高さの調整など） */
  body?: string;
  /** 各スライド本体（アニメーション付き） */
  slide?: string;
  /** フッター */
  footer?: string;
  /** 「戻る」ボタン */
  backButton?: string;
  /** 「次へ」ボタン */
  nextButton?: string;
  /** 最終スライドの主ボタン（スタート / とじる 等） */
  completeButton?: string;
  /** × 閉じるボタン（onClose 指定時のみ表示） */
  closeButton?: string;
}

export interface SlideModalProps {
  /** 表示状態。false のときは何も描画しない */
  open: boolean;
  /**
   * 各スライドの中身。**直下の子 1 つ = スライド 1 枚**として扱う
   * （内部で `Children.toArray` により配列化する。null / false の子は除外される）。
   * スライドの中身は各 feature 側で定義して渡す。
   * 子が 1 つのときは進捗ドットと前後ナビを自動で隠し、主ボタンのみ表示する。
   *
   * 注意: `<>...</>`（Fragment）で複数要素を包むと「1 枚」として扱われる。
   * 複数スライドにしたい場合は Fragment で包まず、直下に並べること。
   */
  children: ReactNode;
  /** 最終スライドの主ボタン押下時に呼ばれる */
  onComplete: () => void;
  /** 主ボタンのラベル（既定: 'スタート ▶'） */
  completeLabel?: string;
  /**
   * 指定すると × ボタン・背景クリック・ESC キーで閉じられるようになる。
   * 未指定（強制チュートリアル用途）の場合は閉じる導線を出さない。
   */
  onClose?: () => void;
  /** スクリーンリーダー向けのラベル（必須） */
  ariaLabel: string;
  /** スロット別のクラス上書き。既定値に `cn()` でマージされる */
  classNames?: SlideModalClassNames;
}

/**
 * ゲーム全体で共通利用するスライド式モーダル。
 *
 * 「枠（オーバーレイ + カード + フッター）」と「スライド送り（進捗ドット・前後移動・
 * 双方向アニメーション）」を担当し、各スライドの中身だけを `children` で受け取る
 * （直下の子 1 つ = スライド 1 枚）。
 * サイズ・色などの見た目は本コンポーネント内に統一値として固定し、ここが唯一の
 * デザイン定義になる（個別の上書きは `classNames` から行う）。
 *
 * - 1 枚 … 進捗ドット・前後ナビを隠し、主ボタンのみ表示（導入説明など）
 * - 複数枚 … 進捗ドット + 「戻る / 次へ」、最終スライドで主ボタンに切り替え
 *
 * 閉じる挙動は `onClose` の有無で出し分ける:
 * - `onClose` あり … × ボタン・背景クリック・ESC で閉じられる（任意の説明モーダル）
 * - `onClose` なし … 閉じる導線なし（強制チュートリアル）
 *
 * 状態（現在スライド・アニメ方向）は内部で保持する。`onComplete` / `onClose` を
 * 経由して閉じると次回は 1 枚目から開く。親が外部状態だけで強制的に閉じる場合は、
 * `key` を変えて再マウントするとリセットできる。
 */
export default function SlideModal({
  open,
  children,
  onComplete,
  completeLabel = 'スタート ▶',
  onClose,
  ariaLabel,
  classNames,
}: SlideModalProps) {
  /** 現在表示中のスライド index（0 始まり） */
  const [slideIndex, setSlideIndex] = useState(0);
  /**
   * 直前操作の方向（1 = 進む、-1 = 戻る）。
   * AnimatePresence の custom prop に渡し、enter/exit の向きを切り替える。
   */
  const [direction, setDirection] = useState<1 | -1>(1);
  /** カード（ダイアログ本体）への参照。フォーカス管理に使う */
  const cardRef = useRef<HTMLDivElement>(null);
  /** モーダルを開く直前にフォーカスしていた要素（閉じたら戻す） */
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // open が false→true に変わったら 1 枚目から開くよう状態をリセットする。
  // 「前回レンダーの値を保持して描画中に調整する」React 公式パターン
  // （effect ではないため set-state-in-effect ルールに抵触しない）。
  // これにより、呼び出し側が onComplete/onClose を経由せず open を直接トグルしても
  // 必ず先頭スライドから開く（key での再マウントに頼らずに済む）。
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSlideIndex(0);
      setDirection(1);
    }
  }

  // 背景スクロールのロック（開いている間のみ）。
  // DOM 操作のみで setState を含まないため effect 本体で同期実行してよい。
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // 開いたらダイアログ本体へフォーカスを移し、閉じたら元の要素へ戻す。
  // DOM 操作のみで setState を含まないため effect 本体で同期実行してよい。
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    cardRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  // キーボード操作: ESC で閉じる（onClose 指定時のみ）＋ Tab のフォーカストラップ。
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 閉じるだけ。再オープン時のリセットは描画中の prevOpen 判定が担う。
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      // フォーカストラップ: 先頭/末尾でループさせ、モーダル外へ出さない。
      const focusables = getFocusableElements(cardRef.current);
      if (focusables.length === 0) {
        e.preventDefault();
        cardRef.current?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const insideModal = cardRef.current?.contains(active) ?? false;
      if (e.shiftKey) {
        if (!insideModal || active === first || active === cardRef.current) {
          e.preventDefault();
          last?.focus();
        }
      } else if (!insideModal || active === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 直下の子を配列化（null / false / undefined は除外され、key も自動付与される）。
  const slides = Children.toArray(children);

  if (!open || slides.length === 0) return null;

  const isMultiSlide = slides.length > 1;
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === slides.length - 1;
  // noUncheckedIndexedAccess 環境のため undefined の可能性を明示的に潰す。
  const currentSlide = slides[slideIndex] ?? null;

  const handlePrev = () => {
    setDirection(-1);
    setSlideIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  // 主ボタン（最終スライド / 単一スライドで表示）。
  // NOTE: ここで使う #57d071 / #2d5be3 / #f1cf44 はネオブルータリズムのブランドカラー。
  // 現状 sorterConstants.ts の SORTER_UI_COLORS と同値が重複しているが、色トークンの
  // 一元化は別途対応とし、当面はこの共通モーダルを「統一されたデザイン定義」とする。
  const completeButton = (
    <button
      type="button"
      onClick={onComplete}
      className={cn(
        NEO_FOOTER_BUTTON_BASE,
        'bg-[#57d071] px-6 text-white sm:px-8',
        classNames?.completeButton
      )}
    >
      {completeLabel}
    </button>
  );

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm',
        classNames?.overlay
      )}
      // 背景クリックで閉じる（onClose 指定時のみ）。onMouseDown + target 判定にすることで、
      // カード内でドラッグ開始 → 背景でリリースした際の誤クローズを防ぐ。
      onMouseDown={
        onClose
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[24px] border-[6px] border-black bg-white shadow-[8px_8px_0_0_#000] outline-none sm:max-w-2xl lg:max-w-5xl',
          classNames?.card
        )}
      >
        {/*
          ヘッダー帯（常に表示）。フッターと上下対称にし、カードの見た目を統一する。
          - 複数スライド時: 中央に進捗ドット
          - onClose 指定時: 右端に × ボタン（絶対配置でドット中央寄せを邪魔しない）
          - 1 枚 & onClose なし: 空帯（黄色のみ。上下対称の役割を担う）
        */}
        <div
          className={cn(
            'relative flex min-h-[44px] shrink-0 items-center justify-center border-b-[3px] border-black bg-[#f1cf44] py-3 sm:min-h-[52px] sm:py-4',
            classNames?.header
          )}
        >
          {isMultiSlide && (
            <div className="flex gap-2 sm:gap-3">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-3 w-3 rounded-full border-[2px] border-black sm:h-4 sm:w-4',
                    i === slideIndex ? 'bg-black' : 'bg-white'
                  )}
                  aria-hidden
                />
              ))}
            </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className={cn(
                'absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-[2px] border-black bg-white text-base font-black leading-none shadow-[2px_2px_0_0_#000] transition-transform hover:scale-110 active:scale-95 sm:h-9 sm:w-9 sm:text-lg',
                classNames?.closeButton
              )}
            >
              ×
            </button>
          )}
        </div>

        {/*
          スライド本体（双方向アニメーション）。
          高さは統一値を min-h で確保し、スライド切替時に枠が揺れないようにする。
          中身が縦に溢れる場合は各スライド（absolute inset-0）を overflow-y-auto に
          逃がし、`m-auto` で収まる時は中央寄せ・溢れる時は上端からスクロール表示する。
        */}
        <div
          className={cn(
            'relative min-h-[440px] flex-1 overflow-hidden sm:min-h-[420px] lg:min-h-[400px]',
            classNames?.body
          )}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={slideIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 flex overflow-y-auto px-6 py-6 sm:px-10 lg:px-12"
            >
              <div className="m-auto w-full">{currentSlide}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/*
          フッター（主ボタン / 戻る・次へ）。
          - 1 枚: 主ボタンのみ中央
          - 複数枚 & 最初: 「戻る」は非表示（押せないボタンは情報ノイズ）→ 次へを右寄せ
          - 複数枚 & 中間/末尾: 戻る（左）+ 次へ or 主ボタン（右）
        */}
        <div
          className={cn(
            'flex shrink-0 items-center gap-3 border-t-[3px] border-black bg-[#f1cf44] p-4 sm:p-5',
            !isMultiSlide
              ? 'justify-center'
              : isFirst
                ? 'justify-end'
                : 'justify-between',
            classNames?.footer
          )}
        >
          {isMultiSlide ? (
            <>
              {!isFirst && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className={cn(
                    NEO_FOOTER_BUTTON_BASE,
                    'bg-white px-4 sm:px-6',
                    classNames?.backButton
                  )}
                >
                  ← 戻る
                </button>
              )}
              {isLast ? (
                completeButton
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className={cn(
                    NEO_FOOTER_BUTTON_BASE,
                    'bg-[#2d5be3] px-4 text-white sm:px-6',
                    classNames?.nextButton
                  )}
                >
                  次へ →
                </button>
              )}
            </>
          ) : (
            completeButton
          )}
        </div>
      </div>
    </div>
  );
}
