import { ChoiceItem, ChoiceStage, StageContext } from '../types';
import { esc, sfx } from '../ui';
import { feedback, stageHead } from './common';

/** One multiple-choice question. Used by challenge stages and by the lesson "quick check". */
export function askOne(box: HTMLElement, item: ChoiceItem, style: 'pair' | 'list', onAnswer: (choice: number, ok: boolean, ms: number) => number, next: () => void): void {
  const t0 = performance.now();
  let locked = false;
  box.innerHTML = `<p class="q-prompt">${esc(item.prompt)}</p>
    <div class="${style === 'pair' ? 'pair' : 'opts'}">${item.options.map((o, i) =>
      `<button class="${style === 'pair' ? 'pair-card' : 'opt'}" data-i="${i}">${style === 'pair' ? `<span class="pair-tag">${i === 0 ? 'Left' : 'Right'}</span><span class="pair-text">${esc(o)}</span>` : `<span class="opt-key">${String.fromCharCode(65 + i)}</span>${esc(o)}`}</button>`).join('')}</div>
    <div class="feedback" hidden></div>`;
  const buttons = Array.from(box.querySelectorAll<HTMLButtonElement>('[data-i]'));
  buttons.forEach(b => b.addEventListener('click', () => {
    if (locked) return;
    locked = true;
    const i = Number(b.dataset.i);
    const ok = i === item.answer;
    buttons.forEach((x, j) => { x.disabled = true; if (j === item.answer) x.classList.add('is-right'); else if (j === i) x.classList.add('is-wrong'); });
    ok ? sfx.right() : sfx.wrong();
    const pts = onAnswer(i, ok, performance.now() - t0);
    feedback(box.querySelector('.feedback') as HTMLElement, ok, item.explain, pts, b, next, 1800);
  }));
}

export function runChoice(root: HTMLElement, st: ChoiceStage, ctx: StageContext): void {
  let k = 0;
  const draw = () => {
    if (k >= st.items.length) return ctx.done();
    const item = st.items[k];
    root.innerHTML = stageHead(st.title, st.intro, `${k + 1} / ${st.items.length}`) + '<div class="q-box"></div>';
    askOne(root.querySelector('.q-box') as HTMLElement, item, st.style || 'list',
      (i, ok, ms) => ctx.answer({ itemId: item.id, prompt: item.prompt, choice: item.options[i], correctAnswer: item.options[item.answer], correct: ok, timeMs: ms }),
      () => { k++; draw(); });
  };
  draw();
}
