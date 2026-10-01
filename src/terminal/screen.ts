// Control Room: hub page and the terminal level player.

import { award, persist, store } from '../state';
import { serverPost, trackingOn } from '../tracker';
import { $, confetti, esc, modal, sfx, toast } from '../ui';
import { nightWatchOpen } from '../nightwatch/screen';
import { OP_LEVELS, OpLevel, opBase } from './levels';
import { TDATA } from './data.generated';
import { createShell } from './shell';
import { OP10_START, UfwState } from './ufw';

type Go = (route: string) => void;

function badge(id: string): void { const b = award(id); if (b) { sfx.badge(); toast(`Badge unlocked: <b>${b}</b>`, 'badge'); } }

export function showControlRoom(app: HTMLElement, go: Go): void {
  const p = store.progress;
  const gate = (title: string, msg: string) => {
    app.innerHTML = `<section class="nw"><div class="nw-hero"><p class="eyebrow nw-eye">Control Room</p><h1>${title}</h1><p>${msg}</p>
      <button class="btn btn-primary" id="crBack">Back to the town map</button></div></section>`;
    $('#crBack').addEventListener('click', () => go('map'));
  };
  if (!nightWatchOpen()) return gate('The Control Room is locked', 'It opens after you protect all 8 places in Byteville and graduate.');
  if (!trackingOn()) return gate('The Control Room is offline', 'Answers here are checked on your teacher\'s server. Ask your teacher to connect it, then come back.');
  const done = p.opSolved.length;
  const pts = OP_LEVELS.reduce((a, l) => a + (p.best[l.id] || 0), 0);
  const max = OP_LEVELS.reduce((a, l) => a + opBase(l.num), 0);
  app.innerHTML = `<section class="nw cr">
    <div class="nw-hero">
      <p class="eyebrow nw-eye">Advanced · 10 levels · real commands</p>
      <h1>Byteville Control Room</h1>
      <p class="nw-lead">You are logged in to <span class="mono">web01</span>, the server behind the school website. Use a real Linux-style command line to read logs, check the network, and lock the server down. Every solved level gives you a password for the next one.</p>
      <div class="nw-stats"><span><b>${done}</b>/10 solved</span><span><b>${pts}</b>/${max} points</span></div>
      <pre class="cr-sample" aria-hidden="true"><span class="ps">defender@web01:~$</span> ls -a
.  ..  .bashrc  .shift_note  README  backup/  notes.txt
<span class="ps">defender@web01:~$</span> sudo ufw status
Status: inactive</pre>
    </div>
    <div class="nw-grid">
      <div class="nw-levels">${OP_LEVELS.map(l => {
        const solved = p.opSolved.includes(l.id);
        const open = l.num <= p.opUnlocked;
        return `<button class="nw-tile${solved ? ' done' : ''}${open ? '' : ' locked'}" data-l="${l.num}" ${open ? '' : 'disabled'}>
          <span class="nw-num">LEVEL ${String(l.num).padStart(2, '0')}</span><span class="nw-title">${esc(l.title)}</span>
          <span class="nw-kind">${esc(l.skill)}</span>
          <span class="nw-foot">${solved ? `<b>Solved</b> · ${p.best[l.id]} pts` : open ? `Worth ${opBase(l.num)} pts` : 'Locked'}</span></button>`;
      }).join('')}</div>
      <aside class="nw-side">
        <div class="nw-card"><h3>Have a level password?</h3><p class="small">Type the password from your last solved level to continue on any computer.</p>
          <form id="opForm" class="pc-row"><label for="opIn" class="sr">Level password</label><input id="opIn" placeholder="word-word-00" autocomplete="off"><button class="btn btn-small btn-primary">Unlock</button></form>
          <p class="small" id="opMsg" aria-live="polite"></p></div>
        <div class="nw-card"><h3>New to the command line?</h3><p class="small">Type <span class="mono">help</span> to see every command, and <span class="mono">man grep</span> to learn one. Press Tab to finish file names and the Up arrow to repeat a command.</p></div>
        <div class="nw-card"><h3>Is this real?</h3><p class="small">No. web01 is a simulation that runs in your browser. Its files, addresses and attackers are made up for practice. Nothing you type reaches a real computer.</p></div>
      </aside>
    </div></section>`;
  app.querySelectorAll<HTMLButtonElement>('.nw-tile').forEach(b => b.addEventListener('click', () => playOp(app, go, OP_LEVELS[Number(b.dataset.l) - 1])));
  $('#opForm').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#opMsg');
    const v = ($('#opIn') as HTMLInputElement).value.trim().toLowerCase().slice(0, 40);
    if (!v) return;
    msg.textContent = 'Checking...';
    const r = await serverPost<{ level?: number; message?: string }>({ action: 'nwpass', track: 'op', code: v });
    if (!r) { msg.textContent = 'Cannot reach the class server. Check your Internet and try again.'; return; }
    if (!r.level) { msg.textContent = r.message || 'That password is not right.'; sfx.wrong(); return; }
    const next = Math.min(OP_LEVELS.length, r.level + 1);
    if (next > p.opUnlocked) { p.opUnlocked = next; persist(); }
    sfx.right(); showControlRoom(app, go); toast(`Unlocked up to level ${next}.`);
  });
}

function startUfw(lv: OpLevel): UfwState {
  if (lv.id === 'op7') return { enabled: false, defIn: 'allow', rules: [] };
  return JSON.parse(JSON.stringify(OP10_START)) as UfwState;
}

function playOp(app: HTMLElement, go: Go, lv: OpLevel): void {
  const p = store.progress;
  let hints = p.opHints[lv.id] || 0;
  let tries = 0;
  let solved = false;
  let busy = false;
  const started = Date.now();
  const ufw = startUfw(lv);

  app.innerHTML = `<section class="nw cr-play">
    <div class="nw-bar"><button class="btn btn-small" id="back">&larr; Control Room</button>
      <div><small>Control Room · Level ${lv.num}</small><b>${esc(lv.title)}</b></div><span class="nw-worth">Worth <b id="worth"></b> pts</span></div>
    <div class="cr-work">
      <div class="term" id="term">
        <div class="term-top"><i></i><i></i><i></i><span>defender@web01 · ssh</span></div>
        <div class="term-out" id="out" role="log" aria-live="polite"></div>
        <form class="term-line" id="lineForm" autocomplete="off"><label for="cmd" class="ps" id="ps1"></label><input id="cmd" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Command"></form>
      </div>
      <aside class="nw-side">
        <div class="nw-card"><h3>Mission</h3><p class="small">${esc(lv.mission)}</p>${lv.ask ? `<p class="small"><b class="gold">Goal:</b> ${esc(lv.ask)}</p>` : `<p class="small"><b class="gold">Goal:</b> when you think it is right, type <span class="mono">submit</span>.</p>`}</div>
        <div class="nw-card"><h3>Commands for this level</h3><ul class="cmd-list">${lv.commands.map(([c, d]) => `<li><button class="cmd-chip" data-cmd="${esc(c)}">${esc(c)}</button><span>${esc(d)}</span></li>`).join('')}</ul></div>
        <div class="nw-card"><h3>Hints</h3><div id="hints"></div></div>
      </aside>
    </div></section>`;

  const out = $('#out');
  const input = $('#cmd') as HTMLInputElement;
  const ps1 = $('#ps1');
  const worth = () => { const b = opBase(lv.num); return Math.max(Math.round(b * 0.25), Math.round(b * (1 - 0.25 * hints)) - 5 * tries); };
  const updWorth = () => { $('#worth').textContent = String(worth()); };
  updWorth();

  const print = (text: string, cls = '') => {
    if (!text) return;
    const el = document.createElement('pre');
    el.className = 'tl ' + cls;
    el.textContent = text;
    out.appendChild(el);
    while (out.childElementCount > 1500) out.firstElementChild?.remove();
    out.scrollTop = out.scrollHeight;
  };
  const mission = () => `MISSION (level ${lv.num}): ${lv.mission}\n${lv.ask ? 'GOAL: ' + lv.ask : 'GOAL: set it up, then type  submit'}`;
  const hintText = () => hints ? lv.hints.slice(0, hints).map((h, i) => `Hint ${i + 1}: ${h}`).join('\n') : 'No hints opened yet. Use the Hints box on the right (each costs points).';

  function drawHints(): void {
    $('#hints').innerHTML = lv.hints.map((h, i) => i < hints ? `<p class="hint-open"><b>Hint ${i + 1}:</b> ${esc(h)}</p>` : '').join('') +
      (hints < 2 && !solved ? `<button class="btn btn-small" id="hintBtn">Show hint ${hints + 1} (costs ${Math.round(opBase(lv.num) * 0.25)} pts)</button>` : '');
    const b = document.getElementById('hintBtn');
    if (b) b.addEventListener('click', () => { hints++; p.opHints[lv.id] = Math.max(p.opHints[lv.id] || 0, hints); persist(); drawHints(); updWorth(); });
  }
  drawHints();

  async function onSubmit(arg: string): Promise<string> {
    if (solved) return 'Already solved. Head back to the Control Room for the next level.';
    if (busy) return '';
    let submission = arg.trim();
    if (lv.kind === 'answer' && !submission) return `Usage: submit ANSWER\n${lv.ask || ''}`;
    if (lv.kind === 'ufw') submission = JSON.stringify(ufw);
    if (lv.kind === 'chmod') submission = JSON.stringify({ mode: shell.fileMode('/home/defender/backup/passwords.txt') });
    busy = true;
    print('Checking with the class server...', 'dim');
    const r = await serverPost<{ ok?: boolean; points?: number; passcode?: string; failed?: string[]; wait?: boolean; message?: string; error?: string }>(
      { action: 'nwcheck', level: lv.id, submission: submission.slice(0, 4000), hints });
    busy = false;
    if (!r || r.error) return 'submit: cannot reach the class server. Check your Internet and try again.';
    if (r.wait) return 'submit: ' + (r.message || 'Wait a moment and try again.');
    if (!r.ok) {
      tries++; updWorth(); sfx.wrong();
      const lines = (r.failed || []).map(f => '  FAIL  ' + f).join('\n');
      return lv.kind === 'answer' ? `Not correct. Keep investigating. (-5 points)` : `Not yet. These checks failed:\n${lines || '  (see the mission)'}\nFix it and submit again. (-5 points)`;
    }
    solved = true;
    const pts = r.points || 0;
    p.best[lv.id] = Math.max(p.best[lv.id] || 0, pts);
    p.points = Object.values(p.best).reduce((a, b) => a + b, 0);
    if (!p.opSolved.includes(lv.id)) p.opSolved.push(lv.id);
    p.opUnlocked = Math.max(p.opUnlocked, Math.min(OP_LEVELS.length, lv.num + 1));
    p.playMs += Date.now() - started;
    persist();
    drawHints();
    badge('op-first');
    if (p.opSolved.length === OP_LEVELS.length) badge('op-all');
    sfx.win(); confetti();
    const next = OP_LEVELS[lv.num];
    setTimeout(() => modal(`<p class="eyebrow">Control Room · Level ${lv.num}</p><h3>${esc(lv.title)}: solved!</h3>
      <p><b>${pts} points</b>, checked by the class server.</p>
      ${next ? `<div class="passcode">Password for the next level: <b>${esc(r.passcode || '')}</b></div>
      <p class="small muted">Write it down. It unlocks level ${lv.num + 1} on any computer.</p>` : '<p><b>You finished the Control Room. web01 is locked down.</b></p>'}`,
      next ? [{ label: `Next: ${next.title}`, primary: true, onClick: () => playOp(app, go, next) }, { label: 'Control Room', onClick: () => showControlRoom(app, go) }]
        : [{ label: 'Back to the Control Room', primary: true, onClick: () => showControlRoom(app, go) }]), 600);
    return next ? `ACCESS GRANTED. Level ${lv.num} solved for ${pts} points.\nPassword for level ${lv.num + 1}: ${r.passcode || ''}` : `ACCESS GRANTED. Level ${lv.num} solved for ${pts} points.\nYou finished the Control Room.`;
  }

  const shell = createShell({
    data: TDATA, ufw, onSubmit, onMission: mission, onHint: hintText,
    onReset: () => { playOp(app, go, lv); },
    onClear: () => { out.innerHTML = ''; },
  });

  let hIdx = -1;
  const setPrompt = () => { ps1.textContent = shell.prompt(); };
  setPrompt();
  print(`Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-45-generic x86_64)\n\n  This is a SIMULATED server for training. Nothing here is real.\n\nLast login: Tue Oct  6 21:02:11 2026 from 10.0.5.20\nType  help  for commands,  mission  to see your task.\n`, 'dim');
  print(mission(), 'gold');

  $('#lineForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const line = input.value;
    input.value = '';
    hIdx = -1;
    print(shell.prompt() + line, 'cmdline');
    const res = await shell.run(line);
    if (document.body.contains(out)) { print(res); setPrompt(); input.focus(); }
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); const h = shell.history; if (!h.length) return; hIdx = hIdx < 0 ? h.length - 1 : Math.max(0, hIdx - 1); input.value = h[hIdx]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); const h = shell.history; if (hIdx < 0) return; hIdx++; if (hIdx >= h.length) { hIdx = -1; input.value = ''; } else input.value = h[hIdx]; }
    else if (e.key === 'Tab') { e.preventDefault(); input.value = shell.complete(input.value); }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    else if (e.key === 'c' && e.ctrlKey && !window.getSelection()?.toString()) { e.preventDefault(); print(shell.prompt() + input.value + '^C', 'cmdline'); input.value = ''; }
  });
  $('#term').addEventListener('click', () => { if (!window.getSelection()?.toString()) input.focus(); });
  app.querySelectorAll<HTMLButtonElement>('.cmd-chip').forEach(b => b.addEventListener('click', () => {
    const c = b.dataset.cmd || '';
    input.value = c.replace(/ (FILE|ANSWER|HOST|IP|DIR|TEXT|\.NAME)$/, ' ').replace(/^A \| B$/, '');
    input.focus();
  }));
  $('#back').addEventListener('click', () => showControlRoom(app, go));
  input.focus();
}
