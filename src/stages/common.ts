import { ENCOURAGE, PRAISE } from '../content';
import { esc, floatPoints } from '../ui';

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export function stageHead(title: string, intro: string, count: string): string {
  return `<div class="stage-head">
    <div><div class="eyebrow">Challenge</div><h2>${esc(title)}</h2><p class="stage-intro">${esc(intro)}</p></div>
    <div class="stage-count" aria-live="polite">${count}</div></div>`;
}

/** Shows right/wrong feedback in a box. Calls next() when the player continues. */
export function feedback(box: HTMLElement, ok: boolean, explain: string, pts: number, anchor: HTMLElement | null, next: () => void, autoMs = 1500): void {
  box.className = 'feedback ' + (ok ? 'ok' : 'no');
  box.innerHTML = `<div class="fb-title">${ok ? pick(PRAISE) : pick(ENCOURAGE)}${ok && pts ? ` <span class="fb-pts">+${pts}</span>` : ''}</div><p>${explain}</p>`;
  box.hidden = false;
  if (ok && anchor && pts) floatPoints(anchor, `+${pts}`);
  if (ok) {
    const t = setTimeout(next, autoMs);
    const skip = document.createElement('button');
    skip.className = 'btn btn-small';
    skip.textContent = 'Next';
    skip.addEventListener('click', () => { clearTimeout(t); next(); });
    box.appendChild(skip);
  } else {
    const b = document.createElement('button');
    b.className = 'btn btn-primary btn-small';
    b.textContent = 'Got it, next';
    b.addEventListener('click', next);
    box.appendChild(b);
    setTimeout(() => b.focus(), 30);
  }
}
