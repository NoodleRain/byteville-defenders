// Night Watch log generator. Every school uses its own secret seed (NW_SEED), so every
// installation gets different logs, answers and passcodes. Used by the build (to make the logs
// shown in the game) and by the class server (to check answers). The seed itself is never shipped.

import { clock, rng } from './engine';

export const FW_HEADER = 'date       time     action proto src-ip          dst-ip      src-port dst-port';

/** String to 32-bit number (cyrb53-style mix). */
export function hashSeed(s: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

function fwLine(t: number, action: string, proto: string, src: string, dst: string, sp: number | string, dp: number | string): string {
  return `2026-10-06 ${clock(t)} ${action.padEnd(6)} ${proto.padEnd(5)} ${src.padEnd(15)} ${dst.padEnd(11)} ${String(sp).padEnd(8)} ${dp}`;
}
const NETS = ['198.51.100', '192.0.2'];
function ip(r: () => number): string { return `${NETS[Math.floor(r() * 2)]}.${2 + Math.floor(r() * 240)}`; }
function visitor(r: () => number, avoid: string[]): string { let v = ip(r); while (avoid.includes(v)) v = ip(r); return v; }
function pick<T>(r: () => number, a: T[]): T { return a[Math.floor(r() * a.length)]; }

type Out = { log: string[]; answer: string };

function knock(r: () => number): Out {
  const scanner = ip(r);
  const others = [visitor(r, [scanner]), visitor(r, [scanner]), visitor(r, [scanner])];
  const rows: [number, string][] = [];
  let t = 22 * 3600 + 5 * 60;
  for (let i = 0; i < 70; i++) {
    t += 3 + Math.floor(r() * 25);
    rows.push([t, fwLine(t, 'ALLOW', 'TCP', visitor(r, [scanner]), '10.0.1.10', 49152 + Math.floor(r() * 16000), r() < .75 ? 443 : 80)]);
  }
  others.forEach((o, i) => { const at = 22 * 3600 + 5 * 60 + Math.floor(r() * 1500); rows.push([at, fwLine(at, 'DROP', 'TCP', o, '10.0.1.10', 50000 + Math.floor(r() * 9000), [22, 3389, 23][i])]); });
  let st = 22 * 3600 + 17 * 60 + 41;
  [21, 22, 23, 25, 110, 135, 139, 445, 1433, 3306, 3389, 5900].forEach((p, i) => { st += r() < .5 ? 0 : 1; rows.push([st, fwLine(st, 'DROP', 'TCP', scanner, '10.0.1.10', 40100 + i, p)]); });
  rows.sort((a, b) => a[0] - b[0]);
  return { log: rows.map(x => x[1]), answer: scanner };
}

function openDoor(r: () => number): Out {
  const scanner = ip(r);
  const open = pick(r, [7443, 8443, 8888, 9443, 10443]);
  const rows: [number, string][] = [];
  let t = 23 * 3600;
  for (let i = 0; i < 80; i++) {
    t += 2 + Math.floor(r() * 20);
    rows.push([t, fwLine(t, 'ALLOW', 'TCP', visitor(r, [scanner]), '10.0.1.10', 49152 + Math.floor(r() * 16000), r() < .8 ? 443 : 80)]);
  }
  let st = 23 * 3600 + 9 * 60 + 12;
  [20, 21, 22, 23, 25, 53, 110, 143, 445, 993, 1433, 3306, 3389, 5432, 5900, 8080, open, 9000].forEach((p, i) => {
    st += Math.floor(r() * 2);
    rows.push([st, fwLine(st, p === open ? 'ALLOW' : 'DROP', 'TCP', scanner, '10.0.1.10', 51000 + i, p)]);
  });
  rows.push([st + 30, fwLine(st + 30, 'ALLOW', 'TCP', scanner, '10.0.1.10', 51040, 443)]);
  rows.sort((a, b) => a[0] - b[0]);
  return { log: rows.map(x => x[1]), answer: String(open) };
}

function brute(r: () => number): Out {
  const atk = ip(r);
  const decoy = visitor(r, [atk]);
  const fails = 31 + Math.floor(r() * 19);
  const users = ['maya', 'leo', 'jcarter', 'principal', 'library', 'coach'];
  const rows: [number, string][] = [];
  let t = 23 * 3600 + 30 * 60;
  for (let i = 0; i < 45; i++) {
    t += 10 + Math.floor(r() * 50);
    const u = pick(r, users);
    const src = `10.0.2.${10 + Math.floor(r() * 60)}`;
    if (r() < .22) rows.push([t, `2026-10-06 ${clock(t)} sshd: Failed password for ${u} from ${src} port ${50000 + i}`]);
    rows.push([t + 4, `2026-10-06 ${clock(t + 4)} sshd: Accepted password for ${u} from ${src} port ${50000 + i}`]);
  }
  let at = 23 * 3600 + 41 * 60 + 3;
  for (let i = 0; i < fails; i++) { at += 2 + Math.floor(r() * 3); rows.push([at, `2026-10-06 ${clock(at)} sshd: Failed password for admin from ${atk} port ${41000 + i}`]); }
  rows.push([at + 3, `2026-10-06 ${clock(at + 3)} sshd: Accepted password for admin from ${atk} port ${41000 + fails}`]);
  let b = 23 * 3600 + 52 * 60;
  for (let i = 0; i < 6; i++) { b += 5; rows.push([b, `2026-10-06 ${clock(b)} sshd: Failed password for root from ${decoy} port ${43000 + i}`]); }
  rows.sort((a, c) => a[0] - c[0]);
  return { log: rows.map(x => x[1]), answer: String(fails) };
}

function slow(r: () => number): Out {
  const scanner = ip(r);
  const regulars = [0, 1, 2, 3].map(() => visitor(r, [scanner]));
  const rows: [number, string][] = [];
  let t = 3600;
  for (let i = 0; i < 260; i++) {
    t += 4 + Math.floor(r() * 36);
    const who = r() < .55 ? pick(r, regulars) : visitor(r, [scanner]);
    rows.push([t, fwLine(t, 'ALLOW', 'TCP', who, '10.0.1.10', 49152 + Math.floor(r() * 16000), r() < .7 ? 443 : 80)]);
  }
  for (let i = 0; i < 18; i++) { const at = 3600 + i * 600 + 7; rows.push([at, fwLine(at, 'ALLOW', 'ICMP', '10.0.5.9', '10.0.1.10', '-', '-')]); }
  const singles: string[] = [];
  for (let i = 0; i < 10; i++) {
    let v = visitor(r, [scanner]); while (singles.includes(v)) v = visitor(r, [scanner]);
    singles.push(v);
    const at = 3600 + Math.floor(r() * 10000);
    rows.push([at, fwLine(at, 'DROP', 'TCP', v, '10.0.1.10', 50000 + i, [22, 23, 3389, 445][i % 4])]);
  }
  let st = 3600 + 4 * 60;
  [21, 22, 23, 25, 110, 139, 445, 1433, 3306, 3389, 5432, 5900, 6379, 8080].forEach((p, i) => {
    st += 540 + Math.floor(r() * 240);
    rows.push([st, fwLine(st, 'DROP', 'TCP', scanner, '10.0.1.10', 33000 + i * 7, p)]);
    if (i % 4 === 0) rows.push([st + 61, fwLine(st + 61, 'ALLOW', 'TCP', scanner, '10.0.1.10', 33300 + i, 443)]);
  });
  rows.sort((a, b) => a[0] - b[0]);
  return { log: rows.map(x => x[1]), answer: scanner };
}

export interface Generated { logs: Record<string, string[]>; answers: Record<string, string> }

export function generateLogs(seed: string): Generated {
  if (!seed || seed.length < 12) throw new Error('NW_SEED must be at least 12 characters.');
  const make: [string, (r: () => number) => Out][] = [['nw3', knock], ['nw4', openDoor], ['nw7', brute], ['nw11', slow]];
  const logs: Record<string, string[]> = {};
  const answers: Record<string, string> = {};
  for (const [id, fn] of make) {
    const o = fn(rng(hashSeed(seed + ':' + id)));
    logs[id] = o.log;
    answers[id] = o.answer;
  }
  return { logs, answers };
}
