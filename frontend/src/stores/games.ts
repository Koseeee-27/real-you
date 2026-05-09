import { atom } from 'jotai';
import type { TermsGameData } from '@/features/games/types';

export const termsGameDataAtom = atom<TermsGameData | null>(null);
