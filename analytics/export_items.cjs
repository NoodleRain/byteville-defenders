// Writes analytics/items.json (every question in the game) so the Python report can show
// chapter names and full prompts. Run with: npm run items
const path = require('path');
const fs = require('fs');
const { CHAPTERS } = require('./.content.cjs');
const items = [];
for (const c of CHAPTERS) {
  const ch = { chapter: c.id, place: c.place, topic: c.topic };
  items.push({ ...ch, item_id: c.check.id, kind: 'quick check', prompt: c.check.prompt, answer: c.check.options[c.check.answer] });
  for (const s of c.stages) {
    if (s.type === 'sort') s.cards.forEach(x => items.push({ ...ch, item_id: x.id, kind: 'sort', prompt: x.text, answer: s.bins[x.bin].label }));
    if (s.type === 'choice') s.items.forEach(x => items.push({ ...ch, item_id: x.id, kind: 'choice', prompt: x.prompt, answer: x.options[x.answer] }));
    if (s.type === 'inbox') s.emails.forEach(x => items.push({ ...ch, item_id: x.id, kind: 'inbox', prompt: `${x.from}: ${x.subject}`, answer: x.phish ? 'Phish' : 'Safe' }));
    if (s.type === 'order') s.puzzles.forEach(x => items.push({ ...ch, item_id: x.id, kind: 'rule order', prompt: x.goal, answer: 'all tests pass' }));
    if (s.type === 'lane') (s.rules.some(r => r.kind === 'alert') ? ['clean', 'tricky-clean', 'signature', 'bad-port', 'blocklist'] : ['website-ok', 'bad-port', 'blocklist']).forEach(cat =>
      items.push({ ...ch, item_id: `${c.id}-lane-${cat}`, kind: 'gate', prompt: `${s.title}: ${cat.replace('-', ' ')} packets`, answer: cat === 'website-ok' || cat.includes('clean') ? s.yes : s.no }));
  }
}
fs.writeFileSync(path.join(__dirname, 'items.json'), JSON.stringify(items, null, 1));
fs.unlinkSync(path.join(__dirname, '.content.cjs'));
console.log(`Wrote ${items.length} items to analytics/items.json`);
