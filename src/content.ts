// All game content lives here, so a teacher can edit wording without touching the game engine.
// Writing rules: short sentences, everyday words, one idea at a time.

import { Chapter, Packet } from './types';

/* ---------- helpers for random packets ---------- */
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const n = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const BLOCKLIST = ['203.0.113.66', '192.0.2.99'];
const PEOPLE = ['a student at home', 'a parent', 'a phone on school Wi-Fi', 'a visitor from Texas', 'a library computer', 'a laptop at a cafe'];
const goodIp = (): string => {
  let ip = '';
  do { ip = pick(['198.51.100.', '203.0.113.', '192.0.2.']) + n(2, 250); } while (BLOCKLIST.includes(ip));
  return ip;
};
export const PORT_NAMES: Record<number, string> = {
  80: 'HTTP (website)', 443: 'HTTPS (secure website)', 22: 'SSH (remote login)', 23: 'Telnet (old, unsafe login)',
  21: 'FTP (file transfer)', 445: 'SMB (file sharing)', 3389: 'RDP (remote desktop)', 3306: 'MySQL (database)',
};
const BAD_PORT_WHY: Record<number, string> = {
  22: 'Port 22 is remote login. Strangers try to guess passwords on it all day.',
  23: 'Port 23 is Telnet. It sends passwords as plain text. Keep it shut.',
  21: 'Port 21 is file transfer. A website does not need it.',
  445: 'Port 445 is file sharing. The WannaCry worm spread through it in 2017.',
  3389: 'Port 3389 is remote desktop. Ransomware gangs love finding it open.',
  3306: 'Port 3306 is a database. Databases should never face the Internet.',
};
export const SIGNATURES: [string, string][] = [
  ['OR 1=1', 'tricks a database (SQL injection)'],
  ['<script>', 'sneaks code into a web page'],
  ['../', 'tries to climb into other folders'],
];
const CLEAN_MSG = ['Show me the school calendar', 'Search: library hours', 'Login: maya.r (password ok)', 'Upload: science_project.pdf', 'Search: script for the school play', 'Search: 1 or 2 day field trip', 'Comment: Great game last night!'];
const BAD_MSG: [string, string][] = [
  ["Search: ' OR 1=1 --", 'OR 1=1'],
  ["Login: admin' OR 1=1 --", 'OR 1=1'],
  ['Comment: <script>steal()</script>', '<script>'],
  ['Get file: ../../secret/grades.txt', '../'],
];
const TRICKY: Record<string, string> = {
  'Search: script for the school play': 'It says "script", but not "<script>". A signature has to match exactly. This one is normal.',
  'Search: 1 or 2 day field trip': '"1 or 2" is not "OR 1=1". Just a normal search.',
};
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
let pid = 0;
const id = (p: string) => `${p}-${++pid}`;

function gatePackets(): Packet[] {
  const good = (): Packet => {
    const port = pick([443, 443, 80]);
    return { id: id('gate'), cat: 'website-ok', from: goodIp(), who: pick(PEOPLE), port, allow: true,
      why: port === 443 ? 'Port 443 is a secure website. It is on the allow list.' : 'Port 80 is a website. It is on the allow list.' };
  };
  const badPort = (): Packet => {
    const port = pick([22, 23, 21, 445, 3389, 3306]);
    return { id: id('gate'), cat: 'bad-port', from: goodIp(), who: pick(PEOPLE.concat(['unknown sender'])), port, allow: false,
      why: BAD_PORT_WHY[port] + ' Only 80 and 443 are allowed.' };
  };
  const badIp = (): Packet => {
    const ip = pick(BLOCKLIST);
    return { id: id('gate'), cat: 'blocklist', from: ip, who: 'unknown sender', port: pick([443, 80]), allow: false,
      why: `The port is fine, but ${ip} is on the blocklist. The blocklist rule is checked first.` };
  };
  const list = shuffle([good(), good(), good(), good(), good(), badPort(), badPort(), badPort(), badIp(), badIp()]);
  list[n(3, 8)].golden = true;
  return list;
}

function guardPackets(): Packet[] {
  const clean = (): Packet => {
    const m = pick(CLEAN_MSG);
    return { id: id('guard'), cat: TRICKY[m] ? 'tricky-clean' : 'clean', from: goodIp(), who: pick(PEOPLE), port: pick([443, 443, 80]), msg: m, allow: true,
      why: TRICKY[m] || 'Good IP, allowed port, clean message. Let it in.' };
  };
  const attack = (): Packet => {
    const [m, sig] = pick(BAD_MSG);
    const s = SIGNATURES.find(x => x[0] === sig)!;
    return { id: id('guard'), cat: 'signature', from: goodIp(), who: pick(PEOPLE), port: pick([443, 80]), msg: m, allow: false,
      why: `The port is allowed, but the message has "${s[0]}". That ${s[1]}. Block it.` };
  };
  const badPort = (): Packet => {
    const port = pick([22, 3389, 445]);
    return { id: id('guard'), cat: 'bad-port', from: goodIp(), who: 'unknown sender', port, msg: pick(CLEAN_MSG), allow: false,
      why: BAD_PORT_WHY[port] + ' The message looks fine, but the door is closed.' };
  };
  const badIp = (): Packet => {
    const ip = pick(BLOCKLIST);
    return { id: id('guard'), cat: 'blocklist', from: ip, who: 'unknown sender', port: 443, msg: pick(CLEAN_MSG), allow: false,
      why: `${ip} is on the blocklist. It does not matter how nice the message looks.` };
  };
  const list = shuffle([clean(), clean(), clean(), clean(), clean(), attack(), attack(), attack(), badPort(), badPort(), badIp(), badIp()]);
  list[n(4, 11)].golden = true;
  return list;
}

/* ---------- the chapters ---------- */
export const CHAPTERS: Chapter[] = [
  {
    id: 'c1', num: 1, place: 'Town Hall', topic: 'What is cybersecurity?', minutes: 5, icon: 'hall', color: '#F5A623',
    badge: 'First Steps',
    lessons: [
      { title: 'Welcome to Byteville', art: 'town',
        body: ['Byteville runs on computers. The school keeps grades on them. The bank keeps money records. The hospital keeps patient files. Even the traffic lights are online.',
          '<b>Cybersecurity</b> means protecting computers, phones, networks, and the information on them from people who want to <b>steal</b> it, <b>change</b> it, or <b>break</b> it.',
          'Your job: help Byteville stay safe. I will teach you one idea at a time. Then you will practice it.'] },
      { title: 'The CIA Triad', art: 'cia',
        body: ['No, not the spy agency. In security, CIA stands for three things we protect.',
          '<span class="term c">Confidentiality</span> Only the right people can see it. Like a lock on your diary.',
          '<span class="term i">Integrity</span> Nobody secretly changes it. Like a teacher\'s grade book that only the teacher can edit.',
          '<span class="term a">Availability</span> It works when you need it. Like the school website on the first day of class.'],
        fact: 'Almost every attack breaks at least one of these three. Spotting which one helps you choose the right defense.' },
      { title: 'Who attacks, and why?', art: 'attackers',
        body: ['Most attackers want <b>money</b>. Ransomware locks a school\'s files and demands payment to unlock them.',
          'Some want <b>secrets</b>, like passwords or test answers. Some just want to <b>show off</b>.',
          'The good news: simple habits and good tools stop most attacks. That is what you will learn here.'] },
    ],
    check: { id: 'c1-check', prompt: 'Someone changes your grade from a C to an A without permission. Which part of CIA is broken?',
      options: ['Confidentiality', 'Integrity', 'Availability'], answer: 1,
      explain: 'The grade was changed, so it can no longer be trusted. That is Integrity.' },
    stages: [{
      type: 'sort', title: 'Sort the Trouble', intro: 'Read each problem. Which part of CIA does it break? Click the right bin.',
      bins: [{ label: 'Confidentiality', hint: 'Someone saw what they should not' }, { label: 'Integrity', hint: 'Something was changed' }, { label: 'Availability', hint: 'Something stopped working' }],
      cards: [
        { id: 'c1-s1', text: 'A stranger reads your private messages.', bin: 0, explain: 'Private info was seen by the wrong person. Confidentiality.' },
        { id: 'c1-s2', text: 'A hacker changes the price of shoes on a store website to $1.', bin: 1, explain: 'The price was changed without permission. Integrity.' },
        { id: 'c1-s3', text: 'The school website crashes on the first day of class.', bin: 2, explain: 'Nobody can use it when they need it. Availability.' },
        { id: 'c1-s4', text: 'Your friend watches over your shoulder as you type your PIN.', bin: 0, explain: 'Your secret was seen. Confidentiality.' },
        { id: 'c1-s5', text: 'A virus edits files so the numbers in them are wrong.', bin: 1, explain: 'The data was changed, so you cannot trust it. Integrity.' },
        { id: 'c1-s6', text: 'A storm knocks out power to the server room.', bin: 2, explain: 'Not every problem is a hacker. The system is down. Availability.' },
        { id: 'c1-s7', text: 'Thousands of fake visitors flood a game server, so real players cannot log in.', bin: 2, explain: 'This is a DDoS attack. It blocks real users. Availability.' },
        { id: 'c1-s8', text: 'Someone posts your password online.', bin: 0, explain: 'A secret is now public. Confidentiality.' },
      ],
    }],
    outro: 'You can now name the three things every defender protects. Next stop: the Locksmith.',
  },
  {
    id: 'c2', num: 2, place: 'The Locksmith', topic: 'Passwords and MFA', minutes: 6, icon: 'lock', color: '#17807E',
    badge: 'Key Master',
    lessons: [
      { title: 'Your password is a key', art: 'password',
        body: ['A password is the key to your account. Attackers do not guess by hand. They use computers that try <b>billions</b> of guesses.',
          'Short passwords fall fast. Passwords made from your name, birthday, or pet are easy to guess, because that information is often online.'] },
      { title: 'What makes a strong password?', art: 'password',
        body: ['<b>Long beats clever.</b> Four random words, like <span class="mono">purple-tractor-moon-salad</span>, are long, easy to remember, and very hard to guess.',
          '<b>One per site.</b> If one website leaks, the thief tries that password everywhere. Different passwords stop that.',
          '<b>Use a password manager.</b> It remembers them all for you.'],
        fact: 'Swapping letters for symbols, like P@ssw0rd, does not fool anyone. Attack tools try those swaps first.' },
      { title: 'MFA: a second lock', art: 'mfa',
        body: ['<b>Multi-factor authentication</b> (MFA) asks for two different kinds of proof:',
          '<b>Something you know</b> (a password), <b>something you have</b> (your phone), or <b>something you are</b> (your fingerprint).',
          'Even if a thief steals your password, they still do not have your phone. MFA stops most account takeovers.'] },
    ],
    check: { id: 'c2-check', prompt: 'Which one is MFA?', options: ['A password and a second password', 'A password and a code sent to your phone', 'A very long password'], answer: 1,
      explain: 'Password (something you know) plus phone (something you have) is two different kinds of proof. That is MFA.' },
    stages: [
      { type: 'choice', style: 'pair', title: 'Password Gym', intro: 'Two keys. Click the stronger one.',
        items: [
          { id: 'c2-p1', prompt: 'Which password is stronger?', options: ['dragon123', 'blue-river-pizza-cloud'], answer: 1, explain: 'Four random words make a long password. "dragon123" is on every hacker\'s list.' },
          { id: 'c2-p2', prompt: 'Which password is stronger?', options: ['Jessica2010', 'maple-guitar-orbit-sock'], answer: 1, explain: 'A name plus a birth year is easy to find on social media.' },
          { id: 'c2-p3', prompt: 'Which password is stronger?', options: ['P@ssw0rd!', 'correct-horse-lamp-yellow'], answer: 1, explain: 'Symbol swaps are tried first by attack tools. Length wins.' },
          { id: 'c2-p4', prompt: 'Which habit is safer?', options: ['The same strong password on every site', 'A different password on every site, saved in a password manager'], answer: 1, explain: 'If one site leaks, a reused password unlocks all your other accounts.' },
          { id: 'c2-p5', prompt: 'Which password is stronger?', options: ['qwerty', 'Qz8#mL2!vR9p'], answer: 1, explain: '"qwerty" is a keyboard row. The second one is long and random.' },
        ] },
      { type: 'choice', style: 'list', title: 'What would you do?', intro: 'Real situations. Pick the best answer.',
        items: [
          { id: 'c2-q1', prompt: 'You get a text with a login code you did not ask for. What should you do?', options: ['Ignore the code and change your password', 'Send the code to whoever asks for it', 'Reply STOP'], answer: 0, explain: 'Someone may know your password and is stuck at MFA. Never share the code, and change your password.' },
          { id: 'c2-q2', prompt: 'A friend asks for your game password so they can level up your character. What do you do?', options: ['Share it, they are a friend', 'Say no, and keep your password private', 'Share it, then change it next month'], answer: 1, explain: 'Passwords are never shared, even with friends. Accounts get stolen this way all the time.' },
        ] },
    ],
    outro: 'Strong keys and a second lock. Byteville\'s doors are safer already.',
  },
  {
    id: 'c3', num: 3, place: 'Post Office', topic: 'Spotting phishing', minutes: 6, icon: 'mail', color: '#E8604C',
    badge: 'Phish Spotter',
    lessons: [
      { title: 'What is phishing?', art: 'phish',
        body: ['<b>Phishing</b> is a fake message that pretends to be from someone you trust. Its goal is to trick you into clicking a link, typing your password, or sending money.',
          'It can be an email, a text message, a DM, or even a phone call.'],
        fact: 'In Verizon\'s 2026 breach report, people were part of about 6 out of every 10 data breaches. Tricking a person is often easier than hacking a computer.' },
      { title: 'Red flags to look for', art: 'flags',
        body: ['<b>Hurry!</b> "Your account closes in 1 hour." Pressure stops you from thinking.',
          '<b>Weird sender.</b> <span class="mono">support@netfIix-help.co</span> uses a capital I instead of an l.',
          '<b>Asks for secrets.</b> Real companies never ask for your password or gift card codes.',
          '<b>Too good to be true.</b> "You won 10,000 Robux!" You did not.'] },
      { title: 'What to do', art: 'report',
        body: ['<b>Stop.</b> Do not click links or open attachments.',
          '<b>Check it yourself.</b> Open the real app or type the website address yourself.',
          '<b>Report it.</b> Tell a teacher, a parent, or IT, then delete it.'] },
    ],
    check: { id: 'c3-check', prompt: 'Which is the biggest red flag?', options: ['The email says "Hello"', 'The email asks you to type your password on a link', 'The email has a logo'], answer: 1,
      explain: 'Real companies never ask for your password through a link. Logos are easy to copy.' },
    stages: [{
      type: 'inbox', title: 'Inbox Patrol', intro: 'Open each message. Decide: Safe or Phish?',
      emails: [
        { id: 'c3-e1', from: 'Netflix', address: 'billing@netfIix-support.co', subject: 'Account suspended! Update payment in 2 hours', body: 'We could not process your payment. Your account will be deleted unless you update your card now.', link: 'netfIix-support.co/update', phish: true, clues: ['Capital I instead of l in "netfIix"', 'Strange ending ".co"', 'Pressure: "in 2 hours"'] },
        { id: 'c3-e2', from: 'Ms. Carter', address: 'jcarter@byteville-high.edu', subject: 'Reminder: quiz moved to Friday', body: 'Hi class, the quiz is moved to Friday. Study chapter 4. See you tomorrow!', phish: false, clues: ['School address you know', 'No link, no request for secrets', 'Normal, calm message'] },
        { id: 'c3-e3', from: 'Roblox Rewards', address: 'free.robux.rewards@gmail.com', subject: 'YOU WON 10,000 ROBUX!!!', body: 'Congrats! To claim your Robux, log in below with your username and password.', link: 'robux-claim-now.net', phish: true, clues: ['Too good to be true', 'A company does not use a free Gmail address', 'Asks for your password'] },
        { id: 'c3-e4', from: 'Principal Grant', address: 'principal.office.2026@outlook.com', subject: 'Quick favor, keep it secret', body: 'I need you to buy 5 gift cards for a staff surprise. Send me the codes today. Do not tell anyone.', phish: true, clues: ['Personal email, not the school address', 'Gift cards are a classic scam', '"Keep it secret" is pressure'] },
        { id: 'c3-e5', from: 'USPS', address: 'Text from +1 (838) 555-0147', subject: 'Package on hold', body: 'USPS: Your package is on hold. Pay a $1.99 fee to deliver.', link: 'usps-redelivery-help.info', kind: 'text', phish: true, clues: ['USPS does not text you for fees', 'The link is not usps.com', 'Small fee to steal your card number'] },
        { id: 'c3-e6', from: 'Library', address: 'notices@byteville-library.org', subject: 'Your book is due Monday', body: 'The book "Wonder" is due Monday. You can renew it at the front desk or in the library app.', phish: false, clues: ['Asks for nothing secret', 'Tells you to use the app or desk you already know', 'No pressure'] },
      ],
    }],
    outro: 'You just caught the trick behind most attacks. The Post Office is proud of you.',
  },
  {
    id: 'c4', num: 4, place: 'Hardware Store', topic: 'Security controls', minutes: 6, icon: 'tools', color: '#3C9D5D',
    badge: 'Control Expert',
    lessons: [
      { title: 'What is a security control?', art: 'controls',
        body: ['A <b>security control</b> is anything that protects something. Think about your home.',
          'A <b>lock</b> keeps people out. A <b>doorbell camera</b> shows who came by. <b>Insurance</b> helps you recover after a break-in.',
          'Computers use the same three ideas.'] },
      { title: 'Three jobs: Prevent, Detect, Fix', art: 'controls',
        body: ['<span class="term c">Prevent</span> Stop the problem before it happens. Locks, passwords, firewalls.',
          '<span class="term i">Detect</span> Notice when something bad is happening. Cameras, alarms, an IDS.',
          '<span class="term a">Fix</span> Recover after something goes wrong. Backups, antivirus cleanup, restoring files.'],
        fact: 'Good defenders use all three. No lock is perfect, so you also need a camera and a backup.' },
      { title: 'Three kinds: Physical, Technical, Administrative', art: 'controlKinds',
        body: ['<b>Physical:</b> things you can touch. Fences, guards, a locked server room.',
          '<b>Technical:</b> done by computers. Firewalls, encryption, MFA.',
          '<b>Administrative:</b> rules and training for people. "Never share your password." Lessons like this one.'] },
    ],
    check: { id: 'c4-check', prompt: 'A security camera is mainly a...', options: ['Prevent control', 'Detect control', 'Fix control'], answer: 1,
      explain: 'A camera does not stop anyone. It shows you what happened. That is Detect.' },
    stages: [
      { type: 'sort', title: 'Stock the Shelves', intro: 'Each control has one main job. Put it on the right shelf.',
        bins: [{ label: 'Prevent', hint: 'Stops it before it happens' }, { label: 'Detect', hint: 'Notices it happening' }, { label: 'Fix', hint: 'Recovers afterward' }],
        cards: [
          { id: 'c4-s1', text: 'A lock on the server room door', bin: 0, explain: 'It keeps people out. Prevent.' },
          { id: 'c4-s2', text: 'A firewall that blocks bad traffic', bin: 0, explain: 'It stops traffic before it gets in. Prevent.' },
          { id: 'c4-s3', text: 'Multi-factor authentication (MFA)', bin: 0, explain: 'It stops a thief from logging in. Prevent.' },
          { id: 'c4-s4', text: 'A security camera in the hallway', bin: 1, explain: 'It records what happens. Detect.' },
          { id: 'c4-s5', text: 'An alert when someone logs in at 3 AM from another country', bin: 1, explain: 'It notices strange activity. Detect.' },
          { id: 'c4-s6', text: 'An intrusion detection system (IDS)', bin: 1, explain: 'The word is right in the name. Detect.' },
          { id: 'c4-s7', text: 'Restoring files from last night\'s backup', bin: 2, explain: 'It recovers what was lost. Fix.' },
          { id: 'c4-s8', text: 'Antivirus removing a virus it found', bin: 2, explain: 'It cleans up after the infection. Fix.' },
          { id: 'c4-s9', text: 'Rebuilding a laptop after ransomware', bin: 2, explain: 'It brings the computer back to a safe state. Fix.' },
        ] },
      { type: 'choice', style: 'list', title: 'Physical, Technical, or Administrative?', intro: 'One more sort, quick-fire style.',
        items: [
          { id: 'c4-k1', prompt: 'A tall fence around the data center', options: ['Physical', 'Technical', 'Administrative'], answer: 0, explain: 'You can touch it. Physical.' },
          { id: 'c4-k2', prompt: 'Encrypting files so only the owner can read them', options: ['Physical', 'Technical', 'Administrative'], answer: 1, explain: 'The computer does it. Technical.' },
          { id: 'c4-k3', prompt: 'A school rule: "Never share your password"', options: ['Physical', 'Technical', 'Administrative'], answer: 2, explain: 'A rule for people. Administrative.' },
          { id: 'c4-k4', prompt: 'Training every student to spot phishing', options: ['Physical', 'Technical', 'Administrative'], answer: 2, explain: 'Training is a people control. Administrative.' },
        ] },
    ],
    outro: 'You now think like a security planner: prevent, detect, and fix. Time to guard the City Gate.',
  },
  {
    id: 'c5', num: 5, place: 'City Gate', topic: 'Firewalls', minutes: 6, icon: 'gate', color: '#3B6FB6',
    badge: 'Gatekeeper',
    lessons: [
      { title: 'Data travels in packets', art: 'packet',
        body: ['When you open a video, it does not arrive in one piece. It is cut into thousands of small <b>packets</b>, like envelopes.',
          'Every envelope has a <b>From</b> address, a <b>To</b> address, and a <b>door number</b>. These addresses are called <b>IP addresses</b>.'],
        fact: 'A 5 MB photo travels as about 3,500 packets. They are put back together when they arrive.' },
      { title: 'Ports are doors', art: 'ports',
        body: ['A computer has 65,536 numbered doors called <b>ports</b>. Each program listens at its own door.',
          '<b>443</b> is secure websites. <b>80</b> is regular websites. <b>22</b> is remote login. <b>3389</b> is remote desktop.',
          'Open doors are risky. A web server only needs 80 and 443.'] },
      { title: 'The firewall is the gate guard', art: 'firewall',
        body: ['A <b>firewall</b> checks every packet against a list of rules, then decides: <b>allow</b> or <b>block</b>.',
          'It reads the outside of the envelope: who sent it, where it is going, and which door.',
          'Golden rule: <b>if it is not on the list, it does not get in.</b> This is called <i>default deny</i>.'] },
    ],
    check: { id: 'c5-check', prompt: 'The firewall rule is "Allow port 443 only." A packet wants port 3389. What happens?', options: ['Allowed', 'Blocked', 'It waits'], answer: 1,
      explain: '3389 is not on the list, so default deny blocks it.' },
    stages: [{
      type: 'lane', title: 'Gate Duty', intro: 'Packets are coming! Check your rules and decide before each one reaches the gate. Gold packets are worth bonus points.',
      wall: 'FIREWALL', left: 'The Internet', right: 'Byteville School', seconds: 12, yes: 'ALLOW', no: 'BLOCK',
      rules: [{ kind: 'block', text: 'Anything from a blocklisted IP' }, { kind: 'allow', text: 'Port 80 or 443 (websites)' }, { kind: 'block', text: 'Every other port' }],
      chips: [{ label: 'Blocklist', values: BLOCKLIST }],
      packets: gatePackets,
    }],
    outro: 'Not one stranger slipped through your gate. Next, you will build the rules yourself.',
  },
  {
    id: 'c6', num: 6, place: 'Rule Workshop', topic: 'Firewall rule order', minutes: 5, icon: 'workshop', color: '#8A5BB8',
    badge: 'Rule Architect',
    lessons: [
      { title: 'Order matters', art: 'order',
        body: ['A firewall reads its rules from the <b>top down</b>. As soon as one rule matches, it stops reading. This is called <b>first match wins</b>.',
          'So if "Block everything" is at the top, nothing ever gets through, not even the school website.'] },
      { title: 'How to build a good list', art: 'order',
        body: ['Put the most <b>specific</b> rules at the top, like "Block this one bad IP."',
          'Put the general allow rules in the middle, like "Allow websites."',
          'Put <b>"Block everything"</b> at the very bottom as the safety net.'] },
    ],
    check: { id: 'c6-check', prompt: 'Where should "Block everything" go?', options: ['At the top', 'In the middle', 'At the bottom'], answer: 2,
      explain: 'At the bottom, it catches whatever the other rules did not allow.' },
    stages: [{
      type: 'order', title: 'Fix the Rule List', intro: 'Use the arrows to put the rules in order. Then press Test. All test packets must turn green.',
      puzzles: [
        { id: 'c6-o1', goal: 'Let website visitors in. Keep everything else out.',
          rules: [{ id: 'all', text: 'Block everything', action: 'block' }, { id: '443', text: 'Allow port 443 (websites)', action: 'allow', port: 443 }],
          tests: [{ label: 'Visitor to the website', ip: '198.51.100.7', port: 443, allow: true }, { label: 'Stranger trying remote desktop', ip: '198.51.100.7', port: 3389, allow: false }],
          hint: 'The safety net goes at the bottom.' },
        { id: 'c6-o2', goal: 'Let website visitors in, except the known bad IP 203.0.113.66.',
          rules: [{ id: '443', text: 'Allow port 443 (websites)', action: 'allow', port: 443 }, { id: 'all', text: 'Block everything', action: 'block' }, { id: 'ip', text: 'Block IP 203.0.113.66', action: 'block', ip: '203.0.113.66' }],
          tests: [{ label: 'Normal visitor to the website', ip: '198.51.100.7', port: 443, allow: true }, { label: 'Bad IP to the website', ip: '203.0.113.66', port: 443, allow: false }, { label: 'Stranger trying remote login', ip: '198.51.100.7', port: 22, allow: false }],
          hint: 'The most specific rule, about one single IP, must come before "Allow port 443".' },
        { id: 'c6-o3', goal: 'Only the IT laptop (10.0.5.20) may use remote login on port 22. Websites stay open to all.',
          rules: [{ id: 'b22', text: 'Block port 22 (remote login)', action: 'block', port: 22 }, { id: '443', text: 'Allow port 443 (websites)', action: 'allow', port: 443 }, { id: 'all', text: 'Block everything', action: 'block' }, { id: 'it', text: 'Allow port 22 from IT laptop 10.0.5.20', action: 'allow', port: 22, ip: '10.0.5.20' }],
          tests: [{ label: 'IT laptop, remote login', ip: '10.0.5.20', port: 22, allow: true }, { label: 'Stranger, remote login', ip: '203.0.113.9', port: 22, allow: false }, { label: 'Visitor to the website', ip: '198.51.100.7', port: 443, allow: true }, { label: 'Stranger trying remote desktop', ip: '198.51.100.7', port: 3389, allow: false }],
          hint: 'The IT laptop rule is more specific than "Block port 22", so it must be above it.' },
      ],
    }],
    outro: 'You just did a real network engineer\'s job. Rule order trips up professionals too.',
  },
  {
    id: 'c7', num: 7, place: 'Watchtower', topic: 'Intrusion detection (IDS)', minutes: 5, icon: 'tower', color: '#C9862B',
    badge: 'Watchtower Eye',
    lessons: [
      { title: 'What the gate cannot see', art: 'ids',
        body: ['The firewall only reads the <b>outside</b> of the envelope. It never opens it.',
          'So an attack can sneak in through an allowed door, like port 443, hidden inside the message.'] },
      { title: 'The IDS is a security camera', art: 'ids',
        body: ['An <b>Intrusion Detection System</b> (IDS) watches the traffic and reads what is <b>inside</b>.',
          'If it sees something bad, it raises an <b>alert</b> for a human to check. It does not block anything by itself.'] },
      { title: 'Two ways to spot trouble', art: 'signature',
        body: ['<b>Signatures</b> are like wanted posters. The IDS looks for known attack text, such as <span class="mono">OR 1=1</span>.',
          '<b>Anomalies</b> are things that look weird compared to normal. A school laptop sending 5 GB of data at 3 AM is weird.'],
        fact: 'Signatures must match exactly. "script for the play" is not the same as "&lt;script&gt;".' },
    ],
    check: { id: 'c7-check', prompt: 'What does an IDS do when it finds an attack?', options: ['Blocks it', 'Raises an alert', 'Deletes the computer'], answer: 1,
      explain: 'An IDS watches and alerts. Blocking is the job of an IPS, which you will meet next.' },
    stages: [{
      type: 'choice', style: 'list', title: 'Tower Watch', intro: 'These all got past the firewall. Read what is inside. Normal, or raise the alert?',
      items: [
        { id: 'c7-w1', prompt: "Message: Search: ' OR 1=1 --", options: ['Normal', 'Alert'], answer: 1, explain: 'It contains "OR 1=1", a database trick. Alert.' },
        { id: 'c7-w2', prompt: 'Message: Show me the school calendar', options: ['Normal', 'Alert'], answer: 0, explain: 'A normal request. No signature.' },
        { id: 'c7-w3', prompt: 'Message: Comment: <script>steal()</script>', options: ['Normal', 'Alert'], answer: 1, explain: 'It contains "<script>", code hidden in a comment. Alert.' },
        { id: 'c7-w4', prompt: 'Message: Search: script for the school play', options: ['Normal', 'Alert'], answer: 0, explain: '"script" is not "<script>". Signatures must match exactly. Normal.' },
        { id: 'c7-w5', prompt: 'Activity: A school laptop sends 5 GB to an unknown server at 3:12 AM', options: ['Normal', 'Alert'], answer: 1, explain: 'Huge upload, strange time, unknown place. That is an anomaly. Alert.' },
        { id: 'c7-w6', prompt: 'Activity: A student downloads a 20 MB PDF for class at 10 AM', options: ['Normal', 'Alert'], answer: 0, explain: 'Normal size, normal time, normal reason.' },
        { id: 'c7-w7', prompt: 'Message: Get file: ../../secret/grades.txt', options: ['Normal', 'Alert'], answer: 1, explain: '"../" tries to climb into folders it should not reach. Alert.' },
        { id: 'c7-w8', prompt: 'Activity: The same account fails to log in 50 times in one minute', options: ['Normal', 'Alert'], answer: 1, explain: 'Someone is guessing passwords. That is an anomaly. Alert.' },
      ],
    }],
    outro: 'Sharp eyes! The watchtower caught what the gate could not see.',
  },
  {
    id: 'c8', num: 8, place: 'Guard Post', topic: 'IPS and defense in depth', minutes: 6, icon: 'shield', color: '#2E2A3B',
    badge: 'Town Defender',
    lessons: [
      { title: 'The IPS can stop attacks', art: 'ips',
        body: ['An <b>Intrusion Prevention System</b> (IPS) reads inside packets like an IDS. The difference: it sits <b>in the path</b>, so it can <b>block</b> bad packets right away.',
          'IDS = camera that calls for help. IPS = guard who stops the intruder.'] },
      { title: 'Oops: false positives', art: 'ips',
        body: ['Sometimes an IPS blocks something that was actually fine. That is a <b>false positive</b>.',
          'Missing a real attack is a <b>false negative</b>. Defenders tune their rules to keep both low.'] },
      { title: 'Defense in depth', art: 'castle',
        body: ['A castle has a moat, a wall, guards, and a locked treasure room. If one layer fails, the next one is still there.',
          'Byteville works the same way: <b>training</b> stops phishing, <b>MFA</b> stops stolen passwords, the <b>firewall</b> guards the doors, the <b>IPS</b> checks the messages, and <b>backups</b> fix what breaks.'] },
    ],
    check: { id: 'c8-check', prompt: 'The IPS blocks a student\'s real homework upload by mistake. This is a...', options: ['False positive', 'False negative', 'True positive'], answer: 0,
      explain: 'It raised the alarm on something that was fine. False positive.' },
    stages: [{
      type: 'lane', title: 'Night Shift', intro: 'Final challenge! You are the firewall AND the IPS. Check the IP, then the port, then the message. Faster this time.',
      wall: 'FIREWALL + IPS', left: 'The Internet', right: 'Byteville School', seconds: 10, yes: 'ALLOW', no: 'BLOCK',
      rules: [{ kind: 'block', text: 'Anything from a blocklisted IP' }, { kind: 'block', text: 'Any port that is not 80 or 443' }, { kind: 'alert', text: 'Any message with a signature' }, { kind: 'allow', text: 'Everything that passed all three checks' }],
      chips: [{ label: 'Blocklist', values: BLOCKLIST }, { label: 'Signatures', values: SIGNATURES.map(s => s[0]) }],
      packets: guardPackets,
    }],
    outro: 'Byteville is safe tonight because of you. Head to Graduation for your certificate!',
  },
];

export const RANKS: [number, string][] = [
  [0, 'Rookie'], [200, 'Cadet'], [600, 'Gate Guard'], [1200, 'Analyst'], [1900, 'Defender'], [2600, 'Chief of Security'],
];

export const BADGES: { id: string; name: string; how: string }[] = [
  ...CHAPTERS.map(c => ({ id: 'ch-' + c.id, name: c.badge, how: `Finish chapter ${c.num}: ${c.place}` })),
  { id: 'streak5', name: 'Hot Streak', how: '5 right answers in a row' },
  { id: 'streak10', name: 'Unstoppable', how: '10 right answers in a row' },
  { id: 'golden', name: 'Golden Catch', how: 'Handle a gold packet correctly' },
  { id: 'perfect', name: 'Perfectionist', how: 'Get 3 stars on 3 chapters' },
  { id: 'quick', name: 'Quick Thinker', how: '5 fast right answers at the gate' },
  { id: 'grad', name: 'Graduate', how: 'Finish all 8 chapters' },
  { id: 'nw-first', name: 'Night Owl', how: 'Solve your first Night Watch level' },
  { id: 'nw-half', name: 'Graveyard Shift', how: 'Solve 6 Night Watch levels' },
  { id: 'nw-clean', name: 'No Hints Needed', how: 'Solve a Night Watch level from 7 up without hints' },
  { id: 'nw-all', name: 'Sentinel', how: 'Solve all 12 Night Watch levels' },
  { id: 'op-first', name: 'Logged In', how: 'Solve your first Control Room level' },
  { id: 'op-all', name: 'Root of Trust', how: 'Solve all 10 Control Room levels' },
];

export const PRAISE = ['Nice catch!', 'Great thinking!', 'You got it!', 'Sharp eyes!', 'Exactly right!', 'Well done, defender!'];
export const ENCOURAGE = ['Almost! Here is the trick:', 'Good try. Here is what to look for:', 'Not this time. Remember:', 'Close! Keep this in mind:'];
