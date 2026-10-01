// Small DOM helpers, sounds, toasts, and pop-ups.

import { store } from './state';

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T =>
  root.querySelector(sel) as T;

export function html(strings: TemplateStringsArray, ...vals: unknown[]): string {
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? String(vals[i] ?? '') : ''), '');
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function mount(target: HTMLElement, markup: string): HTMLElement {
  target.innerHTML = markup;
  return target;
}

/* ---------- sound (tiny synth, no files needed) ---------- */
let ac: AudioContext | null = null;
function tone(freq: number, dur: number, type: OscillatorType = 'triangle', vol = 0.05, delay = 0): void {
  if (!store.sound) return;
  try {
    const W = window as unknown as { webkitAudioContext?: typeof AudioContext };
    ac = ac || new (window.AudioContext || W.webkitAudioContext!)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    const t = ac.currentTime + delay;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
  } catch (_) { /* no audio */ }
}
export const sfx = {
  right: (streak = 0) => { const b = 520 + Math.min(streak, 8) * 40; tone(b, 0.1); tone(b * 1.5, 0.12, 'triangle', 0.045, 0.07); },
  wrong: () => { tone(220, 0.18, 'sine', 0.06); tone(165, 0.25, 'sine', 0.05, 0.12); },
  click: () => tone(700, 0.04, 'square', 0.02),
  badge: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.05, i * 0.1)),
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.055, i * 0.11)),
  gold: () => [880, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.03, i * 0.06)),
};

/* ---------- toasts ---------- */
const toastQ: string[] = [];
let toastBusy = false;
export function toast(text: string, kind: 'badge' | 'info' = 'info'): void {
  // Badges always queue. Small info messages are skipped if something is already showing.
  if (kind === 'info' && (toastBusy || toastQ.length)) return;
  toastQ.push(`<div class="toast-in ${kind}">${text}</div>`);
  if (!toastBusy) nextToast();
}
function nextToast(): void {
  const box = $('#toast');
  const t = toastQ.shift();
  if (!t) { toastBusy = false; box.hidden = true; return; }
  toastBusy = true; box.innerHTML = t; box.hidden = false;
  setTimeout(nextToast, toastQ.length ? 1800 : 2600);
}

/* ---------- modal ---------- */
export function modal(markup: string, buttons: { label: string; primary?: boolean; onClick: () => void }[]): void {
  const ov = $('#overlay');
  const box = $('#modal');
  box.innerHTML = markup + '<div class="modal-actions"></div>';
  const row = $('.modal-actions', box);
  buttons.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn' + (b.primary ? ' btn-primary' : '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => { ov.hidden = true; b.onClick(); });
    row.appendChild(btn);
    if (i === 0) setTimeout(() => btn.focus(), 30);
  });
  ov.hidden = false;
}
export const modalOpen = (): boolean => !$('#overlay').hidden;

/* ---------- celebrations ---------- */
export function floatPoints(anchor: HTMLElement, text: string, gold = false): void {
  const r = anchor.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'float-pts' + (gold ? ' gold' : '');
  d.textContent = text;
  d.style.left = `${r.left + r.width / 2}px`;
  d.style.top = `${r.top + window.scrollY}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

export function confetti(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#F5A623', '#17807E', '#E8604C', '#3C9D5D', '#8A5BB8', '#3B6FB6'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

/* ---------- download (works on GitHub Pages) ---------- */
export function download(name: string, text: string, type = 'text/csv'): void {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
