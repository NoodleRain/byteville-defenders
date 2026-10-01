/**
 * Byteville Defenders: class data collector (Google Apps Script).
 *
 * What it does
 *   - doPost: the game sends student answers here. Each answer becomes one row in the "events" tab.
 *   - doGet ?action=leaderboard&class=CODE: returns the top scores for one class code.
 *
 * Setup (about 10 minutes, see README.md for screenshots-free steps)
 *   1. Create a new Google Sheet. Extensions > Apps Script. Paste this whole file. Save.
 *   2. Run the function "setup" once (Run button). Approve the permissions.
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy.
 *   4. Copy the Web app URL into js/config.js as trackingUrl.
 */

// Optional shared key. If you set it here, set the same value as classKey in js/config.js.
const CLASS_KEY = '';

const SHEET_NAME = 'events';
const COLUMNS = ['received_at', 'timestamp', 'session_id', 'student', 'class_code', 'event', 'chapter', 'item_id',
  'prompt', 'choice', 'correct_answer', 'correct', 'time_ms', 'points', 'total_points'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
}

/** Stops spreadsheet formula injection: a cell starting with = + - @ is stored as plain text. */
function clean_(v, max) {
  let s = v === null || v === undefined ? '' : String(v);
  s = s.slice(0, max || 300);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (CLASS_KEY && body.key !== CLASS_KEY) return text_('bad key');
    const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
    if (!events.length) return text_('no events');
    setup();
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const now = new Date().toISOString();
    const rows = events.map(function (ev) {
      return [now, clean_(ev.timestamp, 40), clean_(ev.session_id, 60), clean_(ev.student, 40), clean_(ev.class_code, 30),
        clean_(ev.event, 30), clean_(ev.chapter, 10), clean_(ev.item_id, 60), clean_(ev.prompt, 300), clean_(ev.choice, 300),
        clean_(ev.correct_answer, 200), num_(ev.correct), num_(ev.time_ms), num_(ev.points), num_(ev.total_points)];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, COLUMNS.length).setValues(rows);
    return text_('ok ' + rows.length);
  } catch (err) {
    return text_('error ' + err);
  } finally {
    lock.releaseLock();
  }
}

function num_(v) {
  if (v === '' || v === null || v === undefined) return '';
  const n = Number(v);
  return isFinite(n) ? n : '';
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action !== 'leaderboard') return text_('Byteville tracker is running.');
  const cls = String(p['class'] || '').toUpperCase().slice(0, 30);
  const cache = CacheService.getScriptCache();
  const key = 'lb_' + cls;
  const hit = cache.get(key);
  if (hit) return json_(hit);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const best = {};
  if (sh && sh.getLastRow() > 1) {
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, COLUMNS.length).getValues();
    const iStudent = COLUMNS.indexOf('student'), iClass = COLUMNS.indexOf('class_code');
    const iEvent = COLUMNS.indexOf('event'), iChapter = COLUMNS.indexOf('chapter'), iTotal = COLUMNS.indexOf('total_points');
    data.forEach(function (r) {
      if (String(r[iClass]).toUpperCase() !== cls) return;
      const name = String(r[iStudent]);
      if (!name) return;
      const b = best[name] || (best[name] = { student: name, points: 0, chapters: {} });
      if (r[iEvent] === 'chapter_complete') {
        b.points = Math.max(b.points, Number(r[iTotal]) || 0);
        b.chapters[r[iChapter]] = true;
      }
    });
  }
  const rows = Object.keys(best).map(function (k) {
    return { student: best[k].student, points: best[k].points, chapters: Object.keys(best[k].chapters).length };
  }).sort(function (a, b) { return b.points - a.points; }).slice(0, 10);
  const out = JSON.stringify({ rows: rows });
  cache.put(key, out, 60);
  return json_(out);
}

function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }
function json_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }
