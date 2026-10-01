import { OrderPuzzle, OrderStage, Rule, StageContext, TestPacket } from '../types';
import { esc, sfx, floatPoints } from '../ui';
import { feedback, stageHead } from './common';

const matches = (r: Rule, t: TestPacket) => (r.port === undefined || r.port === t.port) && (r.ip === undefined || r.ip === t.ip);
export function verdict(rules: Rule[], t: TestPacket): { allow: boolean; by: number } {
  for (let i = 0; i < rules.length; i++) if (matches(rules[i], t)) return { allow: rules[i].action === 'allow', by: i };
  return { allow: false, by: -1 };
}

export function runOrder(root: HTMLElement, st: OrderStage, ctx: StageContext): void {
  let p = 0;

  const drawPuzzle = (pz: OrderPuzzle) => {
    const rules = pz.rules.slice();
    let tries = 0;
    let solved = false;
    let t0 = performance.now();

    const draw = (results?: { allow: boolean; by: number }[]) => {
      root.innerHTML = stageHead(st.title, st.intro, `Puzzle ${p + 1} / ${st.puzzles.length}`) + `
      <div class="order-grid">
        <div>
          <div class="goal"><b>Goal:</b> ${esc(pz.goal)}</div>
          <ol class="rule-list">${rules.map((r, i) => `<li class="rule-row ${r.action}">
            <span class="rule-num">${i + 1}</span><span class="rule-act">${r.action === 'allow' ? 'ALLOW' : 'BLOCK'}</span><span class="rule-text">${esc(r.text.replace(/^(Allow|Block) /, ''))}</span>
            <span class="rule-move"><button class="mv" data-i="${i}" data-d="-1" aria-label="Move rule ${i + 1} up" ${i === 0 ? 'disabled' : ''}>&uarr;</button><button class="mv" data-i="${i}" data-d="1" aria-label="Move rule ${i + 1} down" ${i === rules.length - 1 ? 'disabled' : ''}>&darr;</button></span></li>`).join('')}</ol>
          <div class="row-gap"><button class="btn btn-primary" id="runTest">Test my rules</button>${tries > 0 ? '<button class="btn" id="hintBtn">Show a hint</button>' : ''}</div>
          <div class="hint" hidden>${esc(pz.hint)}</div>
        </div>
        <div class="tests"><h3>Test packets</h3>${pz.tests.map((t, i) => {
          const r = results ? results[i] : null;
          const pass = r ? r.allow === t.allow : null;
          return `<div class="test ${pass === null ? '' : pass ? 'pass' : 'fail'}"><div><b>${esc(t.label)}</b><div class="mono small">${esc(t.ip)} : ${t.port}</div></div>
            <div class="test-want">Should be <b>${t.allow ? 'allowed' : 'blocked'}</b>${r ? `<br><span class="small">Got ${r.allow ? 'allowed' : 'blocked'}${r.by >= 0 ? ` by rule ${r.by + 1}` : ''}</span>` : ''}</div></div>`;
        }).join('')}</div>
      </div>
      <div class="feedback" hidden></div>`;
      root.querySelectorAll<HTMLButtonElement>('.mv').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.i), d = Number(b.dataset.d);
        [rules[i], rules[i + d]] = [rules[i + d], rules[i]];
        sfx.click(); draw();
        (root.querySelector(`.mv[data-i="${i + d}"][data-d="${d}"]`) as HTMLButtonElement | null)?.focus();
      }));
      (root.querySelector('#runTest') as HTMLElement).addEventListener('click', test);
      const hb = root.querySelector('#hintBtn');
      if (hb) hb.addEventListener('click', () => { (root.querySelector('.hint') as HTMLElement).hidden = false; });
    };

    const test = () => {
      if (solved) return;
      tries++;
      const res = pz.tests.map(t => verdict(rules, t));
      const ok = res.every((r, i) => r.allow === pz.tests[i].allow);
      draw(res);
      const base = ok ? Math.max(10, 50 - (tries - 1) * 15) : 0;
      const pts = ctx.answer({ itemId: `${pz.id}-try${tries}`, prompt: pz.goal, choice: rules.map(r => r.text).join(' > '),
        correctAnswer: 'all tests pass', correct: ok, timeMs: performance.now() - t0, base });
      t0 = performance.now();
      const fb = root.querySelector('.feedback') as HTMLElement;
      if (ok) {
        solved = true;
        root.querySelectorAll<HTMLButtonElement>('.mv, #runTest, #hintBtn').forEach(b => (b.disabled = true));
        sfx.right();
        floatPoints(root.querySelector('#runTest') as HTMLElement, `+${pts}`);
        feedback(fb, true, tries === 1 ? 'First try! Every test packet went where it should.' : 'All test packets went where they should.', pts, null, () => { p++; p < st.puzzles.length ? drawPuzzle(st.puzzles[p]) : ctx.done(); }, 2200);
      } else {
        sfx.wrong();
        fb.className = 'feedback no'; fb.hidden = false;
        fb.innerHTML = `<div class="fb-title">Some packets went the wrong way.</div><p>Look at the red tests. Which rule caught them? Move rules and test again.${tries >= 1 ? ' You can also open a hint.' : ''}</p>`;
      }
    };
    draw();
  };
  drawPuzzle(st.puzzles[0]);
}
