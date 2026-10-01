import { PORT_NAMES } from '../content';
import { LaneStage, Packet, StageContext } from '../types';
import { award, store, persist } from '../state';
import { esc, sfx, modal, modalOpen, floatPoints, toast } from '../ui';
import { stageHead } from './common';

export function runLane(root: HTMLElement, st: LaneStage, ctx: StageContext): void {
  const packets: Packet[] = st.packets();
  let k = 0;
  let raf = 0;
  let t0 = 0;
  let busy = true;
  let el: HTMLElement | null = null;
  let paused = false;

  const icon = (kind: string) => kind === 'allow' ? 'ALLOW' : kind === 'alert' ? 'CHECK' : 'BLOCK';
  root.innerHTML = stageHead(st.title, st.intro, `1 / ${packets.length}`) + `
  <div class="lane-grid">
    <div class="lane-main">
      <div class="lane" aria-live="polite">
        <span class="lane-label l">${esc(st.left)}</span><span class="lane-label r">${esc(st.right)}</span>
        <div class="wall"><span>${esc(st.wall)}</span></div>
        <div class="school" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="timer"><i></i></div>
      </div>
      <div class="lane-actions">
        <button class="act act-yes" data-a="1">${esc(st.yes)}<small>key A</small></button>
        <button class="act act-no" data-a="0">${esc(st.no)}<small>key B</small></button>
      </div>
      <div class="lane-note" aria-live="polite">Read the packet, check the rules, then decide.</div>
    </div>
    <aside class="rulebook">
      <h3>Your rules</h3>
      <ol>${st.rules.map(r => `<li><span class="rk ${r.kind}">${icon(r.kind)}</span>${esc(r.text)}</li>`).join('')}</ol>
      ${(st.chips || []).map(c => `<div class="chips"><b>${esc(c.label)}</b>${c.values.map(v => `<span class="chip">${esc(v)}</span>`).join('')}</div>`).join('')}
      <p class="small muted">Checked from top to bottom. First match wins.</p>
    </aside>
  </div>`;

  const lane = root.querySelector('.lane') as HTMLElement;
  const timer = root.querySelector('.timer i') as HTMLElement;
  const note = root.querySelector('.lane-note') as HTMLElement;
  const count = root.querySelector('.stage-count') as HTMLElement;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.act'));

  const next = () => {
    if (!document.body.contains(lane)) return cleanup();
    if (k >= packets.length) { cleanup(); return ctx.done(); }
    const p = packets[k];
    count.textContent = `${k + 1} / ${packets.length}`;
    el = document.createElement('div');
    el.className = 'pkt' + (p.golden ? ' golden' : '');
    el.innerHTML = `${p.golden ? '<span class="gold-tag">GOLD x3</span>' : ''}
      <div class="pk-row"><span>FROM</span><b>${esc(p.from)}</b> <em>${esc(p.who)}</em></div>
      <div class="pk-row"><span>PORT</span><b>${p.port}</b> <em>${esc(PORT_NAMES[p.port] || '')}</em></div>
      ${p.msg ? `<div class="pk-msg">${esc(p.msg)}</div>` : ''}`;
    lane.appendChild(el);
    busy = false;
    buttons.forEach(b => (b.disabled = false));
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const tick = (now: number) => {
    if (busy || !el) return;
    if (!document.body.contains(lane)) return cleanup();
    if (paused || modalOpen()) { t0 += 16; raf = requestAnimationFrame(tick); return; }
    const f = Math.min(1, (now - t0) / (st.seconds * 1000));
    const wall = (root.querySelector('.wall') as HTMLElement).offsetLeft;
    const max = Math.max(8, wall - el.offsetWidth - 10);
    el.style.left = `${8 + (max - 8) * f}px`;
    timer.style.width = `${(1 - f) * 100}%`;
    timer.classList.toggle('low', f > 0.7);
    if (f >= 1) { decide(null); return; }
    raf = requestAnimationFrame(tick);
  };

  const decide = (yes: boolean | null) => {
    if (busy || !el) return;
    busy = true;
    cancelAnimationFrame(raf);
    buttons.forEach(b => (b.disabled = true));
    const p = packets[k];
    const ms = performance.now() - t0;
    const ok = yes === p.allow;
    const speed = ok ? Math.max(0, Math.round(15 * (1 - ms / (st.seconds * 1000)))) : 0;
    const gold = ok && p.golden ? 30 : 0;
    const pts = ctx.answer({ itemId: `${ctx.chapter.id}-lane-${p.cat}`, prompt: `${p.from} port ${p.port}${p.msg ? ' msg: ' + p.msg : ''}`,
      choice: yes === null ? 'too slow' : yes ? st.yes : st.no, correctAnswer: p.allow ? st.yes : st.no, correct: ok, timeMs: ms, bonus: speed + gold });
    if (ok && ms < 4000) { store.progress.quick++; persist(); if (store.progress.quick >= 5) { const b = award('quick'); if (b) toast(`Badge unlocked: <b>${b}</b>`, 'badge'); } }
    if (gold) { sfx.gold(); const b = award('golden'); if (b) toast(`Badge unlocked: <b>${b}</b>`, 'badge'); }
    else if (ok) sfx.right(store.progress.streak); else sfx.wrong();
    const cur = el;
    cur.classList.add(p.allow ? 'go' : 'stop');
    if (ok) {
      floatPoints(cur, `+${pts}`, !!gold);
      note.className = 'lane-note ok';
      note.innerHTML = `<b>Right: ${p.allow ? st.yes : st.no}.</b> ${esc(p.why)}`;
      setTimeout(() => { cur.remove(); k++; next(); }, 700);
    } else {
      note.className = 'lane-note no';
      note.innerHTML = `<b>The answer was ${p.allow ? st.yes : st.no}.</b> ${esc(p.why)}`;
      modal(`<h3>${yes === null ? 'Too slow! Decide before the timer runs out.' : 'Not quite.'}</h3><p>The answer was <b>${p.allow ? st.yes : st.no}</b>.</p><p>${esc(p.why)}</p>`,
        [{ label: 'Got it', primary: true, onClick: () => { cur.remove(); k++; next(); } }]);
    }
  };

  buttons.forEach(b => b.addEventListener('click', () => decide(b.dataset.a === '1')));
  const onKey = (e: KeyboardEvent) => {
    if (!document.body.contains(lane)) return cleanup();
    if (modalOpen()) return;
    const key = e.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') { e.preventDefault(); decide(true); }
    if (key === 'b' || key === 'arrowright') { e.preventDefault(); decide(false); }
  };
  const onVis = () => { paused = document.visibilityState === 'hidden'; };
  function cleanup() { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); }
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);

  // short countdown so nobody is caught off guard
  let c = 3;
  const cd = document.createElement('div');
  cd.className = 'countdown';
  lane.appendChild(cd);
  const step = () => {
    if (!document.body.contains(lane)) return cleanup();
    if (c === 0) { cd.remove(); next(); return; }
    cd.textContent = String(c); c--; setTimeout(step, 700);
  };
  step();
}
