// Sends every answer to the teacher's Google Sheet (through a Google Apps Script web app),
// and keeps a local copy the student can download as a CSV.
// If no tracking URL is set in js/config.js, nothing leaves the browser.

import { store } from './state';

export interface GameEvent {
  timestamp: string;
  session_id: string;
  student: string;
  class_code: string;
  event: 'start' | 'lesson' | 'check' | 'answer' | 'chapter_complete' | 'finish';
  chapter: string;
  item_id: string;
  prompt: string;
  choice: string;
  correct_answer: string;
  correct: number | '';
  time_ms: number | '';
  points: number;
  total_points: number;
}

interface Config { trackingUrl?: string; classKey?: string; showLeaderboard?: boolean; defaultClassCode?: string }

export function config(): Config {
  const w = window as unknown as { BYTEVILLE_CONFIG?: Config };
  return w.BYTEVILLE_CONFIG || {};
}

const QUEUE_KEY = 'byteville-queue-v1';
const LOG_KEY = 'byteville-log-v1';

function read(key: string): GameEvent[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as GameEvent[]; } catch (_) { return []; }
}
function write(key: string, v: GameEvent[]): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* ignore */ }
}

let queue: GameEvent[] = read(QUEUE_KEY);
let sending = false;

export function track(e: Partial<GameEvent> & { event: GameEvent['event'] }): void {
  const prof = store.profile;
  const full: GameEvent = {
    timestamp: new Date().toISOString(),
    session_id: prof ? prof.sessionId : '',
    student: prof ? prof.name : '',
    class_code: prof ? prof.classCode : '',
    chapter: '', item_id: '', prompt: '', choice: '', correct_answer: '',
    correct: '', time_ms: '', points: 0, total_points: store.progress.points,
    ...e,
  };
  const log = read(LOG_KEY);
  log.push(full);
  write(LOG_KEY, log.slice(-3000));
  if (config().trackingUrl) {
    queue.push(full);
    write(QUEUE_KEY, queue);
    if (queue.length >= 8 || e.event === 'chapter_complete' || e.event === 'finish') flush();
  }
}

export async function flush(): Promise<void> {
  const url = config().trackingUrl;
  if (!url || sending || queue.length === 0) return;
  sending = true;
  const batch = queue.slice(0, 50);
  try {
    // text/plain avoids a CORS preflight. Apps Script reads e.postData.contents.
    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: config().classKey || '', events: batch }) });
    queue = queue.slice(batch.length);
    write(QUEUE_KEY, queue);
  } catch (_) {
    // offline: keep the queue and try again later
  } finally {
    sending = false;
  }
}

setInterval(() => { void flush(); }, 15000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });

export function trackingOn(): boolean { return !!config().trackingUrl; }

export interface LeaderRow { student: string; points: number; chapters: number }
export async function leaderboard(classCode: string): Promise<LeaderRow[] | null> {
  const c = config();
  if (!c.trackingUrl || c.showLeaderboard === false || !classCode) return null;
  try {
    const r = await fetch(`${c.trackingUrl}?action=leaderboard&class=${encodeURIComponent(classCode)}`);
    if (!r.ok) return null;
    const data = await r.json() as { rows?: LeaderRow[] };
    return data.rows || [];
  } catch (_) { return null; }
}

/** The student's own answers as CSV text. */
export function myCsv(): string {
  const cols: (keyof GameEvent)[] = ['timestamp', 'session_id', 'student', 'class_code', 'event', 'chapter', 'item_id', 'prompt', 'choice', 'correct_answer', 'correct', 'time_ms', 'points', 'total_points'];
  const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.join(',')].concat(read(LOG_KEY).map(e => cols.map(k => esc(e[k])).join(','))).join('\n');
}

/** Ask the class server something and read its answer. Returns null if the server cannot be reached. */
export async function serverPost<T>(body: Record<string, unknown>): Promise<T | null> {
  const url = config().trackingUrl;
  if (!url) return null;
  const prof = store.profile;
  try {
    const r = await fetch(url, {
      method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: config().classKey || '', session_id: prof ? prof.sessionId : '', student: prof ? prof.name : '', class_code: prof ? prof.classCode : '', ...body }),
    });
    if (!r.ok) return null;
    return await r.json() as T;
  } catch (_) { return null; }
}
