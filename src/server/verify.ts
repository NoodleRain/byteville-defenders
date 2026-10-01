// Server-side checker. Bundled into backend/Code.gs (Google Apps Script) by "npm run build".
// The server decides what is correct. It never trusts the "correct" or "points" values a browser sends.

import { CHAPTERS } from '../content';
import { NW_LEVELS, nwBase } from '../nightwatch/levels';
import { fwDecide, idsDecide, parseFirewall, parseIds } from '../nightwatch/engine';
import { generateLogs } from '../nightwatch/generate';
import { OrderPuzzle } from '../types';

/* ---------- main game answer key ---------- */
const KEY: Record<string, string> = {};
const PUZZLES: Record<string, OrderPuzzle> = {};
const LANE_ALLOW = ['website-ok', 'clean', 'tricky-clean'];
const LANE_CATS = ['website-ok', 'bad-port', 'blocklist', 'signature', 'clean', 'tricky-clean'];
const LANE_WORDS: Record<string, [string, string]> = {};

for (const c of CHAPTERS) {
  KEY[c.check.id] = c.check.options[c.check.answer];
  for (const s of c.stages) {
    if (s.type === 'sort') s.cards.forEach(x => (KEY[x.id] = s.bins[x.bin].label));
    if (s.type === 'choice') s.items.forEach(x => (KEY[x.id] = x.options[x.answer]));
    if (s.type === 'inbox') s.emails.forEach(x => (KEY[x.id] = x.phish ? 'Phish' : 'Safe'));
    if (s.type === 'order') s.puzzles.forEach(z => (PUZZLES[z.id] = z));
    if (s.type === 'lane') LANE_WORDS[c.id] = [s.yes, s.no];
  }
}

/** 1 = right, 0 = wrong, '' = not a scored item. */
export function verifyItem(itemId: string, choice: string): 1 | 0 | '' {
  if (Object.prototype.hasOwnProperty.call(KEY, itemId)) return choice === KEY[itemId] ? 1 : 0;
  const lane = itemId.match(/^(c\d)-lane-([a-z-]+)$/);
  if (lane && LANE_WORDS[lane[1]] && LANE_CATS.includes(lane[2])) {
    const [yes, no] = LANE_WORDS[lane[1]];
    return choice === (LANE_ALLOW.includes(lane[2]) ? yes : no) ? 1 : 0;
  }
  const ord = itemId.match(/^(c6-o\d)-try\d+$/);
  if (ord && PUZZLES[ord[1]]) {
    const pz = PUZZLES[ord[1]];
    const texts = choice.split(' > ');
    if (texts.length !== pz.rules.length) return 0;
    const rules = texts.map(t => pz.rules.find(r => r.text === t));
    if (rules.some(r => !r) || new Set(texts).size !== texts.length) return 0;
    const ok = pz.tests.every(t => {
      for (const r of rules) {
        if ((r!.port === undefined || r!.port === t.port) && (r!.ip === undefined || r!.ip === t.ip)) return (r!.action === 'allow') === t.allow;
      }
      return t.allow === false;
    });
    return ok ? 1 : 0;
  }
  return '';
}

/** Item key used for scoring: retries of the same puzzle count once. */
export function scoreKey(itemId: string): string { return itemId.replace(/-try\d+$/, ''); }

export const VALID_CHAPTERS = ['', ...CHAPTERS.map(c => c.id)];

/* ---------- Night Watch ---------- */
export function nwLevel(id: string) { return NW_LEVELS.find(l => l.id === id) || null; }
export { nwBase };

let cache: { seed: string; answers: Record<string, string> } | null = null;
export function logAnswers(seed: string): Record<string, string> {
  if (!cache || cache.seed !== seed) cache = { seed, answers: generateLogs(seed).answers };
  return cache.answers;
}

export function nwCheck(levelId: string, submission: string, seed: string): { ok: boolean; known: boolean } {
  const lv = nwLevel(levelId);
  if (!lv || typeof submission !== 'string' || submission.length > 4000) return { ok: false, known: false };
  if (lv.kind === 'log') {
    const v = submission.trim().toLowerCase().replace(/\s+/g, '');
    return { ok: v === logAnswers(seed)[lv.id], known: true };
  }
  if (lv.kind === 'rules') {
    const { rules, errors } = parseFirewall(submission);
    if (errors.length || !rules.length) return { ok: false, known: true };
    if (lv.maxRules !== undefined && rules.length > lv.maxRules) return { ok: false, known: true };
    return { ok: lv.packets.every(p => fwDecide(rules, p).got === p.want), known: true };
  }
  const { rules, errors } = parseIds(submission);
  if (errors.length || !rules.length) return { ok: false, known: true };
  return { ok: lv.events.every(e => idsDecide(rules, e).got === e.want), known: true };
}

export const NW_IDS = NW_LEVELS.map(l => l.id);

/* ---------- Control Room (terminal levels) ---------- */
import { generateTerminal } from '../terminal/generate';
import { OP_LEVELS, opBase } from '../terminal/levels';
import { OP7_PROBES, cleanState, op10Probes, ufwDecide } from '../terminal/ufw';

export const OP_IDS = OP_LEVELS.map(l => l.id);
let tcache: { seed: string; answers: Record<string, string> } | null = null;
export function opAnswers(seed: string): Record<string, string> {
  if (!tcache || tcache.seed !== seed) tcache = { seed, answers: generateTerminal(seed).answers as unknown as Record<string, string> };
  return tcache.answers;
}

/** Any checked level, Night Watch (nw1..nw12) or Control Room (op1..op10). */
export function levelMeta(id: string): { id: string; num: number; title: string; base: number } | null {
  const n = NW_LEVELS.find(l => l.id === id);
  if (n) return { id, num: n.num, title: 'Night Watch ' + n.num + ': ' + n.title, base: nwBase(n.num) };
  const o = OP_LEVELS.find(l => l.id === id);
  if (o) return { id, num: o.num, title: 'Control Room ' + o.num + ': ' + o.title, base: opBase(o.num) };
  return null;
}

export function check(id: string, submission: string, seed: string): { ok: boolean; failed?: string[] } {
  if (id.startsWith('nw')) return { ok: nwCheck(id, submission, seed).ok };
  const lv = OP_LEVELS.find(l => l.id === id);
  if (!lv || typeof submission !== 'string' || submission.length > 4000) return { ok: false };
  if (lv.kind === 'answer') {
    const v = submission.trim().toLowerCase().replace(/^submit\s+/, '').replace(/^src=/, '').replace(/^"|"$/g, '').trim();
    const want = opAnswers(seed)[id];
    return { ok: v === want || v === want + '.' };
  }
  let parsed: unknown;
  try { parsed = JSON.parse(submission); } catch (_) { return { ok: false }; }
  if (lv.kind === 'chmod') {
    const mode = (parsed as { mode?: unknown }).mode;
    if (typeof mode !== 'number' || !Number.isInteger(mode)) return { ok: false };
    return { ok: (mode & 0o600) === 0o600 && (mode & 0o077) === 0, failed: (mode & 0o077) ? ['Group or others can still use the file'] : (mode & 0o600) !== 0o600 ? ['You can no longer read and write it yourself'] : [] };
  }
  const st = cleanState(parsed);
  if (!st) return { ok: false, failed: ['The firewall settings could not be read'] };
  const probes = id === 'op7' ? OP7_PROBES : op10Probes(opAnswers(seed).op10);
  const failed = probes.filter(p => ufwDecide(st, p) !== p.want).map(p => `${p.label}: should be ${p.want === 'allow' ? 'allowed' : 'blocked'}`);
  return { ok: failed.length === 0, failed };
}
