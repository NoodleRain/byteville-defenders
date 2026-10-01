import { SortStage, StageContext } from '../types';
import { esc, sfx } from '../ui';
import { feedback, stageHead } from './common';

export function runSort(root: HTMLElement, st: SortStage, ctx: StageContext): void {
  const cards = st.cards.slice().sort(() => Math.random() - 0.5);
  let k = 0;
  let t0 = 0;
  let locked = false;

  const draw = () => {
    if (k >= cards.length) return ctx.done();
    const c = cards[k];
    locked = false;
    root.innerHTML = stageHead(st.title, st.intro, `${k + 1} / ${cards.length}`) + `
      <div class="sort-card" tabindex="-1">${esc(c.text)}</div>
      <div class="bins">${st.bins.map((b, i) => `<button class="bin" data-i="${i}"><span class="bin-key">${i + 1}</span><b>${esc(b.label)}</b><small>${esc(b.hint)}</small></button>`).join('')}</div>
      <div class="feedback" hidden></div>`;
    t0 = performance.now();
    root.querySelectorAll<HTMLButtonElement>('.bin').forEach(btn => btn.addEventListener('click', () => choose(Number(btn.dataset.i), btn)));
  };

  const choose = (i: number, btn: HTMLElement) => {
    if (locked) return;
    locked = true;
    const c = cards[k];
    const ok = i === c.bin;
    root.querySelectorAll<HTMLButtonElement>('.bin').forEach((b, j) => {
      b.disabled = true;
      if (j === c.bin) b.classList.add('is-right');
      else if (j === i) b.classList.add('is-wrong');
    });
    const pts = ctx.answer({ itemId: c.id, prompt: c.text, choice: st.bins[i].label, correctAnswer: st.bins[c.bin].label, correct: ok, timeMs: performance.now() - t0 });
    ok ? sfx.right() : sfx.wrong();
    feedback(root.querySelector('.feedback') as HTMLElement, ok, c.explain, pts, btn, () => { k++; draw(); });
  };

  const onKey = (e: KeyboardEvent) => {
    if (!document.body.contains(root) || !root.querySelector('.bins')) { document.removeEventListener('keydown', onKey); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= st.bins.length && !locked) {
      const btn = root.querySelector(`.bin[data-i="${n - 1}"]`) as HTMLElement;
      choose(n - 1, btn);
    }
  };
  document.addEventListener('keydown', onKey);
  draw();
}
