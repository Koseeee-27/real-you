'use client';

import Image from 'next/image';
import { motion, useAnimate } from 'framer-motion';
import type { AnimationPlaybackControls } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { PackageType } from '@/features/games/types';
import {
  BELT_HEIGHT_PX,
  BELT_LANE_HEIGHT_PX,
  BELT_TURN_WIDTH_PX,
  PACKAGE_IMAGE_PATHS,
  PACKAGE_LABELS,
  PACKAGE_TYPES,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';
import type { ActivePackage } from '../hooks/useSorterGame';

interface PackageItemProps {
  pkg: ActivePackage;
  /** ベルトコンテナの実測幅（px）。U 字経路の折り返し位置算出に使用 */
  beltWidth: number;
  isSelected: boolean;
  /** 機械停止中か。D&D を無効化し、pointerdown はクリック（panicClick 集計）に流す */
  isFrozen: boolean;
  /** クリック（選択 / 解除トグル）。ドラッグ未満のタップで呼ぶ */
  onClick: (id: number) => void;
  /** D&D 掴み開始（ドラッグ閾値超え時）。hesitation 起点を記録する */
  onGrab: (id: number) => void;
  /** D&D ドロップ確定。binType が非 null なら仕分け、null なら取り消し */
  onDrop: (id: number, binType: PackageType | null) => void;
  onOutflow: (id: number) => void;
  /**
   * ドラッグ状態の変化を親に通知する（掴み開始で true、ドロップ / 取り消し / 中断で false）。
   * 親（SorterGameFlow）はこれを集計して belt レイヤーの z-index を BinTray より前面に
   * 引き上げ、ドラッグ中の荷物が bin の背面に隠れないようにする（stacking context 対策）。
   */
  onDragStateChange: (id: number, dragging: boolean) => void;
  /**
   * ドラッグ中、ポインタ直下の仕分け先（bin）種別の変化を親に通知する。
   * bin の上なら該当種別、bin 外なら null。親は受け取った種別の bin をハイライトし
   * 「ここでドロップできる」を視覚的に示す。ドラッグ終了 / 凍結突入で null を通知してクリアする。
   */
  onHoverBinChange: (binType: PackageType | null) => void;
}

/**
 * 荷物画像の表示サイズ（px、見た目のサイズ）。
 * 当たり判定（button）はこれより一回り大きい HIT サイズにし、画像はその中央に置く。
 */
const PACKAGE_IMAGE_SIZE_PX = 110;

/**
 * 画像の周囲に設ける透明な当たり判定パディング（各辺、px）。
 * 見た目を変えずにクリック可能領域だけ広げ、流れる荷物を押しやすくする。
 */
const PACKAGE_HIT_PADDING_PX = 14;

/**
 * 当たり判定（button）のサイズ（px）。画像サイズ + 上下左右パディング
 * （= PACKAGE_IMAGE_SIZE_PX + PACKAGE_HIT_PADDING_PX × 2）。
 * lane 高さ（BELT_LANE_HEIGHT_PX）に収まる必要がある
 * （PACKAGE_HIT_SIZE_PX ≤ BELT_LANE_HEIGHT_PX）。
 * この値が BELT_LANE_HEIGHT_PX を超えると lane からはみ出すので注意。
 */
const PACKAGE_HIT_SIZE_PX = PACKAGE_IMAGE_SIZE_PX + PACKAGE_HIT_PADDING_PX * 2;

/**
 * 折り返し位置の X 座標を決める際の視覚的な微調整値（px）。
 * button（HIT サイズ）の左上を基準に置くと、画像中心は `buttonLeft + HIT/2` に来る。
 * `beltWidth - BELT_TURN_WIDTH_PX - PACKAGE_HIT_SIZE_PX` のままだと画像が折り返し
 * 領域の手前に寄りすぎるため、内側に少し寄せて画像をわずかに折り返しへ重ねる。
 */
const PACKAGE_TURN_X_NUDGE_PX = 30;

/**
 * 上 lane / 下 lane の中央 Y 座標（button = HIT サイズの左上基準）。
 * button 中心が lane の縦中央に来るよう HIT サイズで算出する。
 * 画像は button 内で中央寄せのため、結果として画像も lane 中央に保たれる。
 */
const TOP_LANE_Y = BELT_LANE_HEIGHT_PX / 2 - PACKAGE_HIT_SIZE_PX / 2;
const BOTTOM_LANE_Y =
  BELT_HEIGHT_PX - BELT_LANE_HEIGHT_PX / 2 - PACKAGE_HIT_SIZE_PX / 2;

/**
 * これ以上ポインタが動いたら「ドラッグ」とみなす閾値（px）。
 * 閾値未満で離した場合はタップ = クリック（選択 / 解除）として扱い、
 * クリック 2 ステップ操作と D&D を 1 つの pointer ジェスチャーで両立させる。
 */
const DRAG_THRESHOLD_PX = 6;

/**
 * pointerup 位置から仕分け先（bin）の種別を判定する。
 * BinTray の各 bin に付与した `data-bin-type` 属性を document.elementFromPoint から辿る。
 * bin の上でなければ null（取り消し）。属性値が PackageType でない場合も null にする。
 */
function resolveDropBin(clientX: number, clientY: number): PackageType | null {
  const el = document.elementFromPoint(clientX, clientY);
  const binEl = el?.closest<HTMLElement>('[data-bin-type]');
  const value = binEl?.dataset.binType;
  return value != null && (PACKAGE_TYPES as readonly string[]).includes(value)
    ? (value as PackageType)
    : null;
}

/**
 * 画面に流れている荷物 1 個。
 *
 * framer-motion の `useAnimate` で U 字経路を 1 周アニメーション制御し（流出 = 完了）、
 * 選択演出（緑グロー）と D&D の追従は内側 wrapper（motion.div）の transform で行う。
 * 親 button の位置アニメ（x/y）と内側 wrapper の演出 / 追従 transform を分離することで、
 * 両者の transform 衝突を避ける。
 *
 * 操作（クリック 2 ステップ / D&D 両対応、タッチは pointer events）:
 *   - pointerdown: ドラッグ候補開始。起点座標を記録し pointer capture する
 *   - pointermove: 移動が DRAG_THRESHOLD_PX を超えたら「掴む」（onGrab + フローアニメ pause）。
 *                  以降は内側 wrapper をポインタに追従させる（moving target を掴んでも破綻しない）
 *   - pointerup:
 *       - ドラッグした場合: ドロップ位置の bin を判定し onDrop(id, binType | null)。
 *         取り消し（bin 外）なら追従オフセットを戻してフローアニメを再開（play）
 *       - ドラッグ未満（タップ）の場合: onClick(id)（選択 / 解除トグル）
 *   - 機械停止中（isFrozen）は D&D を無効化し、pointerdown を onClick に流す（panicClick 集計）
 *
 * 速度切替の設計:
 *   - 起動時の `duration` は **spawn 時の flowDurationMs** を直接使う
 *   - 進行中アニメの中途切替は `controls.speed` で行う。起動時 duration を基準に
 *     `speed = spawnFlowDurationMs / pkg.flowDurationMs` で補正する
 */
export default function PackageItem({
  pkg,
  beltWidth,
  isSelected,
  isFrozen,
  onClick,
  onGrab,
  onDrop,
  onOutflow,
  onDragStateChange,
  onHoverBinChange,
}: PackageItemProps) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const firedRef = useRef(false);

  /** D&D 中のポインタ追従オフセット（内側 wrapper の translate に乗せる） */
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null
  );

  /**
   * pointer ジェスチャーの状態。
   * - pointerId: capture 中の pointerId（複数 pointer 混在防止）
   * - startX/startY: pointerdown 時のクライアント座標（ドラッグ判定の基準）
   * - dragging: 閾値を超えて「掴んだ」状態か
   */
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);

  /**
   * spawn 時点の flowDurationMs を ref で固定保持。
   * アニメ起動 duration の基準として使い、中途切替時の speed 計算で
   * `spawnFlowDurationMs / pkg.flowDurationMs` を返すための base になる。
   */
  const spawnFlowDurationMsRef = useRef(pkg.flowDurationMs);

  /**
   * `onOutflow` を ref に逃がす。アニメ完了は 1 度だけ起動する effect の中で
   * Promise like に hook するため、依存配列に `onOutflow` を含めずに済ませる。
   */
  const onOutflowRef = useRef(onOutflow);
  useEffect(() => {
    onOutflowRef.current = onOutflow;
  }, [onOutflow]);

  /**
   * `onDragStateChange` を ref に逃がす。unmount cleanup で「ドラッグ中のまま消えた荷物」の
   * 前面化フラグを確実に解除するため、依存配列を増やさずに最新の関数を呼べるようにする。
   */
  const onDragStateChangeRef = useRef(onDragStateChange);
  useEffect(() => {
    onDragStateChangeRef.current = onDragStateChange;
  }, [onDragStateChange]);

  /**
   * `onHoverBinChange` を ref に逃がす。unmount cleanup で「ドラッグ中のまま消えた荷物」の
   * ホバーハイライトを確実に解除するため、依存配列を増やさずに最新の関数を呼べるようにする。
   */
  const onHoverBinChangeRef = useRef(onHoverBinChange);
  useEffect(() => {
    onHoverBinChangeRef.current = onHoverBinChange;
  }, [onHoverBinChange]);

  /**
   * 現在ドラッグ中（掴み済み）かを ref で追う。pointerup / cancel で false に戻す。
   * 通常はそれらのハンドラ内で親へ false 通知するが、万一 pointer イベントを経由せず
   * unmount された場合の保険として、cleanup でこのフラグを見て前面化を確実に解除する
   * （belt z が前面のまま取り残されるのを防ぐ）。
   */
  const isDraggingRef = useRef(false);

  // ドラッグ中のまま unmount された荷物の前面化フラグ・ホバーハイライトを確実に解除する保険
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        onDragStateChangeRef.current(pkg.id, false);
        onHoverBinChangeRef.current(null);
      }
    };
  }, [pkg.id]);

  // animation の起動（beltWidth が確定したら 1 回だけ）
  useEffect(() => {
    if (!scope.current || beltWidth === 0) return;

    const turnX = Math.max(
      0,
      beltWidth -
        BELT_TURN_WIDTH_PX -
        PACKAGE_HIT_SIZE_PX +
        PACKAGE_TURN_X_NUDGE_PX
    );
    const controls = animate(
      scope.current,
      {
        x: [-PACKAGE_HIT_SIZE_PX - 20, turnX, turnX, -PACKAGE_HIT_SIZE_PX - 20],
        y: [TOP_LANE_Y, TOP_LANE_Y, BOTTOM_LANE_Y, BOTTOM_LANE_Y],
      },
      {
        duration: spawnFlowDurationMsRef.current / 1000,
        times: [0, 0.45, 0.55, 1],
        ease: 'linear',
      }
    );
    controlsRef.current = controls;

    // アニメ完了 = 流出。Promise like で onComplete を扱う。
    controls.then(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      onOutflowRef.current(pkg.id);
    });

    return () => {
      controls.stop();
    };
  }, [beltWidth, pkg.id, scope, animate]);

  // pkg.flowDurationMs の変更を進行中アニメに反映（速度上昇切替）
  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.speed =
      spawnFlowDurationMsRef.current / pkg.flowDurationMs;
  }, [pkg.flowDurationMs]);

  // =========================================================
  // pointer ハンドラ（クリック 2 ステップ / D&D の両対応）
  // =========================================================

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>): void {
    // 機械停止中は D&D 無効。クリック（panicClick 集計）に流す。
    if (isFrozen) {
      onClick(pkg.id);
      return;
    }
    // 主ボタン以外（右クリック等）は無視
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
    // 以降の move/up を確実にこの要素で受け取る
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>): void {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.dragging) {
      // 機械停止中は新規の掴みを開始しない（操作無効）
      if (isFrozen) return;
      // 閾値を超えたら「掴む」へ遷移
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      g.dragging = true;
      isDraggingRef.current = true; // unmount cleanup での前面化解除判定に使う
      onGrab(pkg.id); // hesitation 起点を記録（選択と同じ起点）
      onDragStateChange(pkg.id, true); // belt レイヤーを前面化（bin の背面に隠れない）
      controlsRef.current?.pause(); // フローアニメを一時停止してポインタ追従に切替
    }
    // 追従オフセットを内側 wrapper に反映
    setDragOffset({ x: dx, y: dy });
    // ポインタ直下の bin をハイライト対象として親へ通知（bin 外なら null）。
    // ドロップ判定（pointerup）と同じ resolveDropBin を使い、ホバー中も同じ基準で示す。
    onHoverBinChange(resolveDropBin(e.clientX, e.clientY));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>): void {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (!g.dragging) {
      // ドラッグ未満 = タップ → クリック扱い（選択 / 解除トグル）
      onClick(pkg.id);
      return;
    }

    // ドラッグ終了 → belt レイヤーの前面化・bin ハイライトを解除（仕分け確定 / 取り消し共通）
    isDraggingRef.current = false;
    onDragStateChange(pkg.id, false);
    onHoverBinChange(null);

    // ドラッグ確定 → ドロップ先の bin を判定。
    // ただしドラッグ中に機械停止に入った場合は仕分けさせず、追従を戻してフローを再開する
    // （フック側でも frozen 中の操作は panicClick 集計のみで仕分けしないため、
    //  ここで復帰しないと荷物がドラッグ位置に取り残される）。
    const binType = isFrozen ? null : resolveDropBin(e.clientX, e.clientY);
    if (binType == null) {
      // 取り消し: 追従オフセットを戻し、フローアニメを再開（元の経路を継続）
      setDragOffset(null);
      controlsRef.current?.play();
    }
    // binType 非 null（仕分け確定）の場合、親で荷物が除去され unmount されるため
    // オフセット復帰は不要。
    onDrop(pkg.id, binType);
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLButtonElement>): void {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    // ドラッグ中の中断は取り消し扱い（フロー再開）
    if (g.dragging) {
      isDraggingRef.current = false;
      onDragStateChange(pkg.id, false); // belt レイヤーの前面化を解除
      onHoverBinChange(null); // bin ハイライトを解除
      setDragOffset(null);
      controlsRef.current?.play();
      onDrop(pkg.id, null);
    }
  }

  const isDragging = dragOffset != null;

  return (
    <button
      ref={scope}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="absolute flex items-center justify-center border-none bg-transparent p-0 select-none"
      style={{
        // button = 当たり判定サイズ（画像 + 透明パディング）。押しやすさのため画像より大きい。
        width: `${PACKAGE_HIT_SIZE_PX}px`,
        height: `${PACKAGE_HIT_SIZE_PX}px`,
        top: 0,
        left: 0,
        // ドラッグ中は掴んでいる感を出すためカーソルを grabbing に
        cursor: isDragging ? 'grabbing' : 'grab',
        // ドラッグ中 / 選択中は最前面に持ち上げる
        zIndex: isDragging || isSelected ? 30 : 10,
        // タッチでのスクロール / 既定ジェスチャーを抑止し、D&D を安定させる
        touchAction: 'none',
      }}
      aria-label={`荷物（${PACKAGE_LABELS[pkg.type]}）${isSelected ? '・選択中' : ''}`}
    >
      {/*
        D&D 追従専用の素の div（transform は React の style で直接制御）。
        親 button は useAnimate（framer-motion）で U 字経路の位置アニメ（x/y）を、
        子の motion.div は scale/glow のパルスを framer-motion の transform で管理する。
        framer-motion が管理する要素に `style.transform` を当てても motion 側の
        transform 構築と競合して効かない（追従が表示されない原因）ため、追従の
        translate は framer-motion 管理外のこの素の div に分離して当てる。
      */}
      <div
        style={{
          width: `${PACKAGE_IMAGE_SIZE_PX}px`,
          height: `${PACKAGE_IMAGE_SIZE_PX}px`,
          // ドラッグ中はポインタ移動量（クライアント座標の差分）をそのまま translate に乗せる。
          // 親 button のフローアニメは掴んだ瞬間に pause 済みなので、この translate が
          // 「掴んだ位置からの相対移動」= ポインタ追従になる。
          transform: dragOffset
            ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
            : undefined,
        }}
      >
        {/*
          選択演出（scale/glow パルス）用の motion.div = 見た目の画像サイズ。
          transform（scale）は framer-motion が管理するため、追従 translate は付けない。

          グロー / ✓ バッジの表示判定は中央 state の `isSelected`（selectedPackageId === pkg.id）
          一本に統一する。選択は単一値なので「複数同時グロー」は構造的に発生し得ない。
          D&D 掴み時も onGrab → beginSelection で必ず selectedPackageId がセットされ isSelected=true に
          なるため、ローカルの isDragging（dragOffset 由来）をグロー判定に混ぜる必要はない
          （混ぜると、選択解除後もポインタ追従値が残った荷物にグローが残留する原因になる）。
          非選択時は scale:1 / filter:none の中立値へ戻すアニメで、パルスの残像を確実に消す。
        */}
        <motion.div
          className="relative h-full w-full"
          animate={
            isSelected
              ? {
                  scale: [1, 1.15],
                  filter: [
                    'drop-shadow(0 0 8px rgba(87,208,113,1))',
                    'drop-shadow(0 0 20px rgba(87,208,113,1))',
                  ],
                }
              : { scale: 1, filter: 'none' }
          }
          transition={
            isSelected
              ? {
                  duration: 0.5,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }
              : { duration: 0.2 }
          }
        >
          <Image
            src={PACKAGE_IMAGE_PATHS[pkg.type]}
            alt=""
            fill
            sizes={`${PACKAGE_IMAGE_SIZE_PX}px`}
            className="object-contain"
            priority={false}
            draggable={false}
          />
          {/* 選択中インジケーター: 緑のチェックマークバッジを右上に重ねる */}
          {isSelected && (
            <span
              aria-hidden
              className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-black text-sm font-black text-white shadow-[2px_2px_0_0_#000]"
              style={{ backgroundColor: SORTER_UI_COLORS.success }}
            >
              ✓
            </span>
          )}
        </motion.div>
      </div>
    </button>
  );
}
