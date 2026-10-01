// Control Room data generator. Same idea as Night Watch: each school's secret seed makes its own
// files, IP addresses and answers. The build ships the files; the server recomputes the answers.

import { rng } from '../nightwatch/engine';
import { hashSeed } from '../nightwatch/generate';

const WORDS_A = ['amber', 'brisk', 'cedar', 'cobalt', 'copper', 'dawn', 'ember', 'frost', 'golden', 'granite', 'harbor', 'indigo', 'jade', 'lunar', 'maple', 'noble',
  'ocean', 'opal', 'quiet', 'river', 'saffron', 'silver', 'slate', 'solar', 'spruce', 'storm', 'swift', 'tidal', 'velvet', 'violet', 'willow', 'winter'];
const WORDS_B = ['anchor', 'anvil', 'beacon', 'bridge', 'cipher', 'comet', 'compass', 'falcon', 'forge', 'glacier', 'heron', 'kernel', 'lantern', 'meadow', 'orbit', 'prism',
  'quarry', 'raven', 'ridge', 'rocket', 'signal', 'sparrow', 'summit', 'thicket', 'torch', 'tower', 'valley', 'vault', 'warden', 'wave', 'wolf', 'zenith'];

const pick = <T>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pad = (n: number) => String(n).padStart(2, '0');
const ext = (r: () => number) => `${pick(r, ['198.51.100', '192.0.2', '203.0.113'])}.${int(r, 2, 250)}`;
function mac(r: () => number): string { return ['02', ...Array.from({ length: 5 }, () => int(r, 0, 255).toString(16).padStart(2, '0'))].join(':'); }
function syslogTime(sec: number): string { const h = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60, s = sec % 60; return `Oct  6 ${pad(h)}:${pad(m)}:${pad(s)}`; }

export interface TerminalData {
  host: string; ip: string; mac: string; gateway: string;
  readme: string; hidden: string;
  authLog: string[]; ufwLog: string[]; alerts: string[]; access: string[];
  listening: { proto: string; local: string; port: number }[];
}
export interface TerminalAnswers { op1: string; op2: string; op3: string; op4: string; op5: string; op6: string; op9: string; op10: string }

export function generateTerminal(seed: string): { data: TerminalData; answers: TerminalAnswers } {
  const r = rng(hashSeed(seed + ':control-room'));
  const token = () => `${pick(r, WORDS_A)}-${pick(r, WORDS_B)}-${int(r, 1000, 9999)}`;
  const host = 'web01';
  const ip = `10.0.1.${int(r, 20, 240)}`;
  const t1 = token(), t2 = token();

  // Level 3: auth.log with N "Failed password" lines among normal lines.
  const users = ['maya', 'leo', 'jcarter', 'coach', 'library'];
  const fails = int(r, 23, 48);
  const authRows: [number, string][] = [];
  let t = 21 * 3600;
  for (let i = 0; i < 70; i++) {
    t += int(r, 20, 140);
    const u = pick(r, users), src = `10.0.2.${int(r, 10, 90)}`;
    authRows.push([t, `${syslogTime(t)} ${host} sshd[${int(r, 1000, 9999)}]: Accepted password for ${u} from ${src} port ${int(r, 40000, 65000)} ssh2`]);
    if (r() < .3) authRows.push([t + 1, `${syslogTime(t + 1)} ${host} sudo:     ${u} : TTY=pts/0 ; PWD=/home/${u} ; USER=root ; COMMAND=/usr/bin/apt update`]);
  }
  for (let i = 0; i < fails; i++) {
    const at = 21 * 3600 + int(r, 0, 12000);
    const who = r() < .7 ? 'admin' : `invalid user ${pick(r, ['test', 'oracle', 'guest', 'pi'])}`;
    authRows.push([at, `${syslogTime(at)} ${host} sshd[${int(r, 1000, 9999)}]: Failed password for ${who} from ${ext(r)} port ${int(r, 40000, 65000)} ssh2`]);
  }
  authRows.sort((a, b) => a[0] - b[0]);

  // Level 4: ufw.log, one source blocked far more than any other.
  const loud = ext(r);
  const ufwRows: [number, string][] = [];
  const ufwLine = (sec: number, src: string, port: number) =>
    `${syslogTime(sec)} ${host} kernel: [${(sec / 7.3).toFixed(6)}] [UFW BLOCK] IN=eth0 OUT= MAC=${mac(r)} SRC=${src} DST=${ip} LEN=60 TTL=${int(r, 40, 64)} PROTO=TCP SPT=${int(r, 30000, 65000)} DPT=${port}`;
  for (let i = 0; i < 40; i++) { let s = ext(r); while (s === loud) s = ext(r); ufwRows.push([22 * 3600 + int(r, 0, 7000), ufwLine(0, s, pick(r, [22, 23, 3389, 445, 21, 5900]))]); }
  for (let i = 0; i < 6; i++) { const s = ext(r); if (s !== loud) for (let k = 0; k < 2; k++) ufwRows.push([22 * 3600 + int(r, 0, 7000), ufwLine(0, s, 22)]); }
  const loudCount = int(r, 14, 22);
  for (let i = 0; i < loudCount; i++) ufwRows.push([22 * 3600 + int(r, 0, 7000), ufwLine(0, loud, pick(r, [21, 22, 23, 25, 110, 139, 445, 1433, 3306, 3389, 5432, 5900, 8080]))]);
  ufwRows.forEach(x => { x[1] = x[1].replace(/^Oct  6 \d\d:\d\d:\d\d/, syslogTime(x[0])); });
  ufwRows.sort((a, b) => a[0] - b[0]);

  // Level 6: one listening service that should not be there.
  const rogue = pick(r, [21, 23, 3389, 5900, 6667, 8081]);
  const listening = [
    { proto: 'tcp', local: '0.0.0.0', port: 22 }, { proto: 'tcp', local: '0.0.0.0', port: 80 }, { proto: 'tcp', local: '0.0.0.0', port: 443 },
    { proto: 'tcp', local: '127.0.0.1', port: 3306 }, { proto: 'udp', local: '127.0.0.53', port: 53 }, { proto: 'tcp', local: '0.0.0.0', port: rogue },
  ].sort((a, b) => a.port - b.port);

  // Level 9: IDS alerts. Exactly one source raises Priority 1 alerts.
  const p1 = ext(r);
  const alertRows: [number, string][] = [];
  const sigs2 = [['1:2010935:3', 'ET SCAN Suspicious inbound to MSSQL port 1433', 'Potentially Bad Traffic', 2, 1433], ['1:2001219:20', 'ET SCAN Potential SSH Scan', 'Attempted Information Leak', 2, 22],
    ['1:2100366:8', 'GPL ICMP_INFO PING *NIX', 'Misc activity', 3, 0], ['1:2013504:6', 'ET POLICY GNU/Linux APT User-Agent Outbound', 'Not Suspicious Traffic', 3, 80]] as const;
  for (let i = 0; i < 34; i++) {
    const s = pick(r, sigs2 as unknown as (typeof sigs2[number])[]);
    let src = ext(r); while (src === p1) src = ext(r);
    const sec = 23 * 3600 + int(r, 0, 3000);
    alertRows.push([sec, `10/06-${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}.${int(r, 100, 999)}  [**] [${s[0]}] ${s[1]} [**] [Classification: ${s[2]}] [Priority: ${s[3]}] {${s[4] ? 'TCP' : 'ICMP'}} ${src}${s[4] ? ':' + int(r, 30000, 65000) : ''} -> ${ip}${s[4] ? ':' + s[4] : ''}`]);
  }
  for (let i = 0; i < int(r, 3, 6); i++) {
    const sec = 23 * 3600 + int(r, 0, 3000);
    alertRows.push([sec, `10/06-${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}.${int(r, 100, 999)}  [**] [1:1000004:1] Possible SQL injection [**] [Classification: Web Application Attack] [Priority: 1] {TCP} ${p1}:${int(r, 30000, 65000)} -> ${ip}:80`]);
  }
  alertRows.sort((a, b) => a[0] - b[0]);

  // Level 10: web access log. One address hammers the login page.
  const attacker = ext(r);
  const accessRows: [number, string][] = [];
  const pages = ['/', '/courses', '/calendar', '/library', '/css/site.css', '/img/logo.png', '/news'];
  const agents = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', 'Mozilla/5.0 (X11; Linux x86_64)'];
  const ts = (sec: number) => `[06/Oct/2026:${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)} -0500]`;
  for (let i = 0; i < 120; i++) {
    let src = ext(r); while (src === attacker) src = ext(r);
    const sec = 23 * 3600 + int(r, 0, 3500);
    accessRows.push([sec, `${src} - - ${ts(sec)} "GET ${pick(r, pages)} HTTP/1.1" 200 ${int(r, 300, 48000)} "-" "${pick(r, agents)}"`]);
  }
  for (let i = 0; i < 8; i++) {
    let src = ext(r); while (src === attacker) src = ext(r);
    const sec = 23 * 3600 + int(r, 0, 3500);
    accessRows.push([sec, `${src} - - ${ts(sec)} "POST /login HTTP/1.1" ${r() < .7 ? 302 : 401} 512 "-" "${pick(r, agents)}"`]);
  }
  let a = 23 * 3600 + int(r, 600, 1800);
  for (let i = 0; i < int(r, 26, 40); i++) {
    a += int(r, 1, 3);
    const inj = r() < .25;
    accessRows.push([a, `${attacker} - - ${ts(a)} "POST /login${inj ? "?user=admin'%20OR%201=1--" : ''} HTTP/1.1" 401 512 "-" "python-requests/2.31"`]);
  }
  accessRows.sort((x, y) => x[0] - y[0]);

  const data: TerminalData = {
    host, ip, mac: mac(r), gateway: '10.0.1.1',
    readme: `Welcome to the Byteville Control Room, defender.\n\nThis is web01, the server behind the school website.\nYour first shift token is:\n\n    ${t1}\n\nType:  submit ${t1}\n`,
    hidden: `Good eye. Files that start with a dot are hidden from a plain ls.\nShift token: ${t2}\n`,
    authLog: authRows.map(x => x[1]), ufwLog: ufwRows.map(x => x[1]), alerts: alertRows.map(x => x[1]), access: accessRows.map(x => x[1]), listening,
  };
  const failLines = data.authLog.filter(l => l.includes('Failed password')).length;
  return { data, answers: { op1: t1, op2: t2, op3: String(failLines), op4: loud, op5: ip, op6: String(rogue), op9: p1, op10: attacker } };
}
