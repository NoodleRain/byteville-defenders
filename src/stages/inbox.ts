import { InboxStage, StageContext } from '../types';
import { esc, sfx } from '../ui';
import { feedback, stageHead } from './common';

export function runInbox(root: HTMLElement, st: InboxStage, ctx: StageContext): void {
  const result: Record<string, boolean | undefined> = {};
  let current = 0;
  let t0 = performance.now();

  const left = () => st.emails.filter(m => result[m.id] === undefined).length;

  const draw = () => {
    const m = st.emails[current];
    const answered = result[m.id] !== undefined;
    root.innerHTML = stageHead(st.title, st.intro, `${st.emails.length - left()} / ${st.emails.length} checked`) + `
    <div class="inbox">
      <ul class="mail-list" role="list">${st.emails.map((e, i) => {
        const r = result[e.id];
        const tag = r === undefined ? '<span class="mail-tag new">New</span>' : r ? '<span class="mail-tag ok">Done</span>' : '<span class="mail-tag no">Missed</span>';
        return `<li><button class="mail-item${i === current ? ' on' : ''}" data-i="${i}"><span class="mail-from">${esc(e.from)}${e.kind === 'text' ? ' <small>(text)</small>' : ''}</span>${tag}<span class="mail-sub">${esc(e.subject)}</span></button></li>`;
      }).join('')}</ul>
      <article class="mail-read">
        <div class="mail-meta"><div class="mail-avatar">${esc(m.from.charAt(0))}</div>
          <div><b>${esc(m.from)}</b><div class="mono small">${esc(m.address)}</div></div></div>
        <h3>${esc(m.subject)}</h3>
        <p>${esc(m.body)}</p>
        ${m.link ? `<p class="fake-link">${esc(m.link)}</p>` : ''}
        ${answered ? `<div class="clues"><b>${m.phish ? 'Phish! Clues:' : 'Safe. Why:'}</b><ul>${m.clues.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : `
        <div class="mail-actions"><button class="btn btn-safe" data-a="safe">Safe</button><button class="btn btn-phish" data-a="phish">Phish</button></div>`}
        <div class="feedback" hidden></div>
      </article>
    </div>`;
    root.querySelectorAll<HTMLButtonElement>('.mail-item').forEach(b => b.addEventListener('click', () => { current = Number(b.dataset.i); t0 = performance.now(); draw(); }));
    root.querySelectorAll<HTMLButtonElement>('[data-a]').forEach(b => b.addEventListener('click', () => decide(b.dataset.a === 'phish', b)));
  };

  const decide = (saysPhish: boolean, btn: HTMLElement) => {
    const m = st.emails[current];
    if (result[m.id] !== undefined) return;
    const ok = saysPhish === m.phish;
    result[m.id] = ok;
    ok ? sfx.right() : sfx.wrong();
    const pts = ctx.answer({ itemId: m.id, prompt: `${m.from}: ${m.subject}`, choice: saysPhish ? 'Phish' : 'Safe', correctAnswer: m.phish ? 'Phish' : 'Safe', correct: ok, timeMs: performance.now() - t0 });
    draw();
    const fb = root.querySelector('.feedback') as HTMLElement;
    const msg = m.phish ? `This one is a phish. Look at the clues above.` : `This one is safe. Look at why above.`;
    feedback(fb, ok, msg, pts, root.querySelector('.mail-read h3') as HTMLElement || btn, () => {
      if (left() === 0) return ctx.done();
      const nextIdx = st.emails.findIndex(e => result[e.id] === undefined);
      current = nextIdx; t0 = performance.now(); draw();
    }, 2600);
  };

  draw();
}
