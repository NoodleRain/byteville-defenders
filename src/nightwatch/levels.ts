// Night Watch levels. Defender-side only: write firewall rules, read logs, write and tune detection rules.
// All traffic is simulated. All addresses are private (10.x) or reserved for documentation.

import { FwPacket, IdsEvent } from './engine';
import { FW_HEADER, LOGS } from './logs.generated';

interface Base { id: string; num: number; title: string; skill: string; story: string; task: string; hints: [string, string] }
export interface RulesLevel extends Base { kind: 'rules'; starter: string; maxRules?: number; packets: FwPacket[] }
export interface DetectLevel extends Base { kind: 'detect'; starter: string; events: IdsEvent[] }
export interface LogLevel extends Base { kind: 'log'; question: string; placeholder: string; log: string[]; header: string }
export type NwLevel = RulesLevel | DetectLevel | LogLevel;

export const NETWORK: [string, string][] = [
  ['10.0.1.10', 'Web server (websites on 80 and 443)'],
  ['10.0.1.53', 'DNS server (name lookups, UDP 53)'],
  ['10.0.1.0/24', 'All servers. Same as $HOME_NET'],
  ['10.0.5.0/24', 'Admin laptops (IT staff)'],
  ['10.0.2.0/24', 'Student laptops'],
  ['10.0.0.0/8', 'Everything inside Byteville'],
  ['203.0.113.0/24', 'The "bad neighborhood" (known attackers)'],
];

const P = (label: string, proto: FwPacket['proto'], src: string, dst: string, port: number, want: FwPacket['want'], state: FwPacket['state'] = 'new'): FwPacket =>
  ({ label, proto, src, dst, port, want, state });
const E = (label: string, payload: string, want: IdsEvent['want'], dst = '10.0.1.10', port = 80, src = '198.51.100.40'): IdsEvent =>
  ({ label, proto: 'tcp', src, dst, port, payload, want });


/* ---------------- the levels ---------------- */
export const NW_LEVELS: NwLevel[] = [
  {
    id: 'nw1', num: 1, kind: 'rules', title: 'Lights Out', skill: 'Default deny',
    story: 'It is 10 PM. The night firewall has only one rule, and this firewall lets through anything that no rule matches.',
    task: 'Only secure web traffic (TCP 443) may reach the web server. Everything else must be blocked. Edit the rules, then press Run.',
    starter: '# Allow secure web traffic to the web server\nallow tcp any -> 10.0.1.10 443\n',
    hints: ['Run it first. Which packets got through that should not? The "rule" column says no rule matched them.', 'Add a last line that catches everything:  block any any -> any any'],
    packets: [
      P('Visitor opens the website', 'tcp', '198.51.100.7', '10.0.1.10', 443, 'allow'),
      P('Another visitor opens the website', 'tcp', '192.0.2.30', '10.0.1.10', 443, 'allow'),
      P('Stranger tries remote login', 'tcp', '198.51.100.7', '10.0.1.10', 22, 'block'),
      P('Stranger tries remote desktop', 'tcp', '192.0.2.99', '10.0.1.10', 3389, 'block'),
      P('Stranger pings the server', 'icmp', '198.51.100.9', '10.0.1.10', 0, 'block'),
      P('Stranger reaches for a database', 'tcp', '192.0.2.8', '10.0.1.20', 3306, 'block'),
    ],
  },
  {
    id: 'nw2', num: 2, kind: 'rules', title: 'Two Doors and a Phone Book', skill: 'Ports and protocols', maxRules: 4,
    story: 'The web server needs both of its doors (80 and 443). The DNS server answers name lookups on UDP port 53.',
    task: 'Allow TCP 80 and 443 to the web server and UDP 53 to the DNS server. Block everything else. Use 4 rules or fewer.',
    starter: '# Write your rules here. One rule per line.\n',
    hints: ['One rule can list two ports with a comma:  allow tcp any -> 10.0.1.10 80,443', 'DNS uses udp, not tcp. Then finish with  block any any -> any any'],
    packets: [
      P('Visitor opens the website (HTTP)', 'tcp', '198.51.100.7', '10.0.1.10', 80, 'allow'),
      P('Visitor opens the website (HTTPS)', 'tcp', '198.51.100.7', '10.0.1.10', 443, 'allow'),
      P('Laptop looks up a name', 'udp', '10.0.2.15', '10.0.1.53', 53, 'allow'),
      P('Name lookup sent to the web server by mistake', 'udp', '10.0.2.15', '10.0.1.10', 53, 'block'),
      P('TCP to the DNS server on port 53', 'tcp', '192.0.2.44', '10.0.1.53', 53, 'block'),
      P('Website request sent to the DNS server', 'tcp', '198.51.100.7', '10.0.1.53', 80, 'block'),
      P('Stranger tries remote login on the DNS server', 'tcp', '192.0.2.99', '10.0.1.53', 22, 'block'),
      P('HTTPS to a different server', 'tcp', '198.51.100.7', '10.0.1.11', 443, 'block'),
    ],
  },
  {
    id: 'nw3', num: 3, kind: 'log', title: 'Knock Knock', skill: 'Reading a firewall log',
    story: 'Around 10:17 PM someone tried a lot of doors on the web server in just a few seconds. That is a port scan.',
    task: 'Find the IP address that scanned the server. Tip: type DROP in the filter box.',
    question: 'Which IP address scanned the server?', placeholder: 'e.g. 192.0.2.1',
    header: FW_HEADER, log: LOGS.nw3,
    hints: ['Filter for DROP. A few addresses were dropped once. One was dropped many times.', 'Look for one IP hitting many different ports within the same few seconds.'],
  },
  {
    id: 'nw4', num: 4, kind: 'log', title: 'The Open Door', skill: 'Finding a mistake in the rules',
    story: 'Another scan, at 11:09 PM. This time one of the doors it tried was open, because someone forgot an old rule.',
    task: 'Find the port the scanner reached that is NOT a normal website port.',
    question: 'Which port did the scanner find open?', placeholder: 'a port number',
    header: FW_HEADER, log: LOGS.nw4,
    hints: ['First find the scanner\'s IP (filter for DROP). Then filter for that IP.', 'Among the scanner\'s lines, look for ALLOW. Ignore 443, which is the normal website.'],
  },
  {
    id: 'nw5', num: 5, kind: 'rules', title: 'Bad Neighborhood', skill: 'Rule order and exceptions',
    story: 'All of 203.0.113.0/24 is known trouble, so the whole block is banned. But one partner company, 203.0.113.50, needs to reach the website.',
    task: 'The rules are right, but in the wrong order. Fix the order so every test passes.',
    starter: 'block any 203.0.113.0/24 -> any any\nallow tcp any -> 10.0.1.10 443\nallow tcp 203.0.113.50 -> 10.0.1.10 443\nblock any any -> any any\n',
    hints: ['First match wins. Which rule catches the partner before the partner rule is ever read?', 'Move the partner rule to the very top. An exception always goes above the rule it is an exception to.'],
    packets: [
      P('Partner opens the website', 'tcp', '203.0.113.50', '10.0.1.10', 443, 'allow'),
      P('Partner tries remote login', 'tcp', '203.0.113.50', '10.0.1.10', 22, 'block'),
      P('Bad neighbor opens the website', 'tcp', '203.0.113.66', '10.0.1.10', 443, 'block'),
      P('Bad neighbor tries HTTP', 'tcp', '203.0.113.9', '10.0.1.10', 80, 'block'),
      P('Normal visitor opens the website', 'tcp', '198.51.100.7', '10.0.1.10', 443, 'allow'),
      P('Normal visitor tries remote login', 'tcp', '198.51.100.7', '10.0.1.10', 22, 'block'),
    ],
  },
  {
    id: 'nw6', num: 6, kind: 'rules', title: 'Admins Only', skill: 'Least privilege with address blocks', maxRules: 4,
    story: 'Remote login (SSH, port 22) is how IT fixes servers. Only the admin laptops in 10.0.5.0/24 should ever use it.',
    task: 'Anyone may open the website (443 on 10.0.1.10). Admin laptops may SSH to any server in 10.0.1.0/24. Block everything else. 4 rules or fewer.',
    starter: '# Write your rules here.\n',
    hints: ['Address blocks work as source or destination:  allow tcp 10.0.5.0/24 -> 10.0.1.0/24 22', 'Three rules are enough: the website rule, the admin SSH rule, and block any any -> any any'],
    packets: [
      P('Admin fixes the web server', 'tcp', '10.0.5.20', '10.0.1.10', 22, 'allow'),
      P('Admin fixes the DNS server', 'tcp', '10.0.5.31', '10.0.1.53', 22, 'allow'),
      P('Student tries SSH to the web server', 'tcp', '10.0.2.15', '10.0.1.10', 22, 'block'),
      P('Stranger tries SSH from the Internet', 'tcp', '192.0.2.99', '10.0.1.10', 22, 'block'),
      P('Admin tries remote desktop', 'tcp', '10.0.5.20', '10.0.1.10', 3389, 'block'),
      P('Admin SSH to a student laptop', 'tcp', '10.0.5.20', '10.0.2.15', 22, 'block'),
      P('Visitor opens the website', 'tcp', '198.51.100.7', '10.0.1.10', 443, 'allow'),
      P('Student opens the website', 'tcp', '10.0.2.15', '10.0.1.10', 443, 'allow'),
    ],
  },
  {
    id: 'nw7', num: 7, kind: 'log', title: 'Count the Guesses', skill: 'Spotting password guessing',
    story: 'This is the login log for the servers. Students mistype passwords sometimes. But one address kept guessing the admin password until it got in.',
    task: 'Count how many times the attacker failed before the successful login.',
    question: 'How many failed logins did the attacker make before getting in?', placeholder: 'a number',
    header: 'date       time     message', log: LOGS.nw7,
    hints: ['Filter for "Accepted password for admin". Which IP got in?', 'Now filter for that IP and count the "Failed" lines. The counter under the log helps.'],
  },
  {
    id: 'nw8', num: 8, kind: 'rules', title: 'Remember Me', skill: 'Stateful filtering', maxRules: 4,
    story: 'Student laptops (10.0.2.0/24) should browse the web. Replies to their requests must come back in. Nobody outside may start a new connection to a laptop.',
    task: 'Let laptops start web connections out (TCP 80, 443). Let replies come back in. Block everything else. Add the word established to the end of a rule to match only replies.',
    starter: '# Example of the new word:\n# allow tcp any -> 10.0.2.0/24 any established\n',
    hints: ['Replies come back to a random high port on the laptop, so the reply rule uses port any plus established.', 'Three rules: laptops out on 80,443; replies in with established; then block any any -> any any'],
    packets: [
      P('Laptop opens a website (HTTPS)', 'tcp', '10.0.2.15', '198.51.100.25', 443, 'allow'),
      P('Laptop opens a website (HTTP)', 'tcp', '10.0.2.40', '198.51.100.25', 80, 'allow'),
      P('The website replies to the laptop', 'tcp', '198.51.100.25', '10.0.2.15', 51544, 'allow', 'est'),
      P('Stranger tries file sharing on a laptop', 'tcp', '192.0.2.99', '10.0.2.15', 445, 'block'),
      P('Stranger tries remote desktop on a laptop', 'tcp', '192.0.2.99', '10.0.2.40', 3389, 'block'),
      P('Fake "reply" with no conversation in the table', 'tcp', '198.51.100.88', '10.0.2.15', 51544, 'block'),
      P('Laptop connects to a chat port used by botnets', 'tcp', '10.0.2.15', '192.0.2.50', 6667, 'block'),
      P('Stranger pings a laptop', 'icmp', '192.0.2.99', '10.0.2.15', 0, 'block'),
    ],
  },
  {
    id: 'nw9', num: 9, kind: 'detect', title: 'First Alert', skill: 'Writing a detection rule',
    story: 'The IDS watches web traffic to the servers. Someone wrote a rule for SQL injection, but attackers change upper and lower case to slip past it.',
    task: 'Make the rule alert on every SQL injection attempt and stay quiet on normal searches.',
    starter: 'alert tcp any any -> $HOME_NET 80 (msg:"SQL injection"; content:"OR 1=1"; sid:1000001;)\n',
    hints: ['Run it. Which attacks were missed? Look at the letters: OR, or, Or.', 'Add  nocase;  right after the content so upper and lower case both match.'],
    events: [
      E('Classic injection', "GET /search?q=' OR 1=1 --", 'alert'),
      E('Lower-case injection', "GET /login?user=admin' or 1=1--", 'alert'),
      E('Mixed-case injection', "POST /login user=admin' Or 1=1 #", 'alert'),
      E('Normal search', 'GET /search?q=library hours', 'quiet'),
      E('Normal search with "or"', 'GET /search?q=1 or 2 day field trip', 'quiet'),
      E('Normal page', 'GET /courses/cybr2000', 'quiet'),
    ],
  },
  {
    id: 'nw10', num: 10, kind: 'detect', title: 'Too Much Noise', skill: 'Tuning false positives',
    story: 'The IDS team is drowning in alerts. This rule fires on anything that says "script", including the drama club and the coding class.',
    task: 'Tune the rule: catch every script attack, and zero false alarms.',
    starter: 'alert tcp any any -> $HOME_NET 80 (msg:"Script attack"; content:"script"; nocase; sid:1000002;)\n',
    hints: ['What do all the real attacks have that the normal pages do not? Look right before the word.', 'Change the content to "<script" and keep nocase.'],
    events: [
      E('Attack in a comment', 'POST /comment text=<script>steal(cookie)</script>', 'alert'),
      E('Attack in capitals', 'GET /search?q=<SCRIPT SRC=//evil.example/x.js>', 'alert'),
      E('Attack in mixed case', 'POST /profile bio=<ScRiPt>alert(1)</ScRiPt>', 'alert'),
      E('Drama club script', 'GET /drama/script-for-the-play.pdf', 'quiet'),
      E('Coding class page', 'GET /cs/javascript-basics.html', 'quiet'),
      E('Movie search', 'GET /search?q=movie script ideas', 'quiet'),
      E('Python lesson', 'GET /cs/python-script-homework.py', 'quiet'),
    ],
  },
  {
    id: 'nw11', num: 11, kind: 'log', title: 'Low and Slow', skill: 'Finding a hidden pattern',
    story: 'Three hours of overnight traffic. A careful attacker is scanning one port every ten minutes so nobody notices. Busy normal visitors make far more noise.',
    task: 'Find the slow scanner. Counting lines will fool you. Count different ports instead.',
    question: 'Which IP address is scanning slowly?', placeholder: 'e.g. 192.0.2.1',
    header: FW_HEADER, log: LOGS.nw11,
    hints: ['Filter for DROP. Most dropped addresses appear once. One keeps coming back.', 'The scanner also visits port 443 now and then to look normal. Which IP has DROP lines on many different ports?'],
  },
  {
    id: 'nw12', num: 12, kind: 'rules', title: 'Night Shift', skill: 'The whole firewall', maxRules: 7,
    story: 'The night shift chief has called in sick. You write the whole firewall for Byteville tonight.',
    task: 'In 7 rules or fewer: (1) nothing at all from 203.0.113.0/24. (2) Anyone may reach the web server on 80 and 443. (3) Anything inside Byteville (10.0.0.0/8) may use DNS: UDP 53 to 10.0.1.53. (4) SSH to servers only from admin laptops. (5) Student laptops may start web connections out on 80 and 443. (6) Replies may come back to student laptops. (7) Block everything else.',
    starter: '# Your firewall. 7 rules or fewer.\n',
    hints: ['Put the bad neighborhood rule first. Otherwise a "reply" from that neighborhood would be let in by your replies rule.', 'One rule per requirement, in the same order as the list, works.'],
    packets: [
      P('Visitor opens the website (HTTPS)', 'tcp', '198.51.100.7', '10.0.1.10', 443, 'allow'),
      P('Visitor opens the website (HTTP)', 'tcp', '192.0.2.30', '10.0.1.10', 80, 'allow'),
      P('Bad neighbor opens the website', 'tcp', '203.0.113.66', '10.0.1.10', 443, 'block'),
      P('Student laptop looks up a name', 'udp', '10.0.2.15', '10.0.1.53', 53, 'allow'),
      P('Outsider uses our DNS server', 'udp', '198.51.100.7', '10.0.1.53', 53, 'block'),
      P('Admin SSH to the DNS server', 'tcp', '10.0.5.20', '10.0.1.53', 22, 'allow'),
      P('Student tries SSH to the web server', 'tcp', '10.0.2.15', '10.0.1.10', 22, 'block'),
      P('Outsider tries SSH', 'tcp', '192.0.2.99', '10.0.1.10', 22, 'block'),
      P('Laptop opens a website', 'tcp', '10.0.2.15', '198.51.100.25', 443, 'allow'),
      P('Website replies to the laptop', 'tcp', '198.51.100.25', '10.0.2.15', 51544, 'allow', 'est'),
      P('Outsider tries file sharing on a laptop', 'tcp', '192.0.2.99', '10.0.2.15', 445, 'block'),
      P('"Reply" from the bad neighborhood', 'tcp', '203.0.113.9', '10.0.2.15', 51544, 'block', 'est'),
      P('Laptop sends email straight out (spam bot)', 'tcp', '10.0.2.15', '198.51.100.25', 25, 'block'),
      P('Outsider pings the web server', 'icmp', '198.51.100.9', '10.0.1.10', 0, 'block'),
      P('Admin tries remote desktop', 'tcp', '10.0.5.20', '10.0.1.10', 3389, 'block'),
      P('Laptop SSH to the Internet', 'tcp', '10.0.2.15', '198.51.100.25', 22, 'block'),
    ],
  },
];

export const nwBase = (n: number): number => 40 + n * 10;
