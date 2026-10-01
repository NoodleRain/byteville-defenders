// Night Watch engine: a tiny firewall language, a tiny Snort-style detection language,
// and a seeded log generator. Everything runs on simulated traffic in the browser.

/* ---------------- addresses ---------------- */
export const HOME_NET = '10.0.1.0/24';

export function ipToInt(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some(p => p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/** Checks that an address spec is valid: any, an IP, a CIDR block, or $HOME_NET. */
export function validAddr(spec: string): boolean {
  if (spec === 'any' || spec === '$home_net') return true;
  const [ip, bits] = spec.split('/');
  if (ipToInt(ip) === null) return false;
  if (bits === undefined) return true;
  const b = Number(bits);
  return /^\d+$/.test(bits) && b >= 0 && b <= 32;
}

export function addrMatches(spec: string, ip: string): boolean {
  if (spec === 'any') return true;
  if (spec === '$home_net') spec = HOME_NET;
  const [base, bits] = spec.split('/');
  const a = ipToInt(base), b = ipToInt(ip);
  if (a === null || b === null) return false;
  if (bits === undefined) return a === b;
  const n = Number(bits);
  if (n === 0) return true;
  const mask = (0xffffffff << (32 - n)) >>> 0;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}

/** "any", "443", or "80,443". Returns null when invalid. */
function parsePorts(tok: string): number[] | 'any' | null {
  if (tok === 'any') return 'any';
  const list = tok.split(',').map(s => s.trim());
  if (list.some(s => !/^\d+$/.test(s) || Number(s) > 65535)) return null;
  return list.map(Number);
}

/* ---------------- firewall rules ---------------- */
export type Proto = 'tcp' | 'udp' | 'icmp';
export interface FwRule { line: number; text: string; action: 'allow' | 'block'; proto: Proto | 'any'; src: string; dst: string; ports: number[] | 'any'; established: boolean }
export interface FwPacket { label: string; proto: Proto; src: string; dst: string; port: number; state?: 'new' | 'est'; want: 'allow' | 'block' }
export interface ParseResult<T> { rules: T[]; errors: string[] }

const ACTIONS: Record<string, 'allow' | 'block'> = { allow: 'allow', accept: 'allow', pass: 'allow', block: 'block', deny: 'block', drop: 'block' };

export function parseFirewall(src: string): ParseResult<FwRule> {
  const rules: FwRule[] = [];
  const errors: string[] = [];
  src.split('\n').forEach((raw, i) => {
    const text = raw.replace(/#.*$/, '').trim();
    if (!text) return;
    const t = text.toLowerCase().split(/\s+/);
    const where = `Line ${i + 1}`;
    if (t.length < 6 || t.length > 7) { errors.push(`${where}: expected 6 parts, like  allow tcp any -> 10.0.1.10 443`); return; }
    const [act, proto, s, arrow, d, port, extra] = t;
    if (!ACTIONS[act]) { errors.push(`${where}: start with allow or block, not "${act}".`); return; }
    if (!['tcp', 'udp', 'icmp', 'any'].includes(proto)) { errors.push(`${where}: protocol must be tcp, udp, icmp, or any.`); return; }
    if (arrow !== '->') { errors.push(`${where}: put  ->  between the source and the destination.`); return; }
    if (!validAddr(s)) { errors.push(`${where}: "${s}" is not a valid source. Use any, an IP, or a block like 10.0.2.0/24.`); return; }
    if (!validAddr(d)) { errors.push(`${where}: "${d}" is not a valid destination.`); return; }
    const ports = parsePorts(port);
    if (ports === null) { errors.push(`${where}: "${port}" is not a valid port. Use any, 443, or 80,443.`); return; }
    if (extra !== undefined && extra !== 'established') { errors.push(`${where}: the only word allowed at the end is "established".`); return; }
    rules.push({ line: i + 1, text, action: ACTIONS[act], proto: proto as FwRule['proto'], src: s, dst: d, ports, established: extra === 'established' });
  });
  return { rules, errors };
}

export function fwMatch(r: FwRule, p: FwPacket): boolean {
  if (r.proto !== 'any' && r.proto !== p.proto) return false;
  if (!addrMatches(r.src, p.src) || !addrMatches(r.dst, p.dst)) return false;
  if (r.ports !== 'any') { if (p.proto === 'icmp' || !r.ports.includes(p.port)) return false; }
  if (r.established && p.state !== 'est') return false;
  return true;
}

/** First match wins. If nothing matches, this careless firewall lets the packet through. */
export function fwDecide(rules: FwRule[], p: FwPacket): { got: 'allow' | 'block'; by: number } {
  for (let i = 0; i < rules.length; i++) if (fwMatch(rules[i], p)) return { got: rules[i].action, by: i };
  return { got: 'allow', by: -1 };
}

/* ---------------- detection rules (Snort style) ---------------- */
export interface IdsRule { line: number; proto: Proto | 'ip'; src: string; sport: number[] | 'any'; dst: string; dport: number[] | 'any'; contents: { text: string; nocase: boolean }[]; msg: string }
export interface IdsEvent { label: string; proto: Proto; src: string; dst: string; port: number; payload: string; want: 'alert' | 'quiet' }

export function parseIds(src: string): ParseResult<IdsRule> {
  const rules: IdsRule[] = [];
  const errors: string[] = [];
  src.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const where = `Line ${i + 1}`;
    const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*\((.*)\)\s*$/);
    if (!m) { errors.push(`${where}: expected  alert tcp any any -> $HOME_NET 80 (content:"..."; )`); return; }
    const [, act, proto, s, sp, arrow, d, dp, opts] = m;
    if (act.toLowerCase() !== 'alert') { errors.push(`${where}: detection rules start with alert.`); return; }
    const pr = proto.toLowerCase();
    if (!['tcp', 'udp', 'icmp', 'ip'].includes(pr)) { errors.push(`${where}: protocol must be tcp, udp, icmp, or ip.`); return; }
    if (arrow !== '->') { errors.push(`${where}: put  ->  between source and destination.`); return; }
    if (!validAddr(s.toLowerCase()) || !validAddr(d.toLowerCase())) { errors.push(`${where}: check the addresses. Use any, an IP, a block like 10.0.1.0/24, or $HOME_NET.`); return; }
    const sport = parsePorts(sp.toLowerCase()), dport = parsePorts(dp.toLowerCase());
    if (sport === null || dport === null) { errors.push(`${where}: ports must be any, a number, or a list like 80,443.`); return; }
    const contents: IdsRule['contents'] = [];
    let msg = '';
    const re = /\s*([a-z_]+)\s*(?::\s*(?:"((?:[^"\\]|\\.)*)"|([^;]*)))?\s*;/gi;
    const body = opts.trim().endsWith(';') ? opts : opts + ';';
    let k: RegExpExecArray | null;
    let consumed = 0;
    while ((k = re.exec(body))) {
      consumed += k[0].length;
      const key = k[1].toLowerCase();
      if (key === 'content') {
        if (k[2] === undefined) { errors.push(`${where}: content needs quotes, like content:"OR 1=1";`); return; }
        contents.push({ text: k[2].replace(/\\(.)/g, '$1'), nocase: false });
      } else if (key === 'nocase') {
        if (!contents.length) { errors.push(`${where}: nocase must come after a content.`); return; }
        contents[contents.length - 1].nocase = true;
      } else if (key === 'msg') { msg = k[2] || ''; }
      else if (key === 'sid' || key === 'rev' || key === 'classtype') { /* accepted, not used */ }
      else { errors.push(`${where}: Night Watch understands content, nocase, msg, sid and rev. "${key}" is not one of them.`); return; }
    }
    if (body.slice(consumed).trim()) { errors.push(`${where}: check the options. Each one ends with a semicolon.`); return; }
    if (!contents.length) { errors.push(`${where}: add at least one content:"..."; so the rule knows what to look for.`); return; }
    rules.push({ line: i + 1, proto: pr as IdsRule['proto'], src: s.toLowerCase(), sport, dst: d.toLowerCase(), dport, contents, msg });
  });
  return { rules, errors };
}

export function idsFires(r: IdsRule, e: IdsEvent): boolean {
  if (r.proto !== 'ip' && r.proto !== e.proto) return false;
  if (!addrMatches(r.src, e.src) || !addrMatches(r.dst, e.dst)) return false;
  if (r.dport !== 'any' && !r.dport.includes(e.port)) return false;
  return r.contents.every(c => c.nocase ? e.payload.toLowerCase().includes(c.text.toLowerCase()) : e.payload.includes(c.text));
}

export function idsDecide(rules: IdsRule[], e: IdsEvent): { got: 'alert' | 'quiet'; by: number } {
  for (let i = 0; i < rules.length; i++) if (idsFires(rules[i], e)) return { got: 'alert', by: i };
  return { got: 'quiet', by: -1 };
}

/* ---------------- seeded random, for logs that are the same for every student ---------------- */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clock(startSec: number): string {
  const s = ((startSec % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map(v => String(v).padStart(2, '0')).join(':');
}
