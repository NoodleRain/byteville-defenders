// A small, safe Linux-like shell that runs entirely in the browser on a fake filesystem.
// Nothing here touches a real network or computer.

import { TerminalData } from './generate';
import { UfwRule, UfwState, ruleText } from './ufw';
import { validAddr } from '../nightwatch/engine';

/* ---------------- filesystem ---------------- */
interface FileNode { type: 'file'; content: string; mode: number; owner: string; size?: number }
interface DirNode { type: 'dir'; children: Record<string, Node>; mode: number; owner: string }
type Node = FileNode | DirNode;

const f = (content: string, mode = 0o644, owner = 'root'): FileNode => ({ type: 'file', content, mode, owner });
const d = (children: Record<string, Node>, mode = 0o755, owner = 'root'): DirNode => ({ type: 'dir', children, mode, owner });

export function buildFs(t: TerminalData): DirNode {
  const passwords = 'Backup of old Wi-Fi and printer passwords (2024)\nlibrary-printer: Pr1nt3r-2024!\nstaff-wifi: Byt3v1ll3-Staff\n';
  return d({
    home: d({
      defender: d({
        'README': f(t.readme, 0o644, 'defender'),
        '.shift_note': f(t.hidden, 0o644, 'defender'),
        '.bashrc': f('# ~/.bashrc\nalias ll=\'ls -l\'\n', 0o644, 'defender'),
        'notes.txt': f('Nothing important here.\nThe day shift says the real note is hidden.\n', 0o644, 'defender'),
        backup: d({ 'passwords.txt': f(passwords, 0o666, 'defender'), 'site-config.tar.gz': f('(binary file)', 0o644, 'defender') }, 0o755, 'defender'),
      }, 0o750, 'defender'),
    }),
    etc: d({
      hostname: f(t.host + '\n'),
      hosts: f(`127.0.0.1\tlocalhost\n${t.ip}\t${t.host}.byteville.lan ${t.host}\n10.0.1.53\tdns01.byteville.lan dns01\n10.0.1.1\tgateway.byteville.lan gateway\n`),
      'os-release': f('NAME="Ubuntu"\nVERSION="24.04 LTS (Noble Numbat)"\nID=ubuntu\n'),
      shadow: f('(protected)', 0o640),
      byteville: d({ 'allowed-services.txt': f('# Services allowed to listen on web01\n#\n# PORT  PROTO  WHAT\n22      tcp    SSH (admins only)\n80      tcp    Website (HTTP)\n443     tcp    Website (HTTPS)\n3306    tcp    Database, localhost (127.0.0.1) only\n53      udp    Local DNS resolver, 127.0.0.53 only\n#\n# Anything else listening is NOT approved.\n') }),
    }),
    var: d({
      log: d({
        'auth.log': f(t.authLog.join('\n') + '\n', 0o640, 'syslog'),
        'ufw.log': f(t.ufwLog.join('\n') + '\n', 0o640, 'syslog'),
        ids: d({ 'alerts.log': f(t.alerts.join('\n') + '\n', 0o644) }),
        nginx: d({ 'access.log': f(t.access.join('\n') + '\n', 0o644, 'www-data'), 'error.log': f('', 0o644, 'www-data') }),
      }),
      www: d({ html: d({ 'index.html': f('<!doctype html><title>Byteville School</title><h1>Welcome to Byteville School</h1>\n', 0o644, 'www-data') }) }),
    }),
    tmp: d({}, 0o777),
  });
}

/* ---------------- shell ---------------- */
export interface ShellCtx {
  data: TerminalData;
  ufw: UfwState;
  onSubmit: (arg: string) => string | Promise<string>;
  onHint: () => string;
  onMission: () => string;
  onReset: () => void;
  onClear: () => void;
}

export interface Shell {
  run(line: string): Promise<string>;
  prompt(): string;
  complete(line: string): string;
  history: string[];
  fileMode(path: string): number | null;
}

const PROC: Record<number, string> = { 21: 'vsftpd', 22: 'sshd', 23: 'in.telnetd', 53: 'systemd-resolve', 80: 'nginx', 443: 'nginx', 3306: 'mysqld', 3389: 'xrdp', 5900: 'x11vnc', 6667: 'ngircd', 8081: 'python3' };
const SERVICES: Record<string, number> = { ssh: 22, http: 80, https: 443, ftp: 21, telnet: 23, dns: 53, mysql: 3306 };

const HELP = `Commands you can use here:
  pwd  ls [-a -l]  cd DIR  cat FILE  head/tail [-n N]  find DIR -name PAT
  grep [-i -v -c -o -n] PATTERN [FILE]  wc -l  sort [-n -r -u]  uniq [-c]
  cut -d C -f N   awk '{print $1}'   echo  history  clear
  whoami  id  hostname [-I]  uname -a  date
  ifconfig  ip a  ping [-c N] HOST  ss -tuln  netstat -tuln
  sudo CMD   ufw ...   chmod MODE FILE
  mission  hint  submit ANSWER  reset
Use | to send one command's output into the next, e.g.  grep Failed auth.log | wc -l
Tip: press Tab to finish a file name, and the Up arrow for your last command.`;

const MAN: Record<string, string> = {
  ls: 'ls - list directory contents\n  -a  also show hidden files (names starting with .)\n  -l  long format: permissions, owner, size, date',
  cd: 'cd - change directory.  cd /var/log   cd ..   cd ~',
  cat: 'cat - print files.  cat README',
  grep: "grep - print lines that match a pattern\n  -i ignore case   -v lines that do NOT match   -c count matching lines\n  -o print only the matching part   -n show line numbers\n  Example: grep 'Failed password' /var/log/auth.log",
  wc: 'wc - count.  wc -l counts lines.  Example: cat file | wc -l',
  sort: 'sort - sort lines.  -n numbers   -r reverse   -u unique',
  uniq: 'uniq - remove repeated neighbor lines.  -c puts a count in front.  Use after sort.',
  cut: "cut - pick fields.  cut -d ' ' -f 1  (field 1, split on spaces)",
  awk: "awk - pick columns split on spaces.  awk '{print $1}'   awk '{print $1, $9}'   awk -F: '{print $1}'",
  head: 'head - first lines.  head -n 5 FILE',
  tail: 'tail - last lines.  tail -n 5 FILE',
  find: "find - search for files.  find / -name '*.log'",
  ifconfig: 'ifconfig - show network interfaces and their IP addresses',
  ip: 'ip a - show addresses for each network interface',
  ss: 'ss -tuln - show listening ports.  t=TCP u=UDP l=listening n=numbers.  Add p for process names.',
  ping: 'ping HOST - check if a host answers.  ping -c 3 10.0.1.1',
  ufw: `ufw - Uncomplicated Firewall (needs sudo)
  sudo ufw status [verbose|numbered]
  sudo ufw enable | disable
  sudo ufw default deny incoming
  sudo ufw allow 443/tcp          sudo ufw deny 23
  sudo ufw allow from 10.0.5.0/24 to any port 22 proto tcp
  sudo ufw deny from 203.0.113.9
  sudo ufw insert 1 deny from 203.0.113.9
  sudo ufw delete 2               sudo ufw reset
  Rules are checked top to bottom. First match wins.`,
  chmod: 'chmod - change permissions.  chmod 600 FILE  (owner read+write, nobody else)\n  Digits: owner, group, others.  4=read 2=write 1=execute.  Also: chmod go-rw FILE',
  sudo: 'sudo - run one command as the administrator (root).  sudo ufw status',
  submit: 'submit ANSWER - send your answer to the class server.  For setup levels, just type submit.',
};

function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = '', q: string | null = null, has = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; else if (c === '\\' && q === '"' && i + 1 < line.length) cur += line[++i]; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; has = true; continue; }
    if (c === '\\' && i + 1 < line.length) { cur += line[++i]; has = true; continue; }
    if (/\s/.test(c)) { if (cur || has) { out.push(cur); cur = ''; has = false; } continue; }
    cur += c; has = true;
  }
  if (q) throw new Error('unexpected end of line: missing closing quote');
  if (cur || has) out.push(cur);
  return out;
}
function splitPipes(line: string): string[] {
  const parts: string[] = [];
  let cur = '', q: string | null = null;
  for (const c of line) {
    if (q) { if (c === q) q = null; cur += c; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '|') { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts.map(p => p.trim());
}
const lines = (s: string) => { const a = s.split('\n'); if (a.length && a[a.length - 1] === '') a.pop(); return a; };
const glob = (p: string) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
function permStr(n: Node): string {
  const m = n.mode, b = (x: number) => (x & 4 ? 'r' : '-') + (x & 2 ? 'w' : '-') + (x & 1 ? 'x' : '-');
  return (n.type === 'dir' ? 'd' : '-') + b(m >> 6) + b((m >> 3) & 7) + b(m & 7);
}

export function createShell(ctx: ShellCtx): Shell {
  const root = buildFs(ctx.data);
  const HOME = '/home/defender';
  let cwd = HOME;
  const history: string[] = [];
  const { data } = ctx;

  const norm = (p: string): string => {
    if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
    const abs = p.startsWith('/') ? p : cwd + '/' + p;
    const st: string[] = [];
    for (const seg of abs.split('/')) { if (!seg || seg === '.') continue; if (seg === '..') st.pop(); else st.push(seg); }
    return '/' + st.join('/');
  };
  const get = (p: string): Node | null => {
    let n: Node = root;
    for (const seg of norm(p).split('/').filter(Boolean)) { if (n.type !== 'dir' || !n.children[seg]) return null; n = n.children[seg]; }
    return n;
  };
  const show = (p: string) => (p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p);
  const canRead = (n: Node, root_: boolean) => root_ || n.owner === 'defender' || (n.mode & 4) !== 0 || ((n.mode >> 3) & 4 && n.owner === 'syslog');
  // defender is in the "adm" group, which can read logs owned by syslog (like a real admin account).

  function readFile(p: string, sudo: boolean): string {
    const n = get(p);
    if (!n) throw new Error(`${p}: No such file or directory`);
    if (n.type === 'dir') throw new Error(`${p}: Is a directory`);
    if (p.includes('shadow') && !sudo) throw new Error(`${p}: Permission denied`);
    if (!canRead(n, sudo)) throw new Error(`${p}: Permission denied`);
    if (p.includes('shadow')) return 'root:*:19950:0:99999:7:::\ndefender:$y$j9T$(hidden for training)::19950:0:99999:7:::\n';
    return n.content;
  }

  const ufwLines = (numbered: boolean, verbose: boolean): string => {
    const s = ctx.ufw;
    if (!s.enabled) return 'Status: inactive';
    let out = 'Status: active\n';
    if (verbose) out += `Logging: on (low)\nDefault: ${s.defIn} (incoming), allow (outgoing), disabled (routed)\nNew profiles: skip\n`;
    out += '\n     To                         Action      From\n     --                         ------      ----\n';
    out += s.rules.map((r, i) => (numbered ? `[${String(i + 1).padStart(2)}] ` : '     ') + ruleText(r)).join('\n');
    return out.replace(/\n$/, '');
  };

  function parseUfwRule(args: string[]): UfwRule | string {
    let action = args[0];
    if (action === 'reject') action = 'deny';
    if (action !== 'allow' && action !== 'deny') return `ERROR: Invalid syntax. Start with allow or deny.`;
    const rest = args.slice(1);
    if (!rest.length) return 'ERROR: Invalid syntax';
    const rule: UfwRule = { action, from: 'any', port: 'any', proto: 'any' };
    if (rest[0] !== 'from' && rest[0] !== 'proto' && rest[0] !== 'to' && rest[0] !== 'in') {
      if (rest.length > 1) return 'ERROR: Invalid syntax';
      const [p, proto] = rest[0].split('/');
      const port = SERVICES[p] !== undefined ? SERVICES[p] : /^\d+$/.test(p) ? Number(p) : NaN;
      if (!(port >= 0 && port <= 65535)) return `ERROR: Bad port '${p}'`;
      if (proto && proto !== 'tcp' && proto !== 'udp') return `ERROR: Unsupported protocol '${proto}'`;
      rule.port = port; rule.proto = (proto as UfwRule['proto']) || 'any';
      return rule;
    }
    for (let i = 0; i < rest.length; i++) {
      const k = rest[i], v = rest[i + 1];
      if (k === 'in') continue;
      if (v === undefined) return 'ERROR: Invalid syntax';
      if (k === 'from') { if (!validAddr(v)) return `ERROR: Bad source address '${v}'`; rule.from = v; i++; }
      else if (k === 'to') { if (v !== 'any' && v !== data.ip) return `ERROR: Bad destination address '${v}'. Use: to any`; i++; }
      else if (k === 'port') { const n = SERVICES[v] ?? (/^\d+$/.test(v) ? Number(v) : NaN); if (!(n >= 0 && n <= 65535)) return `ERROR: Bad port '${v}'`; rule.port = n; i++; }
      else if (k === 'proto') { if (v !== 'tcp' && v !== 'udp') return `ERROR: Unsupported protocol '${v}'`; rule.proto = v; i++; }
      else return `ERROR: Invalid syntax near '${k}'`;
    }
    return rule;
  }
  const same = (a: UfwRule, b: UfwRule) => a.action === b.action && a.from === b.from && a.port === b.port && a.proto === b.proto;

  function ufw(args: string[], sudo: boolean): string {
    if (!sudo) return 'ERROR: You need to be root to run this script. Try: sudo ufw ' + args.join(' ');
    const s = ctx.ufw;
    const [cmd, ...rest] = args;
    switch (cmd) {
      case undefined: return MAN.ufw;
      case 'status': return ufwLines(rest.includes('numbered'), rest.includes('verbose'));
      case 'enable': s.enabled = true; return 'Firewall is active and enabled on system startup';
      case 'disable': s.enabled = false; return 'Firewall stopped and disabled on system startup';
      case 'reload': return s.enabled ? 'Firewall reloaded' : 'Firewall not enabled (skipping reload)';
      case 'reset': s.enabled = false; s.defIn = 'deny'; s.rules = []; return 'Resetting all rules to installed defaults.\nFirewall stopped and disabled on system startup';
      case 'default': {
        const pol = rest[0] === 'reject' ? 'deny' : rest[0];
        if (pol !== 'allow' && pol !== 'deny') return "ERROR: Invalid syntax. Example: sudo ufw default deny incoming";
        const dir = rest[1] || 'incoming';
        if (dir === 'outgoing' || dir === 'routed') return `Default ${dir} policy changed to '${pol}'\n(be sure to update your rules accordingly)`;
        if (dir !== 'incoming') return 'ERROR: Invalid syntax';
        s.defIn = pol;
        return `Default incoming policy changed to '${pol}'\n(be sure to update your rules accordingly)`;
      }
      case 'allow': case 'deny': case 'reject': {
        const r = parseUfwRule(args);
        if (typeof r === 'string') return r;
        if (s.rules.some(x => same(x, r))) return 'Skipping adding existing rule';
        s.rules.push(r);
        return 'Rule added';
      }
      case 'insert': {
        const n = Number(rest[0]);
        if (!Number.isInteger(n) || n < 1 || n > s.rules.length + 1) return `ERROR: Invalid position '${rest[0]}'`;
        if (s.rules.length === 0) return 'ERROR: Cannot insert into empty chain. Use: sudo ufw ' + rest.slice(1).join(' ');
        const r = parseUfwRule(rest.slice(1));
        if (typeof r === 'string') return r;
        if (s.rules.some(x => same(x, r))) return 'Skipping inserting existing rule';
        s.rules.splice(n - 1, 0, r);
        return 'Rule inserted';
      }
      case 'delete': {
        if (/^\d+$/.test(rest[0] || '')) {
          const n = Number(rest[0]);
          if (n < 1 || n > s.rules.length) return 'ERROR: Could not find rule \'' + n + "'";
          const [gone] = s.rules.splice(n - 1, 1);
          return `Deleting:\n ${ruleText(gone).replace(/\s+/g, ' ')}\nRule deleted`;
        }
        const r = parseUfwRule(rest);
        if (typeof r === 'string') return r;
        const i = s.rules.findIndex(x => same(x, r));
        if (i < 0) return 'Could not delete non-existent rule';
        s.rules.splice(i, 1);
        return 'Rule deleted';
      }
      default: return `ERROR: Invalid syntax. Try: man ufw`;
    }
  }

  function chmod(args: string[], sudo: boolean): string {
    const [mode, target] = args;
    if (!mode || !target) return 'chmod: missing operand. Example: chmod 600 FILE';
    const n = get(target);
    if (!n) return `chmod: cannot access '${target}': No such file or directory`;
    if (n.owner !== 'defender' && !sudo) return `chmod: changing permissions of '${target}': Operation not permitted`;
    if (/^[0-7]{3,4}$/.test(mode)) { n.mode = parseInt(mode.slice(-3), 8); return ''; }
    for (const part of mode.split(',')) {
      const m = part.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
      if (!m) return `chmod: invalid mode: '${mode}'`;
      const who = m[1] || 'a';
      const bits = (m[3].includes('r') ? 4 : 0) | (m[3].includes('w') ? 2 : 0) | (m[3].includes('x') ? 1 : 0);
      const shifts = [...new Set((who.includes('a') ? 'ugo' : who).split(''))].map(c => (c === 'u' ? 6 : c === 'g' ? 3 : 0));
      for (const sh of shifts) {
        if (m[2] === '+') n.mode |= bits << sh;
        else if (m[2] === '-') n.mode &= ~(bits << sh);
        else n.mode = (n.mode & ~(7 << sh)) | (bits << sh);
      }
    }
    return '';
  }

  function ls(args: string[]): string {
    const flags = args.filter(a => a.startsWith('-')).join('');
    const all = flags.includes('a'), long = flags.includes('l');
    const paths = args.filter(a => !a.startsWith('-'));
    const targets = paths.length ? paths : ['.'];
    const out: string[] = [];
    for (const p of targets) {
      const n = get(p);
      if (!n) { out.push(`ls: cannot access '${p}': No such file or directory`); continue; }
      if (n.type === 'dir' && !(n.mode & 4) && n.owner !== 'defender') { out.push(`ls: cannot open directory '${p}': Permission denied`); continue; }
      const entries: [string, Node][] = n.type === 'dir' ? Object.entries(n.children).sort((a, b) => a[0].replace(/^\./, '').localeCompare(b[0].replace(/^\./, ''))) : [[p, n]];
      const shown = entries.filter(([name]) => all || !name.startsWith('.'));
      if (n.type === 'dir' && all) shown.unshift(['.', n], ['..', n]);
      if (targets.length > 1) out.push(p + ':');
      if (long) {
        if (n.type === 'dir') out.push(`total ${shown.length * 4}`);
        for (const [name, c] of shown) {
          const size = c.type === 'dir' ? 4096 : c.content.length;
          out.push(`${permStr(c)} 1 ${c.owner.padEnd(8)} ${(c.owner === 'syslog' ? 'adm' : c.owner).padEnd(8)} ${String(size).padStart(6)} Oct  6 21:04 ${name}${c.type === 'dir' && !['.', '..'].includes(name) ? '/' : ''}`);
        }
      } else out.push(shown.map(([name, c]) => name + (c.type === 'dir' && !['.', '..'].includes(name) ? '/' : '')).join('  '));
    }
    return out.join('\n');
  }

  function find(args: string[]): string {
    let start = '.', name: RegExp | null = null, type: string | null = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-name') name = glob(args[++i] || '*');
      else if (args[i] === '-type') type = args[++i];
      else start = args[i];
    }
    const base = get(start);
    if (!base) return `find: '${start}': No such file or directory`;
    const out: string[] = [];
    const walk = (n: Node, p: string, nm: string) => {
      if ((!name || name.test(nm)) && (!type || (type === 'd') === (n.type === 'dir'))) out.push(p);
      if (n.type === 'dir') for (const [k, c] of Object.entries(n.children)) walk(c, (p === '/' ? '' : p) + '/' + k, k);
    };
    walk(base, start, start.split('/').pop() || start);
    return out.join('\n');
  }

  function grep(args: string[], input: string | null, sudo: boolean): string {
    const opts = new Set<string>();
    const rest: string[] = [];
    for (const a of args) { if (/^-[a-zA-Z]+$/.test(a) && !rest.length) a.slice(1).split('').forEach(c => opts.add(c)); else rest.push(a); }
    const pat = rest.shift();
    if (pat === undefined) return 'Usage: grep [-i -v -c -o -n] PATTERN [FILE]';
    let re: RegExp;
    try { re = new RegExp(pat, opts.has('i') ? 'gi' : 'g'); } catch (_) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), opts.has('i') ? 'gi' : 'g'); }
    const sources: [string, string][] = rest.length ? rest.map(p => [p, readFile(p, sudo)]) : [['', input ?? '']];
    const out: string[] = [];
    for (const [name, text] of sources) {
      let count = 0;
      lines(text).forEach((l, i) => {
        re.lastIndex = 0;
        const hit = re.test(l);
        if (hit === opts.has('v')) return;
        count++;
        if (opts.has('c')) return;
        const pre = (rest.length > 1 ? name + ':' : '') + (opts.has('n') ? `${i + 1}:` : '');
        if (opts.has('o') && !opts.has('v')) { re.lastIndex = 0; (l.match(re) || []).forEach(m => out.push(pre + m)); }
        else out.push(pre + l);
      });
      if (opts.has('c')) out.push((rest.length > 1 ? name + ':' : '') + count);
    }
    return out.join('\n');
  }

  function textOf(args: string[], input: string | null, sudo: boolean): string {
    const files = args.filter(a => !a.startsWith('-'));
    return files.length ? files.map(p => readFile(p, sudo)).join('') : (input ?? '');
  }

  function headTail(args: string[], input: string | null, sudo: boolean, tail: boolean): string {
    let n = 10;
    const rest: string[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-n') n = Number(args[++i]);
      else if (/^-\d+$/.test(args[i])) n = Number(args[i].slice(1));
      else rest.push(args[i]);
    }
    if (!Number.isFinite(n) || n < 0) return `${tail ? 'tail' : 'head'}: invalid number of lines`;
    const ls_ = lines(textOf(rest, input, sudo));
    return (tail ? ls_.slice(Math.max(0, ls_.length - n)) : ls_.slice(0, n)).join('\n');
  }

  function ping(args: string[]): string {
    let count = 4;
    const rest: string[] = [];
    for (let i = 0; i < args.length; i++) { if (args[i] === '-c') count = Math.min(10, Math.max(1, Number(args[++i]) || 4)); else rest.push(args[i]); }
    const host = rest[0];
    if (!host) return 'ping: usage error: Destination address required';
    const names: Record<string, string> = { localhost: '127.0.0.1', [data.host]: data.ip, gateway: '10.0.1.1', dns01: '10.0.1.53', 'gateway.byteville.lan': '10.0.1.1', 'dns01.byteville.lan': '10.0.1.53' };
    const ip = names[host] || host;
    const up: Record<string, number> = { '127.0.0.1': 0.04, [data.ip]: 0.05, '10.0.1.1': 0.6, '10.0.1.53': 0.9, '10.0.5.20': 1.4 };
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return `ping: ${host}: Temporary failure in name resolution`;
    const head = `PING ${host} (${ip}) 56(84) bytes of data.`;
    if (up[ip] === undefined) {
      if (!ip.startsWith('10.')) return `${head}\nping: connect: Network is unreachable\n(This training server has no Internet connection.)`;
      return `${head}\n\n--- ${host} ping statistics ---\n${count} packets transmitted, 0 received, 100% packet loss, time ${count * 1000 - 1}ms`;
    }
    const base = up[ip];
    const rows = Array.from({ length: count }, (_, i) => `64 bytes from ${ip}: icmp_seq=${i + 1} ttl=64 time=${(base + ((i * 37) % 10) / 40).toFixed(3)} ms`);
    return `${head}\n${rows.join('\n')}\n\n--- ${host} ping statistics ---\n${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 1000 - 1}ms`;
  }

  function ifconfig(): string {
    const v6 = 'fe80::' + data.mac.split(':').slice(3).join('').replace(/^0+/, '') + ':' + data.mac.split(':')[1] + 'ff:fe' + data.mac.split(':')[2];
    return `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${data.ip}  netmask 255.255.255.0  broadcast 10.0.1.255
        inet6 ${v6}  prefixlen 64  scopeid 0x20<link>
        ether ${data.mac}  txqueuelen 1000  (Ethernet)
        RX packets 184522  bytes 211043312 (211.0 MB)
        TX packets 120391  bytes 98410211 (98.4 MB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)`;
  }
  function ipAddr(): string {
    return `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether ${data.mac} brd ff:ff:ff:ff:ff:ff
    inet ${data.ip}/24 brd 10.0.1.255 scope global eth0
       valid_lft forever preferred_lft forever`;
  }
  function ss(args: string[]): string {
    const fl = args.join('');
    const showP = fl.includes('p');
    const head = 'Netid State  Recv-Q Send-Q  Local Address:Port   Peer Address:Port' + (showP ? ' Process' : '');
    const rows = data.listening
      .filter(s => (fl.includes('t') && s.proto === 'tcp') || (fl.includes('u') && s.proto === 'udp') || (!fl.includes('t') && !fl.includes('u')))
      .map(s => `${s.proto.padEnd(5)} ${(s.proto === 'udp' ? 'UNCONN' : 'LISTEN').padEnd(6)} 0      ${s.proto === 'udp' ? '0     ' : '4096  '}  ${(s.local + ':' + s.port).padStart(18)}   ${'0.0.0.0:*'.padStart(15)}` +
        (showP ? `   users:(("${PROC[s.port] || 'unknown'}",pid=${700 + s.port % 300},fd=${3 + s.port % 7}))` : ''));
    if (!fl.includes('l')) return head + '\n(no established connections right now)';
    return [head, ...rows].join('\n');
  }

  async function exec(argv: string[], input: string | null, sudo = false): Promise<string> {
    const [cmd, ...args] = argv;
    switch (cmd) {
      case undefined: case '': return '';
      case 'help': return HELP;
      case 'man': return args[0] ? (MAN[args[0]] || `No manual entry for ${args[0]}`) : 'What manual page do you want? Example: man grep';
      case 'pwd': return cwd;
      case 'whoami': return sudo ? 'root' : 'defender';
      case 'id': return sudo ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1000(defender) gid=1000(defender) groups=1000(defender),4(adm),27(sudo)';
      case 'hostname': return args.includes('-I') ? data.ip : data.host;
      case 'uname': return args.includes('-a') ? `Linux ${data.host} 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux` : 'Linux';
      case 'date': return 'Tue Oct  6 23:58:12 CDT 2026';
      case 'echo': return args.join(' ');
      case 'clear': ctx.onClear(); return '';
      case 'history': return history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n');
      case 'ls': return ls(args);
      case 'll': return ls(['-l', ...args]);
      case 'cd': {
        const target = args[0] || '~';
        const n = get(target);
        if (!n) return `cd: ${target}: No such file or directory`;
        if (n.type !== 'dir') return `cd: ${target}: Not a directory`;
        cwd = norm(target);
        return '';
      }
      case 'cat': return args.length ? args.map(p => readFile(p, sudo)).join('').replace(/\n$/, '') : (input ?? '').replace(/\n$/, '');
      case 'head': return headTail(args, input, sudo, false);
      case 'tail': return headTail(args, input, sudo, true);
      case 'grep': return grep(args, input, sudo);
      case 'wc': {
        const t = textOf(args, input, sudo);
        const files = args.filter(a => !a.startsWith('-'));
        const l = lines(t).length, w = t.split(/\s+/).filter(Boolean).length, c = t.length;
        const fl = args.filter(a => a.startsWith('-')).join('');
        const parts = fl.includes('l') || fl.includes('w') || fl.includes('c') ? [fl.includes('l') ? l : null, fl.includes('w') ? w : null, fl.includes('c') ? c : null].filter(x => x !== null) : [l, w, c];
        return parts.join(' ') + (files.length ? ' ' + files.join(' ') : '');
      }
      case 'sort': {
        const fl = args.filter(a => a.startsWith('-')).join('');
        let ls_ = lines(textOf(args, input, sudo));
        if (fl.includes('n')) ls_.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b));
        else ls_.sort();
        if (fl.includes('r')) ls_.reverse();
        if (fl.includes('u')) ls_ = ls_.filter((x, i) => i === 0 || x !== ls_[i - 1]);
        return ls_.join('\n');
      }
      case 'uniq': {
        const c = args.includes('-c');
        const ls_ = lines(textOf(args, input, sudo));
        const out: string[] = [];
        for (let i = 0; i < ls_.length;) { let j = i; while (j < ls_.length && ls_[j] === ls_[i]) j++; out.push(c ? `${String(j - i).padStart(7)} ${ls_[i]}` : ls_[i]); i = j; }
        return out.join('\n');
      }
      case 'cut': {
        let delim = '\t', fields: number[] = [];
        const files: string[] = [];
        for (let i = 0; i < args.length; i++) {
          const a = args[i];
          if (a === '-d') delim = args[++i] ?? '\t'; else if (a.startsWith('-d')) delim = a.slice(2);
          else if (a === '-f') fields = (args[++i] || '').split(',').map(Number); else if (a.startsWith('-f')) fields = a.slice(2).split(',').map(Number);
          else files.push(a);
        }
        if (!fields.length || fields.some(n => !(n >= 1))) return 'cut: you must specify a list of fields, like -f 1';
        return lines(textOf(files, input, sudo)).map(l => { const p = l.split(delim); return fields.map(n => p[n - 1] ?? '').join(delim); }).join('\n');
      }
      case 'awk': {
        let sep: RegExp | string = /\s+/;
        const rest: string[] = [];
        for (let i = 0; i < args.length; i++) { if (args[i] === '-F') sep = args[++i]; else if (args[i].startsWith('-F')) sep = args[i].slice(2); else rest.push(args[i]); }
        const prog = rest.shift() || '';
        const m = prog.match(/^\{\s*print\s+(.*?)\s*;?\s*\}$/);
        if (!m) return "awk: this trainer understands  awk '{print $1}'  and  awk '{print $1, $3}'";
        const cols = m[1].split(',').map(x => x.trim());
        return lines(textOf(rest, input, sudo)).map(l => {
          const p = typeof sep === 'string' ? l.split(sep) : l.trim().split(sep);
          return cols.map(c => c === '$0' ? l : c === '$NF' ? p[p.length - 1] : /^\$\d+$/.test(c) ? (p[Number(c.slice(1)) - 1] ?? '') : c.replace(/^"|"$/g, '')).join(' ');
        }).join('\n');
      }
      case 'find': return find(args);
      case 'ifconfig': return ifconfig();
      case 'ip': return ['a', 'addr', 'address'].includes(args[0]) ? ipAddr() : args[0] === 'route' || args[0] === 'r' ? `default via 10.0.1.1 dev eth0 proto static\n10.0.1.0/24 dev eth0 proto kernel scope link src ${data.ip}` : 'Usage: ip a   or   ip route';
      case 'ping': return ping(args);
      case 'ss': case 'netstat': return ss(args);
      case 'ufw': return ufw(args, sudo);
      case 'chmod': return chmod(args, sudo);
      case 'sudo': return args.length ? exec(args, input, true) : 'usage: sudo COMMAND';
      case 'mission': return ctx.onMission();
      case 'hint': return ctx.onHint();
      case 'submit': return await ctx.onSubmit(args.join(' '));
      case 'reset': ctx.onReset(); return '';
      case 'exit': case 'logout': return 'You are on shift. Use the Back button to leave this level.';
      case 'nano': case 'vi': case 'vim': return `${cmd}: editors are turned off on this training server. Use cat to read files.`;
      case 'rm': return 'rm: this training server keeps all evidence. Nothing was deleted.';
      case 'ssh': case 'nmap': case 'nc': case 'curl': case 'wget': return `${cmd}: not available on this training server.`;
      default: return `${cmd}: command not found. Type help to see what you can use.`;
    }
  }

  return {
    history,
    fileMode: (p: string) => { const n = get(p); return n ? n.mode : null; },
    prompt: () => `defender@${data.host}:${show(cwd)}$ `,
    async run(line: string): Promise<string> {
      const trimmed = line.trim();
      if (!trimmed) return '';
      history.push(trimmed);
      if (history.length > 200) history.shift();
      try {
        let input: string | null = null;
        for (const part of splitPipes(trimmed)) {
          if (!part) throw new Error('syntax error near unexpected token `|\'');
          input = await exec(tokenize(part), input);
          input = input == null ? '' : String(input);
        }
        return input || '';
      } catch (e) {
        return String((e as Error).message || e).replace(/^/, (trimmed.split(/\s/)[0] || 'bash') + ': ');
      }
    },
    complete(line: string): string {
      const m = line.match(/^(.*?)(\S*)$/);
      if (!m) return line;
      const [, before, word] = m;
      if (!before.trim()) {
        const cmds = ['pwd', 'ls', 'cd', 'cat', 'head', 'tail', 'grep', 'wc', 'sort', 'uniq', 'cut', 'awk', 'find', 'ifconfig', 'ip', 'ping', 'ss', 'netstat', 'sudo', 'ufw', 'chmod', 'submit', 'hint', 'mission', 'history', 'help', 'man', 'whoami', 'hostname', 'clear', 'reset'];
        const hits = cmds.filter(c => c.startsWith(word));
        return hits.length === 1 ? hits[0] + ' ' : line;
      }
      const slash = word.lastIndexOf('/');
      const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
      const stem = slash >= 0 ? word.slice(slash + 1) : word;
      const dir = get(dirPart || '.');
      if (!dir || dir.type !== 'dir') return line;
      const hits = Object.keys(dir.children).filter(k => k.startsWith(stem) && (stem.startsWith('.') || !k.startsWith('.')));
      if (hits.length !== 1) {
        if (hits.length > 1) { let p = hits[0]; for (const h of hits) while (!h.startsWith(p)) p = p.slice(0, -1); return before + dirPart + p; }
        return line;
      }
      const n = dir.children[hits[0]];
      return before + dirPart + hits[0] + (n.type === 'dir' ? '/' : ' ');
    },
  };
}

