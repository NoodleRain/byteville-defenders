// A small model of ufw (Uncomplicated Firewall), shared by the terminal and the class server.

import { addrMatches, validAddr } from '../nightwatch/engine';

export interface UfwRule { action: 'allow' | 'deny'; from: string; port: number | 'any'; proto: 'tcp' | 'udp' | 'any' }
export interface UfwState { enabled: boolean; defIn: 'allow' | 'deny'; rules: UfwRule[] }
export interface Probe { label: string; src: string; port: number; proto: 'tcp' | 'udp'; want: 'allow' | 'deny' }

export function ufwDecide(s: UfwState, p: Probe): 'allow' | 'deny' {
  if (!s.enabled) return 'allow';
  for (const r of s.rules) {
    if (!addrMatches(r.from, p.src)) continue;
    if (r.port !== 'any' && r.port !== p.port) continue;
    if (r.proto !== 'any' && r.proto !== p.proto) continue;
    return r.action;
  }
  return s.defIn;
}

/** Strict check of a state sent by a browser. Returns null if it is malformed. */
export function cleanState(x: unknown): UfwState | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.enabled !== 'boolean' || (o.defIn !== 'allow' && o.defIn !== 'deny') || !Array.isArray(o.rules) || o.rules.length > 40) return null;
  const rules: UfwRule[] = [];
  for (const raw of o.rules) {
    const r = raw as Record<string, unknown>;
    if (r.action !== 'allow' && r.action !== 'deny') return null;
    if (typeof r.from !== 'string' || !validAddr(r.from)) return null;
    if (!(r.port === 'any' || (typeof r.port === 'number' && Number.isInteger(r.port) && r.port >= 0 && r.port <= 65535))) return null;
    if (r.proto !== 'tcp' && r.proto !== 'udp' && r.proto !== 'any') return null;
    rules.push({ action: r.action, from: r.from, port: r.port as number | 'any', proto: r.proto });
  }
  return { enabled: o.enabled, defIn: o.defIn, rules };
}

export function ruleText(r: UfwRule): string {
  const to = r.port === 'any' ? 'Anywhere' : `${r.port}${r.proto !== 'any' ? '/' + r.proto : ''}`;
  const from = r.from === 'any' ? 'Anywhere' : r.from;
  return `${to.padEnd(22)} ${(r.action === 'allow' ? 'ALLOW IN' : 'DENY IN').padEnd(11)} ${from}`;
}

export const OP7_PROBES: Probe[] = [
  { label: 'Visitor opens the website (HTTPS)', src: '198.51.100.7', port: 443, proto: 'tcp', want: 'allow' },
  { label: 'Visitor opens the website (HTTP)', src: '192.0.2.30', port: 80, proto: 'tcp', want: 'allow' },
  { label: 'Admin laptop logs in with SSH', src: '10.0.5.20', port: 22, proto: 'tcp', want: 'allow' },
  { label: 'Student laptop tries SSH', src: '10.0.2.15', port: 22, proto: 'tcp', want: 'deny' },
  { label: 'Stranger tries SSH', src: '198.51.100.7', port: 22, proto: 'tcp', want: 'deny' },
  { label: 'Stranger tries remote desktop', src: '192.0.2.99', port: 3389, proto: 'tcp', want: 'deny' },
  { label: 'Stranger tries Telnet', src: '203.0.113.9', port: 23, proto: 'tcp', want: 'deny' },
];

export function op10Probes(attacker: string): Probe[] {
  return [
    { label: 'Attacker opens the website', src: attacker, port: 443, proto: 'tcp', want: 'deny' },
    { label: 'Attacker tries the login page over HTTP', src: attacker, port: 80, proto: 'tcp', want: 'deny' },
    { label: 'Attacker tries SSH', src: attacker, port: 22, proto: 'tcp', want: 'deny' },
    { label: 'Visitor opens the website', src: '198.51.100.7', port: 443, proto: 'tcp', want: 'allow' },
    { label: 'Admin laptop logs in with SSH', src: '10.0.5.20', port: 22, proto: 'tcp', want: 'allow' },
    { label: 'Stranger tries SSH', src: '192.0.2.99', port: 22, proto: 'tcp', want: 'deny' },
  ];
}

export const OP10_START: UfwState = {
  enabled: true, defIn: 'deny', rules: [
    { action: 'allow', from: 'any', port: 80, proto: 'tcp' },
    { action: 'allow', from: 'any', port: 443, proto: 'tcp' },
    { action: 'allow', from: '10.0.5.0/24', port: 22, proto: 'tcp' },
  ],
};
