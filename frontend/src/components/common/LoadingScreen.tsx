'use client';

import React, { startTransition, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface LoadingScreenProps {
  message?: string;
}

const MBTI_GROUPS = [
  {
    name: 'Analysts',
    color: '#E0D7FF', // Purple-ish（明るい側）
    deep: '#B9A3F2', // 深い側（グラデーション用）
    textColor: '#5D2FB7',
    characters: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  },
  {
    name: 'Diplomats',
    color: '#D7FFD7', // Green-ish
    deep: '#9FE0A0',
    textColor: '#2D812D',
    characters: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  },
  {
    name: 'Sentinels',
    color: '#D7F3FF', // Blue-ish
    deep: '#9CD6F2',
    textColor: '#2B6DA1',
    characters: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  },
  {
    name: 'Explorers',
    color: '#FFF7D7', // Yellow-ish
    deep: '#FAE79A',
    textColor: '#A17D1F',
    characters: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
  },
];

// SSR でも安定するデフォルト（各グループの先頭キャラクター）
const DEFAULT_CHARACTERS = MBTI_GROUPS.map((group) => ({
  id: group.characters[0],
  groupColor: group.color,
  groupDeep: group.deep,
  textColor: group.textColor,
}));

export default function LoadingScreen({
  message = 'Loading...',
}: LoadingScreenProps) {
  const [activeStep, setActiveStep] = useState(0);
  // クライアント側のみランダム選択（SSR/CSRハイドレーション不一致を防ぐ）
  const [selectedCharacters, setSelectedCharacters] =
    useState(DEFAULT_CHARACTERS);

  useEffect(() => {
    // startTransition でコールバック経由にして set-state-in-effect lint を回避しつつ、
    // SSR/CSR ハイドレーション不一致も防ぐ（useEffect はクライアントのみ実行される）
    startTransition(() => {
      setSelectedCharacters(
        MBTI_GROUPS.map((group) => {
          const randomIndex = Math.floor(
            Math.random() * group.characters.length
          );
          return {
            id: group.characters[randomIndex],
            groupColor: group.color,
            groupDeep: group.deep,
            textColor: group.textColor,
          };
        })
      );
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % selectedCharacters.length);
    }, 1500); // Wait for jump animation to mostly complete

    return () => clearInterval(timer);
  }, [selectedCharacters.length]);

  // 末尾の「...」を分離して、ドットだけ順番に点滅アニメーションさせる
  const hasDots = /\.+$/.test(message);
  const baseText = message.replace(/\.+$/, '');

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: selectedCharacters[activeStep].groupDeep,
        transition: 'background-color 0.8s ease',
      }}
    >
      {/* 縦グラデーション：上を少し明るく→下を深く（色変化が見えるよう控えめに） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.08) 100%)',
        }}
      />

      {/* ビネット：四隅を少し暗くして奥行きを出す */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 38%, transparent 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* 斜めに流れる光のスイープ（動き） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%)',
          backgroundSize: '250% 250%',
          animation: 'loadingGradientShift 6s ease-in-out infinite',
        }}
      />

      {/* Retro-pop dot pattern background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Characters Row */}
        <div className="relative mb-14 flex items-end justify-center gap-5 sm:gap-10">
          {/* 共有ステージ（足元の地面）: キャラが宙に浮かないよう接地感を出す */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto h-7 w-[92%] rounded-[50%] blur-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
          />
          {selectedCharacters.map((char, index) => {
            const isActive = index === activeStep;

            return (
              <div
                key={char.id}
                className="relative flex flex-col items-center"
              >
                <motion.div
                  animate={
                    isActive
                      ? {
                          y: [0, -70, 0],
                          scale: [1, 1.15, 1],
                        }
                      : { y: 0, scale: 0.9 }
                  }
                  transition={{
                    duration: 0.6,
                    ease: 'easeOut',
                  }}
                  className="relative h-32 w-32 sm:h-44 sm:w-44"
                >
                  <Image
                    src={`/images/mbti/${char.id}.png`}
                    alt={char.id}
                    fill
                    className="object-contain"
                    priority
                    // キャラと背景の間に白フチ（ステッカー風の白枠）を入れて分離させる
                    // ※ drop-shadow を増やすと重くなるため 4 方向・細め(2px)に抑える
                    style={{
                      filter:
                        'drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)',
                    }}
                  />
                </motion.div>

                {/* 足元のぼかし楕円シャドウ（ジャンプ中は小さく薄く） */}
                <motion.div
                  className="mt-1 h-3 rounded-[50%] bg-black/25 blur-[5px]"
                  animate={
                    isActive
                      ? {
                          width: ['70%', '38%', '70%'],
                          opacity: [0.3, 0.12, 0.3],
                        }
                      : { width: '70%', opacity: 0.3 }
                  }
                  transition={{ duration: 0.6 }}
                />
              </div>
            );
          })}
        </div>

        {/* Loading Text */}
        <div className="relative">
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            // 文字間隔（tracking）を wider から wide や normal に少し狭めると、文字同士がくっついてより「丸っこく」見えます
            className="text-center text-4xl font-black tracking-wide sm:text-5xl"
            style={{
              // アプリ共通の丸ゴシックに合わせて統一感を出す
              fontFamily: '"M PLUS Rounded 1c", sans-serif',
              color: '#222222',

              // 縁取りを文字の「外側」に広げます（中の文字が潰れません）
              paintOrder: 'stroke fill',
              // 白フチ（太すぎないよう少し控えめに）
              WebkitTextStroke: '6px white',
              // 硬いドロップ影をやめ、ふんわり拡散する影でゴースト感を解消
              textShadow: '0 5px 14px rgba(0,0,0,0.20)',
            }}
          >
            {baseText}
            {hasDots && (
              <span aria-hidden className="inline-flex">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.22,
                    }}
                  >
                    .
                  </motion.span>
                ))}
              </span>
            )}
          </motion.p>

          {/* 流れる進捗バー（インディターミネート） */}
          <div className="mx-auto mt-7 h-4 w-60 overflow-hidden rounded-full border-2 border-black/15 bg-white/50 shadow-inner sm:w-72">
            <motion.div
              className="h-full w-2/5 rounded-full"
              style={{
                // バーの色は固定（背景色には追従しない）・やわらかめのグレー
                backgroundImage:
                  'linear-gradient(90deg, rgba(90,90,90,0) 0%, rgba(90,90,90,0.72) 50%, rgba(90,90,90,0) 100%)',
                boxShadow: '0 0 9px rgba(0,0,0,0.18)',
              }}
              animate={{ x: ['-130%', '360%'] }}
              transition={{
                duration: 1.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </div>
      </div>

      {/* Group Name display (Subtle) */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <motion.p
          key={activeStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          className="text-center text-sm font-bold uppercase tracking-[0.3em] text-black"
          // tracking の分だけ末尾に余白が入り左寄りに見えるため、字間1個分だけ右へ寄せて相殺
          style={{ textIndent: '0.3em' }}
        >
          {MBTI_GROUPS[activeStep].name}
        </motion.p>
      </div>
    </div>
  );
}
