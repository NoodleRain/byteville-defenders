// Byteville Defenders: screens, navigation, and scoring.

import { BADGES, CHAPTERS } from './content';
import { ada, art, avatar, building } from './art';
import { award, maxStars, newSessionId, persist, rankFor, resetProgress, store, totalStars } from './state';
import { flush, leaderboard, myCsv, track, trackingOn, config } from './tracker';
import { $, confetti, download, esc, modal, sfx, toast } from './ui';
import { Chapter, StageContext, AnswerInput, Stage } from './types';
import { runSort } from './stages/sort';
import { askOne, runChoice } from './stages/choice';
import { runInbox } from './stages/inbox';
import { runLane } from './stages/lane';
import { runOrder } from './stages/order';
import { nightWatchOpen, showNightWatch } from './nightwatch/screen';
import { showControlRoom } from './terminal/screen';

const app = $('#app');

/* ================= header ================= */
function renderHeader(active: string): void {
  const prof = store.profile;
  const p = store.progress;
  const r = rankFor(p.points);
  document.querySelectorAll<HTMLAnchorElement>('.nav a').forEach(a => a.classList.toggle('on', a.dataset.go === active));
  $('#navPlayer').innerHTML = prof ? `<button class="player-pill" data-go="profile" aria-label="Your profile">${avatar(prof.avatar, 34)}
    <span><b>${esc(prof.name)}</b><small>${r.name} · <span class="pts-num">${p.points}</span> pts</small></span></button>` : '';
  const pill = $('#navPlayer .player-pill');
  if (pill) pill.addEventListener('click', () => go('profile'));
}

/* ================= router ================= */
type Route = 'welcome' | 'map' | 'badges' | 'help' | 'profile' | 'grad' | 'nightwatch' | 'controlroom';
function go(route: Route | string): void {
  if (!store.profile && route !== 'help') route = 'welcome';
  window.scrollTo(0, 0);
  switch (route) {
    case 'map': return showMap();
    case 'badges': return showBadges();
    case 'help': return showHelp();
    case 'profile': return showProfile();
    case 'grad': return showGrad();
    case 'nightwatch': renderHeader('nightwatch'); return showNightWatch(app, go);
    case 'controlroom': renderHeader('controlroom'); return showControlRoom(app, go);
    default: return showWelcome();
  }
}
(() => {
  const nav = document.querySelector('.nav');
  if (nav && !nav.querySelector('[data-go="nightwatch"]')) {
    const a = document.createElement('a');
    a.href = '#'; a.dataset.go = 'nightwatch'; a.textContent = 'Night Watch'; a.className = 'nav-night';
    nav.insertBefore(a, nav.querySelector('[data-go="help"]'));
  }
  if (nav && !nav.querySelector('[data-go="controlroom"]')) {
    const c = document.createElement('a');
    c.href = '#'; c.dataset.go = 'controlroom'; c.textContent = 'Control Room'; c.className = 'nav-night';
    nav.insertBefore(c, nav.querySelector('[data-go="help"]'));
  }
})();
document.querySelectorAll<HTMLAnchorElement>('[data-go]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.go || 'map'); }));

/* ================= welcome ================= */
function showWelcome(): void {
  renderHeader('');
  let pickAv = 0;
  app.innerHTML = `
  <div class="hero-banner"><img src="assets/hero.jpg" alt="Byteville Defenders: two knights guard a digital castle" width="1408" height="768"></div>
  <section class="welcome">
    <div class="welcome-copy">
      <p class="eyebrow">A cybersecurity training camp</p>
      <h1>Byteville needs <span class="hl">defenders.</span></h1>
      <p class="lead">Hackers are knocking on the town's doors. In about 45 minutes, Officer Ada will train you to spot tricks, choose strong locks, guard the city gate, and catch attacks hidden in plain sight.</p>
      <ul class="welcome-list">
        <li><b>8 chapters</b> on one town map</li><li><b>Points, ranks, and 20 badges</b></li><li><b>A certificate</b> when you graduate</li>
      </ul>
    </div>
    <form class="signup card" id="signup" autocomplete="off">
      <div class="ada-line">${ada(56)}<p><b>Officer Ada:</b> Hi! I am the town's security chief. Tell me who you are and we will get started.</p></div>
      <label for="fName">Your first name and last initial</label>
      <input id="fName" maxlength="30" placeholder="Maya R." required>
      <label for="fClass">Class code <span class="muted">(from your teacher)</span></label>
      <input id="fClass" maxlength="20" placeholder="e.g. PERIOD-3" value="${esc(config().defaultClassCode || '')}">
      <span class="label">Pick your avatar</span>
      <div class="avatars" role="radiogroup" aria-label="Avatar">${[0, 1, 2, 3, 4, 5].map(i => `<button type="button" class="av${i === 0 ? ' on' : ''}" role="radio" aria-checked="${i === 0}" data-i="${i}">${avatar(i, 48)}</button>`).join('')}</div>
      <button class="btn btn-primary btn-big" type="submit">Start training</button>
      <p class="small muted">${trackingOn() ? 'Your teacher will see your answers and scores so they can help you learn. Use only your first name and last initial.' : 'Your progress is saved in this browser only.'}</p>
    </form>
  </section>`;
  app.querySelectorAll<HTMLButtonElement>('.av').forEach(b => b.addEventListener('click', () => {
    pickAv = Number(b.dataset.i);
    app.querySelectorAll('.av').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
  }));
  $('#signup').addEventListener('submit', e => {
    e.preventDefault();
    const name = ($('#fName') as HTMLInputElement).value.trim().slice(0, 30);
    if (!name) return;
    store.profile = { name, classCode: ($('#fClass') as HTMLInputElement).value.trim().toUpperCase().slice(0, 20), avatar: pickAv, sessionId: newSessionId(), createdAt: new Date().toISOString() };
    persist();
    track({ event: 'start', choice: `avatar ${pickAv}` });
    sfx.badge();
    go('map');
  });
}

/* ================= map ================= */
function nextChapter(): Chapter | undefined { return CHAPTERS.find(c => !store.progress.done.includes(c.id)); }

function stars(n: number): string {
  return `<span class="stars" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<svg viewBox="0 0 24 24" class="${i < n ? 'on' : ''}"><path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>`).join('')}</span>`;
}

function showMap(): void {
  renderHeader('map');
  const p = store.progress;
  const nx = nextChapter();
  const r = rankFor(p.points);
  const toNext = r.next ? Math.round((p.points - r.floor) / (r.next - r.floor) * 100) : 100;
  const first = store.profile!.name.split(' ')[0];
  const greet = p.done.length === 0 ? `Welcome, ${esc(first)}! Start at the Town Hall. Click it on the map.`
    : nx ? `Nice work, ${esc(first)}. Next stop: <b>${nx.place}</b>.` : `You did it, ${esc(first)}! Visit Graduation for your certificate.`;
  app.innerHTML = `
  <section class="map-top">
    <div class="ada-bubble">${ada(64)}<div class="bubble"><p>${greet}</p></div></div>
    <div class="map-stats">
      <div class="stat"><b>${p.points}</b><span>points</span></div>
      <div class="stat"><b>${totalStars()}<small>/${maxStars()}</small></b><span>stars</span></div>
      <div class="stat"><b>${p.badges.length}<small>/${BADGES.length}</small></b><span>badges</span></div>
      <div class="stat rank"><b>${r.name}</b><span>${r.next ? `${r.next - p.points} pts to next rank` : 'Top rank!'}</span><div class="meter"><i style="width:${toNext}%"></i></div></div>
    </div>
  </section>
  <section class="town">
    <div class="town-head"><h2>Town map</h2><p class="muted">${p.done.length} of ${CHAPTERS.length} places protected</p></div>
    <div class="town-board">${CHAPTERS.map((c, i) => {
      const open = i + 1 <= p.unlocked;
      const done = p.done.includes(c.id);
      const isNext = nx && nx.id === c.id;
      return `<button class="lot${open ? '' : ' locked'}${isNext ? ' next' : ''}${done ? ' done' : ''}" data-ch="${c.id}" ${open ? '' : 'disabled'} style="--c:${c.color}">
        <span class="lot-num">${c.num}</span>
        <span class="lot-art">${building(c)}</span>
        <span class="lot-name">${c.place}</span>
        <span class="lot-topic">${c.topic}</span>
        <span class="lot-foot">${open ? (done ? stars(p.stars[c.id] || 0) : `<span class="mins">${c.minutes} min</span>`) : '<span class="mins">Locked</span>'}${isNext ? '<span class="go-tag">Go here</span>' : ''}</span>
      </button>`;
    }).join('')}
      <button class="lot grad${p.done.length === CHAPTERS.length ? ' next' : ' locked'}" data-go-grad ${p.done.length === CHAPTERS.length ? '' : 'disabled'}>
        <span class="lot-name">Graduation</span><span class="lot-topic">${p.done.length === CHAPTERS.length ? 'Get your certificate' : 'Finish all 8 places to unlock'}</span></button>
      <button class="lot night${nightWatchOpen() ? '' : ' locked'}" data-go-nw ${nightWatchOpen() ? '' : 'disabled'}>
        <span class="lot-name">Night Watch</span><span class="lot-topic">${nightWatchOpen() ? `Advanced: 12 hard levels · ${p.nwSolved.length}/12 solved` : 'Advanced levels. Unlocks after graduation'}</span></button>
      <button class="lot night${nightWatchOpen() ? '' : ' locked'}" data-go-cr ${nightWatchOpen() ? '' : 'disabled'}>
        <span class="lot-name">Control Room</span><span class="lot-topic">${nightWatchOpen() ? `Command line: 10 levels on a live server · ${p.opSolved.length}/10 solved` : 'Command-line levels. Unlocks after graduation'}</span></button>
    </div>
  </section>
  <section class="map-side">
    <div class="card"><h3>Latest badges</h3><div class="badge-row">${p.badges.length ? p.badges.slice(-4).map(id => badgeChip(id, true)).join('') : '<p class="muted small">Finish the Town Hall to earn your first badge.</p>'}</div>
      <a href="#" class="link" data-go="badges">See all badges</a></div>
    <div class="card" id="lbCard"><h3>Class leaderboard <small class="muted">(server-checked)</small></h3><p class="muted small">${trackingOn() ? 'Loading...' : 'The leaderboard appears when your teacher turns on class tracking.'}</p></div>
  </section>`;
  app.querySelectorAll<HTMLButtonElement>('.lot[data-ch]').forEach(b => b.addEventListener('click', () => startChapter(CHAPTERS.find(c => c.id === b.dataset.ch)!)));
  const g = app.querySelector('[data-go-grad]'); if (g) g.addEventListener('click', () => go('grad'));
  const nwb = app.querySelector('[data-go-nw]'); if (nwb) nwb.addEventListener('click', () => go('nightwatch'));
  const crb = app.querySelector('[data-go-cr]'); if (crb) crb.addEventListener('click', () => go('controlroom'));
  app.querySelectorAll<HTMLAnchorElement>('a[data-go]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.go!); }));
  if (trackingOn()) {
    void flush().then(() => leaderboard(store.profile!.classCode)).then(rows => {
      const card = $('#lbCard'); if (!card) return;
      if (!rows) { card.innerHTML = '<h3>Class leaderboard <small class="muted">(server-checked)</small></h3><p class="muted small">Not available right now.</p>'; return; }
      card.innerHTML = `<h3>Class leaderboard <small class="muted">(server-checked)</small></h3>${rows.length ? `<ol class="lb">${rows.slice(0, 8).map(r => `<li class="${r.student === store.profile!.name ? 'me' : ''}"><span>${esc(r.student)}</span><b>${r.points}</b></li>`).join('')}</ol>` : '<p class="muted small">No scores yet. Be the first!</p>'}`;
    });
  }
}

function badgeChip(id: string, on: boolean): string {
  const b = BADGES.find(x => x.id === id)!;
  return `<div class="badge ${on ? 'on' : ''}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2l5 4 6-1 2 6 5 4-2 6 2 6-5 4-2 6-6-1-5 4-5-4-6 1-2-6-5-4 2-6-2-6 5-4 2-6 6 1z" class="b-seal"/><path d="M13 20l5 5 9-10" class="b-check"/></svg><span><b>${b.name}</b><small>${b.how}</small></span></div>`;
}

/* ================= chapter flow ================= */
interface Run { ch: Chapter; points: number; answered: number; correct: number; started: number; read: Set<number>; }
let run: Run | null = null;

function giveBadge(id: string): void { const b = award(id); if (b) { sfx.badge(); toast(`Badge unlocked: <b>${b}</b>`, 'badge'); } }

function answer(a: AnswerInput): number {
  const p = store.progress;
  if (!run) return 0;
  run.answered++; p.answered++;
  let pts = 0;
  if (a.correct) {
    run.correct++; p.correct++;
    p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak);
    const mult = 1 + Math.min(2, Math.floor(p.streak / 3) * 0.5);
    pts = Math.round((a.base ?? 10) * mult) + (a.bonus || 0);
    if (p.streak === 5) giveBadge('streak5');
    if (p.streak === 10) giveBadge('streak10');
    if (p.streak > 0 && p.streak % 5 === 0) toast(`${p.streak} in a row! Points x${mult}`);
  } else {
    p.streak = 0;
  }
  run.points += pts;
  persist();
  updateRunBar();
  track({ event: a.itemId.endsWith('-check') ? 'check' : 'answer', chapter: run.ch.id, item_id: a.itemId, prompt: a.prompt, choice: a.choice,
    correct_answer: a.correctAnswer, correct: a.correct ? 1 : 0, time_ms: Math.round(a.timeMs), points: pts, total_points: p.points + run.points });
  return pts;
}

function updateRunBar(): void {
  const bar = document.querySelector('.run-bar');
  if (!bar || !run) return;
  (bar.querySelector('.rb-pts') as HTMLElement).textContent = String(run.points);
  (bar.querySelector('.rb-streak') as HTMLElement).textContent = String(store.progress.streak);
}

function chapterShell(ch: Chapter, stepLabel: string, stepIdx: number, steps: number): HTMLElement {
  app.innerHTML = `
  <div class="run-bar" style="--c:${ch.color}">
    <button class="btn btn-small btn-ghost" id="leave">&larr; Map</button>
    <div class="rb-title"><small>Chapter ${ch.num} · ${ch.place}</small><b>${esc(stepLabel)}</b></div>
    <div class="rb-steps" aria-hidden="true">${Array.from({ length: steps }, (_, i) => `<i class="${i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''}"></i>`).join('')}</div>
    <div class="rb-score"><span><small>Points</small><b class="rb-pts">${run ? run.points : 0}</b></span><span><small>Streak</small><b class="rb-streak">${store.progress.streak}</b></span></div>
  </div>
  <section class="stage" id="stage"></section>`;
  $('#leave').addEventListener('click', () => {
    modal('<h3>Leave this chapter?</h3><p>Your points in this chapter will not be saved until you finish it.</p>', [
      { label: 'Keep playing', primary: true, onClick: () => undefined },
      { label: 'Go to the map', onClick: () => { run = null; go('map'); } },
    ]);
  });
  return $('#stage');
}

function startChapter(ch: Chapter): void {
  run = { ch, points: 0, answered: 0, correct: 0, started: Date.now(), read: new Set<number>() };
  renderHeader('map');
  const steps = ch.lessons.length + 1 + ch.stages.length;
  let lesson = 0;

  const showLesson = () => {
    const L = ch.lessons[lesson];
    const t0 = Date.now();
    const st = chapterShell(ch, `Lesson ${lesson + 1} of ${ch.lessons.length}`, lesson, steps);
    st.innerHTML = `
    <article class="lesson">
      <div class="lesson-text">
        <p class="eyebrow">${esc(ch.topic)}</p>
        <h1>${esc(L.title)}</h1>
        <div class="ada-line small-ada">${ada(44)}<span>Officer Ada explains</span></div>
        ${L.body.map(b => `<p>${b}</p>`).join('')}
        ${L.fact ? `<div class="fact"><b>Did you know?</b> ${L.fact}</div>` : ''}
      </div>
      <figure class="lesson-art">${L.art ? art(L.art) : ''}</figure>
    </article>
    <div class="lesson-nav">
      <button class="btn" id="back" ${lesson === 0 ? 'disabled' : ''}>Back</button>
      <span class="muted small">Reading earns 5 points</span>
      <button class="btn btn-primary" id="next">${lesson === ch.lessons.length - 1 ? 'Quick check' : 'Next'}</button>
    </div>`;
    $('#back').addEventListener('click', () => { lesson--; showLesson(); });
    $('#next').addEventListener('click', () => {
      const secs = Date.now() - t0;
      track({ event: 'lesson', chapter: ch.id, item_id: `${ch.id}-l${lesson + 1}`, prompt: L.title, time_ms: secs, points: 5 });
      if (run && !run.read.has(lesson)) { run.read.add(lesson); run.points += 5; }
      lesson++;
      lesson < ch.lessons.length ? showLesson() : showCheck();
    });
    $('#next').focus();
  };

  const showCheck = () => {
    const st = chapterShell(ch, 'Quick check', ch.lessons.length, steps);
    st.innerHTML = `<div class="check card"><div class="ada-line">${ada(52)}<p><b>Quick check!</b> One question to make sure the idea stuck.</p></div><div class="q-box"></div></div>`;
    askOne($('.q-box', st), ch.check, 'list',
      (i, ok, ms) => answer({ itemId: ch.check.id, prompt: ch.check.prompt, choice: ch.check.options[i], correctAnswer: ch.check.options[ch.check.answer], correct: ok, timeMs: ms }),
      () => { if (run && run.ch === ch && document.body.contains(st)) runStage(0); });
  };

  const runStage = (s: number) => {
    if (s >= ch.stages.length) return finishChapter(ch);
    const stage: Stage = ch.stages[s];
    const st = chapterShell(ch, stage.title, ch.lessons.length + 1 + s, steps);
    const myRun = run;
    let finished = false;
    const ctx: StageContext = {
      answer: (a) => (run === myRun ? answer(a) : 0),
      done: () => { if (finished || run !== myRun) return; finished = true; runStage(s + 1); },
      chapter: ch,
    };
    if (stage.type === 'sort') runSort(st, stage, ctx);
    else if (stage.type === 'choice') runChoice(st, stage, ctx);
    else if (stage.type === 'inbox') runInbox(st, stage, ctx);
    else if (stage.type === 'lane') runLane(st, stage, ctx);
    else runOrder(st, stage, ctx);
  };

  showLesson();
}

function finishChapter(ch: Chapter): void {
  if (!run) return;
  const p = store.progress;
  const acc = run.answered ? run.correct / run.answered : 1;
  const st = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
  const firstTime = !p.done.includes(ch.id);
  let bonus = 25 + (st === 3 ? 25 : 0);
  run.points += bonus;
  const prevBest = p.best[ch.id] || 0;
  const newBest = Math.max(prevBest, run.points);
  p.best[ch.id] = newBest;
  p.points = Object.values(p.best).reduce((a, b) => a + b, 0);
  p.stars[ch.id] = Math.max(p.stars[ch.id] || 0, st);
  p.playMs += Date.now() - run.started;
  if (firstTime) p.done.push(ch.id);
  p.unlocked = Math.max(p.unlocked, Math.min(CHAPTERS.length, ch.num + 1));
  persist();
  giveBadge('ch-' + ch.id);
  if (Object.values(p.stars).filter(x => x === 3).length >= 3) giveBadge('perfect');
  const allDone = p.done.length === CHAPTERS.length;
  if (allDone) giveBadge('grad');
  track({ event: 'chapter_complete', chapter: ch.id, item_id: ch.id + '-done', prompt: ch.place, choice: `${st} stars`, correct_answer: '',
    correct: Math.round(acc * 100), time_ms: Date.now() - run.started, points: run.points, total_points: p.points });
  if (allDone && firstTime) track({ event: 'finish', points: 0, total_points: p.points });
  void flush();
  sfx.win(); confetti();
  const nx = CHAPTERS[ch.num];
  const r = rankFor(p.points);
  const improved = newBest > prevBest && prevBest > 0;
  const runPts = run.points;
  run = null;
  renderHeader('map');
  app.innerHTML = `
  <section class="results card">
    <p class="eyebrow">Chapter ${ch.num} complete</p>
    <h1>${ch.place} is protected!</h1>
    <div class="res-stars">${stars(st)}</div>
    <div class="res-grid">
      <div><b>${runPts}</b><span>points this run</span></div>
      <div><b>${Math.round(acc * 100)}%</b><span>correct</span></div>
      <div><b>${p.bestStreak}</b><span>best streak</span></div>
      <div><b>${r.name}</b><span>your rank</span></div>
    </div>
    ${prevBest && !improved ? `<p class="muted small">Your best for this chapter is still ${prevBest}. Only your best run counts toward your total.</p>` : ''}
    ${improved ? `<p class="small"><b>New best!</b> Your total went up.</p>` : ''}
    <div class="ada-line">${ada(56)}<p><b>Officer Ada:</b> ${esc(ch.outro)} ${st < 3 ? 'Replay any time to earn 3 stars.' : ''}</p></div>
    <div class="row-gap center">
      ${allDone ? '<button class="btn btn-primary btn-big" id="toGrad">Go to Graduation</button>' : nx ? `<button class="btn btn-primary btn-big" id="toNext">Next: ${nx.place}</button>` : ''}
      <button class="btn" id="toMap">Town map</button>
      <button class="btn" id="again">Replay</button>
    </div>
  </section>`;
  const tn = document.getElementById('toNext'); if (tn && nx) tn.addEventListener('click', () => startChapter(nx));
  const tg = document.getElementById('toGrad'); if (tg) tg.addEventListener('click', () => go('grad'));
  $('#toMap').addEventListener('click', () => go('map'));
  $('#again').addEventListener('click', () => startChapter(ch));
}

/* ================= other pages ================= */
function showBadges(): void {
  renderHeader('badges');
  const have = store.progress.badges;
  app.innerHTML = `<section class="page"><p class="eyebrow">Collection</p><h1>Badges</h1><p class="lead">${have.length} of ${BADGES.length} earned. Each badge shows what you need to do.</p>
    <div class="badge-grid">${BADGES.map(b => badgeChip(b.id, have.includes(b.id))).join('')}</div></section>`;
}

function showHelp(): void {
  renderHeader('help');
  app.innerHTML = `<section class="page narrow"><p class="eyebrow">Guide</p><h1>How to play</h1>
    <div class="ada-line">${ada(56)}<p><b>Officer Ada:</b> Each place on the town map is a chapter. I teach a short lesson, you answer a quick check, then you play a challenge.</p></div>
    <h2>Points</h2><ul class="clean">
      <li><b>10 points</b> for each right answer. Reading each lesson gives 5 points.</li>
      <li><b>Streaks</b> multiply your points: 3 in a row is x1.5, 6 in a row is x2, 9 in a row is x3.</li>
      <li><b>Speed bonus</b> at the gate when you decide quickly. <b>Gold packets</b> give 30 extra.</li>
      <li><b>Finish bonus:</b> 25 for every chapter, plus 25 more for 3 stars.</li>
      <li>Replaying a chapter only counts if you beat your best score.</li></ul>
    <h2>Stars</h2><p>3 stars for 90% right or better. 2 stars for 70% or better. 1 star for finishing.</p>
    <h2>Night Watch</h2><p>After graduation, Night Watch opens 12 advanced levels. You write firewall rules, hunt through logs, and tune detection rules. Each solved level gives a passcode that unlocks the next one on any computer.</p>
    <h2>Control Room</h2><p>Also after graduation: 10 levels on a simulated Linux server. You type real commands like <kbd>ls</kbd>, <kbd>grep</kbd>, <kbd>ifconfig</kbd> and <kbd>sudo ufw</kbd> to investigate logs and lock the server down.</p>
    <h2>Ranks</h2><p>Rookie, Cadet, Gate Guard, Analyst, Defender, and Chief of Security.</p>
    <h2>Keyboard</h2><p>In sorting games press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>. At the gate press <kbd>A</kbd> to allow and <kbd>B</kbd> to block.</p>
    <h2>What gets saved?</h2><p>${trackingOn() ? 'Your name, class code, answers, scores, and how long each step took are sent to your teacher\'s private spreadsheet. Nothing else.' : 'Your progress stays in this browser. Nothing is sent anywhere.'}</p></section>`;
}

function showProfile(): void {
  renderHeader('profile');
  const prof = store.profile!;
  const p = store.progress;
  const acc = p.answered ? Math.round(p.correct / p.answered * 100) : 0;
  app.innerHTML = `<section class="page"><div class="profile-head">${avatar(prof.avatar, 72)}<div><p class="eyebrow">Player</p><h1>${esc(prof.name)}</h1><p class="muted">${prof.classCode ? 'Class ' + esc(prof.classCode) + ' · ' : ''}${rankFor(p.points).name}</p></div></div>
    <div class="res-grid">
      <div><b>${p.points}</b><span>total points</span></div><div><b>${acc}%</b><span>answers right</span></div>
      <div><b>${p.bestStreak}</b><span>best streak</span></div><div><b>${Math.round(p.playMs / 60000)} min</b><span>time played</span></div></div>
    <div class="row-gap">
      <button class="btn" id="dl">Download my answers (CSV)</button>
      <label class="switch"><input type="checkbox" id="snd" ${store.sound ? 'checked' : ''}> Sound effects</label>
    </div>
    <div class="card danger"><h3>Not ${esc(prof.name.split(' ')[0])}?</h3><p class="small">On a shared computer, switch player before you start. This clears the progress saved in this browser.</p><button class="btn" id="switch">Switch player</button></div>
  </section>`;
  $('#dl').addEventListener('click', () => download(`byteville-${prof.name.replace(/\W+/g, '_')}.csv`, myCsv()));
  $('#snd').addEventListener('change', e => { store.sound = (e.target as HTMLInputElement).checked; persist(); });
  $('#switch').addEventListener('click', () => modal('<h3>Switch player?</h3><p>This erases the points and badges saved in this browser. Answers already sent to your teacher stay safe.</p>', [
    { label: 'Cancel', onClick: () => undefined },
    { label: 'Yes, switch player', primary: true, onClick: () => { void flush(); resetProgress(); store.profile = null; persist(); try { localStorage.removeItem('byteville-log-v1'); } catch (_) { /* ignore */ } go('welcome'); } },
  ]));
}

function showGrad(): void {
  renderHeader('map');
  const p = store.progress;
  if (p.done.length < CHAPTERS.length) return go('map');
  confetti();
  app.innerHTML = `<section class="cert">
    <div class="cert-inner">
      <img class="cert-logo" src="assets/logo-badge.jpg" alt="Byteville Defenders"><p class="eyebrow">Training Camp · Introduction to Cybersecurity</p>
      <h1>Certificate of Graduation</h1>
      <p>This certifies that</p>
      <p class="cert-name">${esc(store.profile!.name)}</p>
      <p>has protected all eight places in Byteville and learned the CIA triad, strong passwords and MFA, phishing, security controls, firewalls, rule order, intrusion detection, and intrusion prevention.</p>
      <div class="cert-row"><span><b>${p.points}</b> points</span><span><b>${totalStars()}</b> of ${maxStars()} stars</span><span><b>${p.badges.length}</b> badges</span><span>Rank: <b>${rankFor(p.points).name}</b></span></div>
      <div class="cert-sign">${ada(48)}<div><b>Officer Ada</b><small>Chief of Security, Byteville</small></div><span class="cert-date">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
    </div>
    <p class="center muted">Take a screenshot to share it with your teacher. Want more stars? Replay any chapter from the map.</p>
    <div class="row-gap center"><button class="btn btn-primary btn-big" id="gnw">Start Night Watch</button><button class="btn btn-big" id="gcr">Enter the Control Room</button><button class="btn" id="gm">Back to the map</button></div>
  </section>`;
  $('#gm').addEventListener('click', () => go('map'));
  $('#gnw').addEventListener('click', () => go('nightwatch'));
  $('#gcr').addEventListener('click', () => go('controlroom'));
}

/* ================= start ================= */
go(store.profile ? 'map' : 'welcome');
