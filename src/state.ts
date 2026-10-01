// Player profile and progress, saved in the browser.

import { BADGES, CHAPTERS, RANKS } from './content';

export interface Profile {
  name: string;
  classCode: string;
  avatar: number;
  sessionId: string;
  createdAt: string;
}

export interface Progress {
  points: number;
  stars: Record<string, number>;
  best: Record<string, number>;
  badges: string[];
  done: string[];
  unlocked: number;
  streak: number;
  bestStreak: number;
  quick: number;
  answered: number;
  correct: number;
  playMs: number;
  /** Night Watch: solved level ids and highest unlocked level number. */
  nwSolved: string[];
  nwUnlocked: number;
  nwHints: Record<string, number>;
  /** Control Room (terminal levels). */
  opSolved: string[];
  opUnlocked: number;
  opHints: Record<string, number>;
}

interface SaveFile { profile: Profile | null; progress: Progress; sound: boolean; }

const KEY = 'byteville-defenders-v1';

const fresh = (): Progress => ({
  points: 0, stars: {}, best: {}, badges: [], done: [], unlocked: 1,
  streak: 0, bestStreak: 0, quick: 0, answered: 0, correct: 0, playMs: 0,
  nwSolved: [], nwUnlocked: 1, nwHints: {},
  opSolved: [], opUnlocked: 1, opHints: {},
});

function load(): SaveFile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as SaveFile;
      return { profile: s.profile || null, progress: Object.assign(fresh(), s.progress || {}), sound: s.sound !== false };
    }
  } catch (_) { /* storage blocked: play without saving */ }
  return { profile: null, progress: fresh(), sound: true };
}

export const store: SaveFile = load();

export function persist(): void {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) { /* ignore */ }
}

export function newSessionId(): string {
  const r = Math.random().toString(36).slice(2, 8);
  return `s-${Date.now().toString(36)}-${r}`;
}

export function resetProgress(): void {
  store.progress = fresh();
  persist();
}

export function rankFor(points: number): { name: string; next: number | null; floor: number } {
  let idx = 0;
  RANKS.forEach((r, i) => { if (points >= r[0]) idx = i; });
  return { name: RANKS[idx][1], floor: RANKS[idx][0], next: idx + 1 < RANKS.length ? RANKS[idx + 1][0] : null };
}

/** Award a badge. Returns its name if it is new. */
export function award(id: string): string | null {
  const p = store.progress;
  if (p.badges.includes(id)) return null;
  const b = BADGES.find(x => x.id === id);
  if (!b) return null;
  p.badges.push(id);
  persist();
  return b.name;
}

export function totalStars(): number {
  return Object.values(store.progress.stars).reduce((a, b) => a + b, 0);
}
export const maxStars = (): number => CHAPTERS.length * 3;
