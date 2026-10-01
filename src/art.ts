// Hand-built SVG drawings. Colors come from CSS variables in css/style.css.

import { ArtKey, Chapter } from './types';

const svg = (vb: string, body: string, label: string) =>
  `<svg viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

/** Officer Ada, the guide. */
export function ada(size = 64): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="var(--sky)"/>
  <path d="M14 58c2-10 9-15 18-15s16 5 18 15" fill="var(--teal)"/>
  <rect x="29" y="47" width="6" height="7" rx="1" fill="var(--sun)"/>
  <circle cx="32" cy="31" r="13" fill="#C98E62"/>
  <path d="M19 30c0-9 6-14 13-14s13 5 13 14c-3-3-6-5-13-5s-10 2-13 5z" fill="#3A2B25"/>
  <path d="M17 22c4-8 26-8 30 0l-2 4H19z" fill="var(--ink)"/>
  <rect x="17" y="24" width="30" height="3" rx="1.5" fill="var(--ink)"/>
  <circle cx="32" cy="19" r="2.6" fill="var(--sun)"/>
  <circle cx="27" cy="32" r="1.6" fill="var(--ink)"/><circle cx="37" cy="32" r="1.6" fill="var(--ink)"/>
  <path d="M28 37c2 2 6 2 8 0" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;
}

const AV = [['#F5A623', '#3A2B25'], ['#17807E', '#1C1A24'], ['#E8604C', '#7A4A2A'], ['#3C9D5D', '#C9862B'], ['#8A5BB8', '#2E2A3B'], ['#3B6FB6', '#B5652E']];
export function avatar(i: number, size = 44): string {
  const [bg, hair] = AV[i % AV.length];
  const hairs = [
    `<path d="M14 24c0-8 6-12 12-12s12 4 12 12c-3-4-7-5-12-5s-9 1-12 5z" fill="${hair}"/>`,
    `<path d="M13 26c-1-10 6-15 13-15s14 5 13 15c-2-1-3-6-6-7-4 3-10 3-14 0-3 1-4 6-6 7z" fill="${hair}"/>`,
    `<rect x="13" y="12" width="26" height="8" rx="4" fill="${hair}"/><rect x="11" y="18" width="30" height="3" rx="1.5" fill="${hair}"/>`,
    `<path d="M14 24c0-9 6-13 12-13s12 4 12 13l-3 8c-1-8-4-12-9-12s-8 4-9 12z" fill="${hair}"/>`,
    `<circle cx="18" cy="15" r="5" fill="${hair}"/><circle cx="34" cy="15" r="5" fill="${hair}"/><path d="M15 22c0-6 5-9 11-9s11 3 11 9" fill="${hair}"/>`,
    `<path d="M15 20c3-7 19-7 22 0v3H15z" fill="${hair}"/><rect x="24" y="9" width="4" height="6" rx="2" fill="${hair}"/>`,
  ];
  return `<svg width="${size}" height="${size}" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="25" fill="${bg}"/>
  <path d="M10 50c2-8 8-12 16-12s14 4 16 12" fill="#FFF8EE" opacity=".9"/><circle cx="26" cy="25" r="10" fill="#E2B48C"/>
  ${hairs[i % hairs.length]}<circle cx="22.5" cy="26" r="1.3" fill="#2E2A3B"/><circle cx="29.5" cy="26" r="1.3" fill="#2E2A3B"/>
  <path d="M23 30c1.6 1.4 4.4 1.4 6 0" stroke="#2E2A3B" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
}

/** Building icons for the town map. */
export function building(ch: Chapter): string {
  const c = ch.color;
  const roof = (y: number) => `<path d="M14 ${y}L60 ${y - 26}L106 ${y}z" fill="${c}"/>`;
  const base = `<rect x="6" y="88" width="108" height="6" rx="3" fill="var(--grass-dark)"/>`;
  const door = `<rect x="52" y="64" width="16" height="24" rx="8" fill="var(--ink)" opacity=".85"/>`;
  const walls = `<rect x="20" y="46" width="80" height="42" rx="3" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>`;
  const win = (x: number) => `<rect x="${x}" y="54" width="14" height="12" rx="2" fill="var(--sky)" stroke="var(--ink)" stroke-width="1.5"/>`;
  const sign: Record<Chapter['icon'], string> = {
    hall: `<circle cx="60" cy="32" r="13" fill="${c}"/><rect x="58" y="10" width="4" height="10" fill="var(--ink)"/><path d="M62 10h10l-3 3 3 3H62z" fill="var(--coral)"/>${walls}<rect x="28" y="50" width="6" height="38" fill="${c}" opacity=".5"/><rect x="86" y="50" width="6" height="38" fill="${c}" opacity=".5"/>${door}`,
    lock: `${roof(46)}${walls}${win(28)}${win(78)}${door}<rect x="50" y="26" width="20" height="14" rx="3" fill="var(--sun)"/><path d="M54 26v-4a6 6 0 0 1 12 0v4" stroke="var(--ink)" stroke-width="2.5" fill="none"/>`,
    mail: `${roof(46)}${walls}${win(28)}${win(78)}${door}<rect x="47" y="24" width="26" height="16" rx="2" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M47 25l13 9 13-9" stroke="var(--ink)" stroke-width="2" fill="none"/>`,
    tools: `${roof(46)}${walls}${win(28)}${win(78)}${door}<path d="M50 38l12-12m-4 0h6v6" stroke="var(--ink)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="50" cy="38" r="3" fill="var(--sun)"/>`,
    gate: `<rect x="14" y="30" width="22" height="58" fill="${c}"/><rect x="84" y="30" width="22" height="58" fill="${c}"/><path d="M14 30h22v-6h-5v4h-4v-4h-4v4h-4v-4h-5zM84 30h22v-6h-5v4h-4v-4h-4v4h-4v-4h-5z" fill="${c}"/><path d="M36 88V50a24 24 0 0 1 48 0v38" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>${[44, 52, 60, 68, 76].map(x => `<rect x="${x - 1}" y="44" width="2.5" height="44" fill="var(--ink)"/>`).join('')}`,
    workshop: `<path d="M14 46l30-20 16 10 16-10 30 20z" fill="${c}"/>${walls}${win(28)}${win(78)}${door}<circle cx="60" cy="36" r="6" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/>`,
    tower: `<rect x="44" y="30" width="32" height="58" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M38 30l22-20 22 20z" fill="${c}"/><rect x="50" y="40" width="20" height="12" rx="2" fill="var(--sky)" stroke="var(--ink)" stroke-width="1.5"/><ellipse cx="60" cy="46" rx="6" ry="4" fill="var(--paper)"/><circle cx="60" cy="46" r="2.4" fill="var(--ink)"/><rect x="54" y="66" width="12" height="22" rx="6" fill="var(--ink)" opacity=".85"/>`,
    shield: `<rect x="20" y="46" width="80" height="42" rx="3" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M60 14l22 8v14c0 14-10 22-22 26-12-4-22-12-22-26V22z" fill="${c}"/><path d="M52 34l6 6 11-12" stroke="var(--sun)" stroke-width="3.5" fill="none" stroke-linecap="round"/>${door}`,
  };
  return svg('0 0 120 96', sign[ch.icon] + base, ch.place);
}

/** Lesson illustrations. */
export function art(key: ArtKey): string {
  const T = (x: number, y: number, t: string, cls = 'a-t') => `<text x="${x}" y="${y}" class="${cls}">${t}</text>`;
  const box = (x: number, y: number, w: number, h: number, fill: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="var(--ink)" stroke-width="2"/>`;
  const env = (x: number, y: number, fill = 'var(--paper)') => `<g transform="translate(${x} ${y})"><rect width="64" height="42" rx="5" fill="${fill}" stroke="var(--ink)" stroke-width="2"/><path d="M0 2l32 22L64 2" stroke="var(--ink)" stroke-width="2" fill="none"/></g>`;
  const A: Record<ArtKey, string> = {
    town: `${[[20, 'var(--sun)'], [92, 'var(--teal)'], [164, 'var(--coral)'], [236, 'var(--leaf)']].map(([x, c]) => `<rect x="${x}" y="${90 - (Number(x) % 3) * 12}" width="56" height="${70 + (Number(x) % 3) * 12}" rx="4" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M${Number(x) - 4} ${92 - (Number(x) % 3) * 12}l32-24 32 24z" fill="${c}"/><rect x="${Number(x) + 20}" y="136" width="16" height="24" rx="8" fill="var(--ink)" opacity=".8"/>`).join('')}<rect x="0" y="160" width="320" height="10" rx="5" fill="var(--grass-dark)"/><path d="M40 40c20-20 60-20 80 0" stroke="var(--teal)" stroke-width="3" fill="none" stroke-dasharray="6 6"/><path d="M200 40c20-20 60-20 80 0" stroke="var(--teal)" stroke-width="3" fill="none" stroke-dasharray="6 6"/>`,
    cia: `<path d="M160 18L292 176H28z" fill="var(--paper)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="160" cy="28" r="22" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/>${T(152, 36, 'C', 'a-big')}<circle cx="40" cy="166" r="22" fill="var(--teal)" stroke="var(--ink)" stroke-width="2"/>${T(33, 174, 'I', 'a-big a-light')}<circle cx="280" cy="166" r="22" fill="var(--coral)" stroke="var(--ink)" stroke-width="2"/>${T(271, 174, 'A', 'a-big a-light')}${T(115, 120, 'Protect all three')}`,
    attackers: `${box(20, 40, 84, 110, 'var(--sun)')}${box(118, 40, 84, 110, 'var(--sky)')}${box(216, 40, 84, 110, 'var(--coral-soft)')}${T(46, 102, '$', 'a-big')}${T(140, 100, 'KEY', 'a-mid')}${T(232, 100, 'WOW', 'a-mid')}${T(36, 172, 'Money')}${T(136, 172, 'Secrets')}${T(228, 172, 'Show off')}`,
    password: `${box(24, 40, 272, 44, 'var(--paper)')}${T(40, 68, 'dragon123', 'a-mono')}<rect x="186" y="56" width="96" height="12" rx="6" fill="var(--line)"/><rect x="186" y="56" width="22" height="12" rx="6" fill="var(--coral)"/>${box(24, 110, 272, 44, 'var(--paper)')}${T(40, 138, 'blue-river-pizza-cloud', 'a-mono')}<rect x="236" y="126" width="46" height="12" rx="6" fill="var(--leaf)"/>${T(40, 186, 'Longer = stronger')}`,
    mfa: `${box(30, 40, 110, 110, 'var(--sun-soft)')}${T(58, 100, '****', 'a-mono')}${T(42, 172, 'Something you know')}${T(156, 98, '+', 'a-big')}${box(186, 34, 74, 122, 'var(--sky)')}<rect x="198" y="52" width="50" height="60" rx="4" fill="var(--paper)"/>${T(205, 88, '482 913', 'a-mono-s')}<circle cx="223" cy="134" r="7" fill="var(--paper)"/>${T(172, 172, 'Something you have')}`,
    phish: `<path d="M40 100c40-50 140-50 180 0-40 50-140 50-180 0z" fill="var(--sky)" stroke="var(--ink)" stroke-width="2.5"/><path d="M220 100l40-30v60z" fill="var(--sky)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="80" cy="92" r="6" fill="var(--ink)"/>${env(120, 78, 'var(--paper)')}<path d="M60 20v40" stroke="var(--ink)" stroke-width="2"/><path d="M60 60c0 12 14 12 14 0" stroke="var(--ink)" stroke-width="2.5" fill="none"/>${T(100, 186, 'Fake message, real hook')}`,
    flags: `${box(20, 24, 280, 150, 'var(--paper)')}${T(36, 54, 'From: support@netfIix-help.co', 'a-mono-s')}${T(36, 84, 'URGENT: account closes in 1 hour', 'a-mono-s')}${T(36, 114, 'Click here and type your password', 'a-mono-s')}${[48, 78, 108].map(y => `<path d="M286 ${y - 12}v18" stroke="var(--ink)" stroke-width="2"/><path d="M286 ${y - 12}h-14l4 5-4 5h14z" fill="var(--coral)"/>`).join('')}${T(36, 156, '3 red flags in one email', 'a-t')}`,
    report: `${[['STOP', 'var(--coral)', 20], ['CHECK', 'var(--sun)', 118], ['REPORT', 'var(--leaf)', 216]].map(([t, c, x]) => `<circle cx="${Number(x) + 42}" cy="88" r="42" fill="${c}" stroke="var(--ink)" stroke-width="2"/>${T(Number(x) + (String(t).length > 4 ? 14 : 22), 95, String(t), 'a-mid')}`).join('')}<path d="M106 88h8m90 0h8" stroke="var(--ink)" stroke-width="3"/>`,
    controls: `${box(18, 30, 88, 130, 'var(--sun-soft)')}${box(116, 30, 88, 130, 'var(--sky)')}${box(214, 30, 88, 130, 'var(--leaf-soft)')}<rect x="48" y="80" width="28" height="22" rx="4" fill="var(--ink)"/><path d="M53 80v-8a9 9 0 0 1 18 0v8" stroke="var(--ink)" stroke-width="4" fill="none"/><rect x="138" y="76" width="34" height="22" rx="4" fill="var(--ink)"/><path d="M172 82l12-6v22l-12-6z" fill="var(--ink)"/><path d="M240 92a20 20 0 1 0 6-16" stroke="var(--ink)" stroke-width="4" fill="none"/><path d="M244 66l2 12 12-4" stroke="var(--ink)" stroke-width="4" fill="none"/>${T(36, 186, 'Prevent')}${T(136, 186, 'Detect')}${T(244, 186, 'Fix')}`,
    controlKinds: `${box(18, 30, 88, 130, 'var(--paper)')}${box(116, 30, 88, 130, 'var(--paper)')}${box(214, 30, 88, 130, 'var(--paper)')}${[40, 54, 68, 82].map(x => `<rect x="${x}" y="70" width="6" height="56" fill="var(--ink)"/>`).join('')}<rect x="36" y="80" width="56" height="5" fill="var(--ink)"/><rect x="134" y="66" width="52" height="38" rx="4" fill="var(--sky)" stroke="var(--ink)" stroke-width="2"/><rect x="150" y="104" width="20" height="10" fill="var(--ink)"/><rect x="234" y="58" width="48" height="66" rx="3" fill="var(--sun-soft)" stroke="var(--ink)" stroke-width="2"/>${[74, 86, 98, 110].map(y => `<rect x="242" y="${y}" width="32" height="4" rx="2" fill="var(--ink)" opacity=".6"/>`).join('')}${T(30, 186, 'Physical')}${T(128, 186, 'Technical')}${T(212, 186, 'Administrative', 'a-t a-small')}`,
    packet: `${env(30, 60, 'var(--sun-soft)')}${env(128, 60, 'var(--sun-soft)')}${env(226, 60, 'var(--sun-soft)')}${T(30, 136, 'From: 198.51.100.7', 'a-mono-s')}${T(30, 156, 'To: 10.0.1.10   Door: 443', 'a-mono-s')}<path d="M98 81h26m72 0h26" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/>`,
    ports: `${[[24, '80', 'var(--leaf-soft)'], [84, '443', 'var(--leaf-soft)'], [144, '22', 'var(--coral-soft)'], [204, '3389', 'var(--coral-soft)'], [264, '445', 'var(--coral-soft)']].map(([x, t, c]) => `<rect x="${x}" y="50" width="44" height="80" rx="22" fill="${c}" stroke="var(--ink)" stroke-width="2"/>${T(Number(x) + (String(t).length > 3 ? 4 : String(t).length > 2 ? 9 : 14), 98, String(t), 'a-mono')}`).join('')}${T(24, 166, 'Open: 80, 443', 'a-t')}${T(178, 166, 'Shut: the rest', 'a-t')}`,
    firewall: `${env(20, 70, 'var(--sun-soft)')}<rect x="140" y="20" width="40" height="160" fill="var(--coral-soft)" stroke="var(--ink)" stroke-width="2"/>${[40, 70, 100, 130, 160].map(y => `<path d="M140 ${y}h40" stroke="var(--ink)" stroke-width="1.5"/>`).join('')}<path d="M90 91h44" stroke="var(--ink)" stroke-width="2.5"/><path d="M128 85l8 6-8 6" fill="var(--ink)"/>${box(206, 56, 96, 74, 'var(--paper)')}${T(216, 82, 'Rules', 'a-t')}${T(216, 104, '+ 80, 443', 'a-mono-s')}${T(216, 120, 'x the rest', 'a-mono-s')}`,
    order: `${[['1', 'Block bad IP', 'var(--coral-soft)'], ['2', 'Allow 443', 'var(--leaf-soft)'], ['3', 'Block everything', 'var(--coral-soft)']].map(([nn, t, c], i) => `${box(60, 22 + i * 54, 200, 42, c)}${T(76, 49 + i * 54, `${nn}.  ${t}`, 'a-t')}`).join('')}<path d="M36 30v140" stroke="var(--teal)" stroke-width="3"/><path d="M28 162l8 12 8-12" fill="var(--teal)"/>${T(270, 49, 'first', 'a-t a-small')}`,
    ids: `<rect x="130" y="40" width="60" height="140" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M120 40l40-30 40 30z" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/><ellipse cx="160" cy="76" rx="18" ry="11" fill="var(--sky)" stroke="var(--ink)" stroke-width="2"/><circle cx="160" cy="76" r="5" fill="var(--ink)"/>${env(20, 120, 'var(--sun-soft)')}${env(236, 120, 'var(--sun-soft)')}<path d="M142 86L70 124M178 86l72 38" stroke="var(--sun)" stroke-width="3" stroke-dasharray="5 5"/>`,
    signature: `${box(24, 26, 128, 150, 'var(--paper)')}${T(44, 54, 'WANTED', 'a-mid')}${box(42, 70, 92, 50, 'var(--coral-soft)')}${T(52, 101, 'OR 1=1', 'a-mono')}${T(44, 156, 'Signature', 'a-t')}${box(168, 26, 128, 150, 'var(--paper)')}<path d="M184 140l18-14 18 6 18-20 18 4" stroke="var(--teal)" stroke-width="3" fill="none"/><path d="M256 116l16-72" stroke="var(--coral)" stroke-width="3"/><circle cx="272" cy="44" r="6" fill="var(--coral)"/>${T(188, 168, 'Anomaly', 'a-t')}`,
    ips: `${env(16, 80, 'var(--sun-soft)')}<path d="M84 101h40" stroke="var(--ink)" stroke-width="2.5"/>${box(130, 50, 70, 100, 'var(--teal)')}${T(146, 108, 'IPS', 'a-mid a-light')}<path d="M206 101h36" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="4 4"/><circle cx="270" cy="101" r="26" fill="var(--coral-soft)" stroke="var(--coral)" stroke-width="4"/><path d="M252 83l36 36" stroke="var(--coral)" stroke-width="5"/>${T(110, 184, 'Sits in the path. Can block.')}`,
    castle: `<rect x="10" y="150" width="300" height="24" rx="12" fill="var(--sky)"/>${T(18, 168, 'moat: training', 'a-t a-small')}<rect x="40" y="60" width="240" height="92" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>${[40, 80, 120, 160, 200, 240].map(x => `<rect x="${x}" y="48" width="20" height="14" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>`).join('')}${T(50, 84, 'wall: firewall', 'a-t a-small')}<rect x="110" y="96" width="100" height="56" fill="var(--sun-soft)" stroke="var(--ink)" stroke-width="2"/>${T(118, 116, 'guards: IPS', 'a-t a-small')}<rect x="140" y="122" width="40" height="30" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/>${T(222, 116, 'vault: MFA', 'a-t a-small')}`,
  };
  return svg('0 0 320 200', A[key], key);
}
