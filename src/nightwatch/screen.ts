// Night Watch screens: the hub and the level player.

import { award, persist, store } from '../state';
import { config, serverPost, trackingOn } from '../tracker';
import { $, confetti, esc, modal, sfx, toast } from '../ui';
import { CHAPTERS } from '../content';
import { DetectLevel, LogLevel, NETWORK, NW_LEVELS, NwLevel, RulesLevel, nwBase } from './levels';
import { fwDecide, idsDecide, parseFirewall, parseIds } from './engine';

type Go = (route: string) => void;

export function nightWatchOpen(): boolean {
  const c = config() as { nightWatchOpen?: boolean };
  return c.nightWatchOpen === true || store.progress.done.length >= CHAPTERS.length;
}

function badge(id: string): void { const b = award(id); if (b) { sfx.badge(); toast(`Badge unlocked: <b>${b}</b>`, 'badge'); } }

const nwPoints = (): number => NW_LEVELS.reduce((a, l) => a + (store.progress.best[l.id] || 0), 0);
const maxNw = (): number => NW_LEVELS.reduce((a, l) => a + nwBase(l.num), 0);

const KIND: Record<NwLevel['kind'], string> = { rules: 'Firewall rules', log: 'Log hunt', detect: 'Detection rule' };

export function showNightWatch(app: HTMLElement, go: Go): void {
  const p = store.progress;
  if (!nightWatchOpen()) {
    app.innerHTML = `<section class="nw"><div class="nw-hero"><p class="eyebrow nw-eye">After graduation</p><h1>Night Watch is locked</h1>
      <p>Night Watch opens after you protect all 8 places in Byteville and graduate. Then the real night shift begins: harder levels, no multiple choice.</p>
      <button class="btn btn-primary" id="nwBack">Back to the town map</button></div></section>`;
    $('#nwBack').addEventListener('click', () => go('map'));
    return;
  }
  if (!trackingOn()) {
    app.innerHTML = `<section class="nw"><div class="nw-hero"><p class="eyebrow nw-eye">Needs the class server</p><h1>Night Watch is offline</h1>
      <p>Night Watch answers are checked on your teacher's server, so the game itself never contains them. Ask your teacher to connect the class server, then come back.</p>
      <button class="btn btn-primary" id="nwBack">Back to the town map</button></div></section>`;
    $('#nwBack').addEventListener('click', () => go('map'));
    return;
  }
  const solved = p.nwSolved.length;
  app.innerHTML = `<section class="nw">
    <div class="nw-hero">
      <svg class="nw-moon" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30" fill="#FFE7B8"/><circle cx="54" cy="30" r="26" fill="var(--night)"/></svg>
      <p class="eyebrow nw-eye">Advanced · 12 levels</p>
      <h1>Byteville: Night Watch</h1>
      <p class="nw-lead">The town is asleep. You are not. No multiple choice here: you write the firewall rules, read the raw logs, and tune the alarms yourself. Solve a level to get its passcode and unlock the next one.</p>
      <div class="nw-stats"><span><b>${solved}</b>/12 solved</span><span><b>${nwPoints()}</b>/${maxNw()} points</span></div>
    </div>
    <div class="nw-grid">
      <div class="nw-levels">${NW_LEVELS.map(l => {
        const done = p.nwSolved.includes(l.id);
        const open = l.num <= p.nwUnlocked;
        return `<button class="nw-tile${done ? ' done' : ''}${open ? '' : ' locked'}" data-l="${l.num}" ${open ? '' : 'disabled'}>
          <span class="nw-num">${String(l.num).padStart(2, '0')}</span>
          <span class="nw-title">${esc(l.title)}</span>
          <span class="nw-kind">${KIND[l.kind]} · ${esc(l.skill)}</span>
          <span class="nw-foot">${done ? `<b>Solved</b> · ${p.best[l.id]} pts` : open ? `Worth ${nwBase(l.num)} pts` : 'Locked'}</span></button>`;
      }).join('')}</div>
      <aside class="nw-side">
        <div class="nw-card"><h3>Have a passcode?</h3><p class="small">On a new computer, type the passcode from your last solved level to jump back in.</p>
          <form id="pcForm" class="pc-row"><label for="pcIn" class="sr">Passcode</label><input id="pcIn" placeholder="word-word" autocomplete="off"><button class="btn btn-small btn-primary">Unlock</button></form>
          <p class="small" id="pcMsg" aria-live="polite"></p></div>
        <div class="nw-card"><h3>Byteville network</h3>${netTable()}</div>
        <div class="nw-card"><h3>Scoring</h3><p class="small">Each level is worth more than the last. Each hint costs a quarter of the level's points. Each wrong try costs 5 points. Only your best score counts.</p></div>
      </aside>
    </div></section>`;
  app.querySelectorAll<HTMLButtonElement>('.nw-tile').forEach(b => b.addEventListener('click', () => playLevel(app, go, NW_LEVELS[Number(b.dataset.l) - 1])));
  $('#pcForm').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#pcMsg');
    const v = ($('#pcIn') as HTMLInputElement).value.trim().toLowerCase().slice(0, 40);
    if (!v) return;
    msg.textContent = 'Checking...';
    const r = await serverPost<{ level?: number; message?: string }>({ action: 'nwpass', code: v });
    if (!r) { msg.textContent = 'Cannot reach the class server. Check your Internet and try again.'; return; }
    if (!r.level) { msg.textContent = r.message || 'That passcode is not right. Check the spelling.'; sfx.wrong(); return; }
    const next = Math.min(NW_LEVELS.length, r.level + 1);
    if (next > p.nwUnlocked) { p.nwUnlocked = next; persist(); }
    sfx.right();
    showNightWatch(app, go);
    toast(`Unlocked up to level ${next}.`);
  });
}

function netTable(): string {
  return `<table class="net">${NETWORK.map(([a, d]) => `<tr><td class="mono">${a}</td><td>${esc(d)}</td></tr>`).join('')}</table>`;
}

const FW_HELP = `<pre class="syntax">allow|block  proto  source -> destination  port  [established]</pre>
<ul class="small tight"><li><b>proto</b>: tcp, udp, icmp, or any</li><li><b>source, destination</b>: any, an IP, or a block like 10.0.2.0/24</li>
<li><b>port</b>: any, 443, or 80,443</li><li><b>established</b> (optional): match only replies</li><li>Read top to bottom. <b>First match wins.</b></li><li>Lines starting with # are notes.</li></ul>`;
const IDS_HELP = `<pre class="syntax">alert tcp any any -> $HOME_NET 80 (msg:"..."; content:"..."; nocase; sid:1000001;)</pre>
<ul class="small tight"><li><b>content</b>: text that must appear in the traffic</li><li><b>nocase</b>: ignore upper and lower case for the content before it</li>
<li>More than one content: all of them must appear</li><li><b>$HOME_NET</b> means our servers, 10.0.1.0/24</li></ul>`;

function playLevel(app: HTMLElement, go: Go, lv: NwLevel): void {
  const p = store.progress;
  let tries = 0;
  let hints = p.nwHints[lv.id] || 0;
  let solved = false;
  let t0 = performance.now();
  const started = Date.now();
  void t0;

  const body = lv.kind === 'log' ? logBody(lv) : `
    <label class="nw-label" for="ed">${lv.kind === 'rules' ? 'Your firewall rules' : 'Your detection rule'}${lv.kind === 'rules' && lv.maxRules ? ` <span class="muted">(max ${lv.maxRules} rules)</span>` : ''}</label>
    <textarea id="ed" class="editor" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${lv.kind === 'rules' ? 9 : 5}">${esc(lv.starter)}</textarea>
    <div class="row-gap"><button class="btn btn-primary" id="run">Run tests</button><button class="btn btn-small btn-ghost" id="reset">Reset to start</button></div>`;

  app.innerHTML = `<section class="nw nw-play">
    <div class="nw-bar"><button class="btn btn-small" id="back">&larr; Night Watch</button>
      <div><small>Level ${lv.num} · ${KIND[lv.kind]}</small><b>${esc(lv.title)}</b></div><span class="nw-worth">Worth <b id="worth">${worth()}</b> pts</span></div>
    <div class="nw-mission"><p>${esc(lv.story)}</p>${taskHtml(lv.task)}</div>
    <div class="nw-work">
      <div class="nw-main">${body}<div id="msg" class="nw-msg" aria-live="polite"></div><div id="results"></div></div>
      <aside class="nw-side">
        ${lv.kind !== 'log' ? `<div class="nw-card"><h3>How to write it</h3>${lv.kind === 'rules' ? FW_HELP : IDS_HELP}</div>` : ''}
        <div class="nw-card"><h3>Hints</h3><div id="hints">${hintHtml()}</div></div>
        <div class="nw-card"><h3>Network</h3>${netTable()}</div>
      </aside>
    </div></section>`;

  function worth(): number {
    const b = nwBase(lv.num);
    return Math.max(Math.round(b * 0.25), Math.round(b * (1 - 0.25 * hints)) - 5 * tries);
  }
  function hintHtml(): string {
    return lv.hints.map((h, i) => i < hints ? `<p class="hint-open"><b>Hint ${i + 1}:</b> ${esc(h)}</p>` : '').join('') +
      (hints < 2 && !solved ? `<button class="btn btn-small" id="hintBtn">Show hint ${hints + 1} (costs ${Math.round(nwBase(lv.num) * 0.25)} pts)</button>` : '');
  }
  function wireHint(): void {
    const b = document.getElementById('hintBtn');
    if (b) b.addEventListener('click', () => {
      hints++; p.nwHints[lv.id] = Math.max(p.nwHints[lv.id] || 0, hints); persist();
      $('#hints').innerHTML = hintHtml(); $('#worth').textContent = String(worth()); wireHint();
    });
  }
  wireHint();
  $('#back').addEventListener('click', () => showNightWatch(app, go));

  const msg = $('#msg');
  const say = (html: string, kind: 'ok' | 'no' | 'info') => { msg.className = 'nw-msg ' + kind; msg.innerHTML = html; };

  let checking = false;
  interface Reply { ok?: boolean; points?: number; passcode?: string; wait?: boolean; message?: string; error?: string }
  async function submit(submission: string, localOk: boolean | null): Promise<void> {
    if (checking || solved) return;
    checking = true;
    const btn = document.querySelector<HTMLButtonElement>('#run, #ansForm button');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent || ''; btn.textContent = 'Checking...'; }
    const r = await serverPost<Reply>({ action: 'nwcheck', level: lv.id, submission: submission.slice(0, 4000), hints });
    checking = false;
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Check'; }
    if (!r || r.error) { say('Cannot reach the class server. Check your Internet and try again.', 'no'); return; }
    if (r.wait) { say(esc(r.message || 'Wait a moment and try again.'), 'info'); return; }
    if (!r.ok) {
      tries++;
      $('#worth').textContent = String(worth());
      sfx.wrong();
      if (localOk === null) say(`<b>"${esc(submission)}" is not it.</b> Look again. Each wrong try costs 5 points.`, 'no');
      else if (localOk) say('The class server did not accept this one. Check the rule limit and try again.', 'no');
      return;
    }
    solved = true;
    const pts = r.points || 0;
    const prev = p.best[lv.id] || 0;
    p.best[lv.id] = Math.max(prev, pts);
    p.points = Object.values(p.best).reduce((x, y) => x + y, 0);
    if (!p.nwSolved.includes(lv.id)) p.nwSolved.push(lv.id);
    p.nwUnlocked = Math.max(p.nwUnlocked, Math.min(NW_LEVELS.length, lv.num + 1));
    p.playMs += Date.now() - started;
    persist();
    if (localOk === null) say(`<b>Correct: ${esc(submission)}.</b>`, 'ok');
    badge('nw-first');
    if (p.nwSolved.length >= 6) badge('nw-half');
    if (lv.num >= 7 && hints === 0) badge('nw-clean');
    const all = p.nwSolved.length === NW_LEVELS.length;
    if (all) badge('nw-all');
    sfx.win(); confetti();
    const next = NW_LEVELS[lv.num];
    modal(`<p class="eyebrow">Level ${lv.num} solved</p><h3>${esc(lv.title)}: cleared!</h3>
      <p><b>${pts} points</b>, checked by the class server. ${tries ? `${tries} wrong ${tries === 1 ? 'try' : 'tries'}` : 'First try'}${hints ? `, ${hints} hint${hints > 1 ? 's' : ''}` : ', no hints'}.</p>
      <div class="passcode">Passcode for the next level: <b>${esc(r.passcode || '')}</b></div>
      <p class="small muted">Write it down. It unlocks level ${Math.min(12, lv.num + 1)} on any computer.</p>${all ? '<p><b>You solved all 12. You are a Byteville Sentinel.</b></p>' : ''}`,
      next ? [{ label: `Next: ${next.title}`, primary: true, onClick: () => playLevel(app, go, next) }, { label: 'Night Watch', onClick: () => showNightWatch(app, go) }]
        : [{ label: 'Back to Night Watch', primary: true, onClick: () => showNightWatch(app, go) }]);
  }

  /* ----- rules levels ----- */
  if (lv.kind === 'rules' || lv.kind === 'detect') {
    const ed = $('#ed') as HTMLTextAreaElement;
    $('#reset').addEventListener('click', () => { ed.value = lv.starter; say('', 'info'); $('#results').innerHTML = ''; });
    ed.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('#run').click(); } });
    $('#run').addEventListener('click', () => {
      if (solved) return;
      if (lv.kind === 'rules') runRules(lv, ed.value); else runDetect(lv, ed.value);
    });
  } else {
    wireLog(lv);
  }

  function runRules(L: RulesLevel, src: string): void {
    const { rules, errors } = parseFirewall(src);
    if (errors.length) { say(`<b>Fix this first:</b><br>${errors.map(esc).join('<br>')}`, 'no'); $('#results').innerHTML = ''; return; }
    if (!rules.length) { say('Write at least one rule.', 'no'); return; }
    const res = L.packets.map(pk => ({ pk, ...fwDecide(rules, pk) }));
    const right = res.filter(r => r.got === r.pk.want).length;
    const tooMany = L.maxRules !== undefined && rules.length > L.maxRules;
    $('#results').innerHTML = `<div class="tw"><table class="res"><thead><tr><th>Test packet</th><th>Traffic</th><th>Should</th><th>Got</th><th>Rule</th></tr></thead><tbody>
      ${res.map(r => `<tr class="${r.got === r.pk.want ? 'pass' : 'fail'}"><td>${esc(r.pk.label)}</td>
        <td class="mono small">${r.pk.proto.toUpperCase()} ${r.pk.src} &rarr; ${r.pk.dst}${r.pk.proto === 'icmp' ? '' : ':' + r.pk.port}${r.pk.state === 'est' ? ' <span class="tag">reply</span>' : ''}</td>
        <td>${r.pk.want}</td><td><b>${r.got}</b></td><td>${r.by >= 0 ? `#${r.by + 1}` : '<span class="muted">none</span>'}</td></tr>`).join('')}</tbody></table></div>`;
    const ok = right === res.length && !tooMany;
    if (ok) say(`<b>All ${res.length} packets handled correctly.</b>`, 'ok');
    else if (right === res.length && tooMany) say(`Every packet is right, but you used ${rules.length} rules. The limit is ${L.maxRules}. Combine some.`, 'no');
    else say(`<b>${right} of ${res.length}</b> packets handled correctly. Look at the red rows: which rule decided them?`, 'no');
    void submit(src, ok);
  }

  function runDetect(L: DetectLevel, src: string): void {
    const { rules, errors } = parseIds(src);
    if (errors.length) { say(`<b>Fix this first:</b><br>${errors.map(esc).join('<br>')}`, 'no'); $('#results').innerHTML = ''; return; }
    if (!rules.length) { say('Write at least one rule.', 'no'); return; }
    const res = L.events.map(ev => ({ ev, ...idsDecide(rules, ev) }));
    const missed = res.filter(r => r.ev.want === 'alert' && r.got === 'quiet').length;
    const noisy = res.filter(r => r.ev.want === 'quiet' && r.got === 'alert').length;
    $('#results').innerHTML = `<div class="tw"><table class="res"><thead><tr><th>Traffic to the web server</th><th>Should</th><th>Got</th></tr></thead><tbody>
      ${res.map(r => `<tr class="${r.got === r.ev.want ? 'pass' : 'fail'}"><td><span class="small muted">${esc(r.ev.label)}</span><br><span class="mono small">${esc(r.ev.payload)}</span></td><td>${r.ev.want}</td><td><b>${r.got}</b></td></tr>`).join('')}</tbody></table></div>`;
    const ok = missed === 0 && noisy === 0;
    if (ok) say('<b>Every attack caught, zero false alarms.</b>', 'ok');
    else say(`${missed ? `<b>${missed} missed attack${missed > 1 ? 's' : ''}</b> (false negatives). ` : ''}${noisy ? `<b>${noisy} false alarm${noisy > 1 ? 's' : ''}</b> (false positives).` : ''}`, 'no');
    void submit(src, ok);
  }

  function wireLog(L: LogLevel): void {
    const view = $('#logView');
    const count = $('#logCount');
    const draw = (q: string) => {
      const needle = q.trim().toLowerCase();
      const lines = needle ? L.log.filter(l => l.toLowerCase().includes(needle)) : L.log;
      view.textContent = lines.join('\n') || '(no lines match)';
      count.textContent = `Showing ${lines.length} of ${L.log.length} lines`;
    };
    draw('');
    const f = $('#logFilter') as HTMLInputElement;
    f.addEventListener('input', () => draw(f.value));
    $('#ansForm').addEventListener('submit', e => {
      e.preventDefault();
      if (solved) return;
      const v = ($('#ans') as HTMLInputElement).value.trim().toLowerCase().replace(/\s+/g, '');
      if (!v) return;
      void submit(v.slice(0, 60), null);
    });
  }
}

function taskHtml(task: string): string {
  const parts = task.split(/\s*\(\d+\)\s*/);
  if (parts.length < 3) return `<p class="nw-task"><b>Your task:</b> ${esc(task)}</p>`;
  return `<p class="nw-task"><b>Your task:</b> ${esc(parts[0])}</p><ol class="nw-list">${parts.slice(1).map(x => `<li>${esc(x.replace(/\.$/, ''))}</li>`).join('')}</ol>`;
}

function logBody(L: LogLevel): string {
  return `<div class="log-tools"><label for="logFilter" class="nw-label">Filter (shows only lines that contain this text)</label>
    <input id="logFilter" class="log-filter" placeholder="try: DROP" autocomplete="off" spellcheck="false"></div>
    <div class="log-box"><div class="log-head mono">${esc(L.header)}</div><pre id="logView" class="log-view" tabindex="0"></pre></div>
    <p class="small muted" id="logCount"></p>
    <form id="ansForm" class="ans-row"><label for="ans" class="nw-label">${esc(L.question)}</label>
      <div class="pc-row"><input id="ans" placeholder="${esc(L.placeholder)}" autocomplete="off" spellcheck="false"><button class="btn btn-primary">Check answer</button></div></form>`;
}
