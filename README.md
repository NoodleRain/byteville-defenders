# Byteville Defenders

A guided cybersecurity game for beginners (about 45 minutes). Students protect a small town called Byteville. Each building on the town map is a chapter: Officer Ada explains one idea in plain language, asks a quick check question, then the student plays a short challenge.

Written for CYBR 2000 Introduction to Cybersecurity and for younger learners (about age 15 and up).

| # | Place | Topic | Challenge | Minutes |
| --- | --- | --- | --- | --- |
| 1 | Town Hall | What is cybersecurity? The CIA triad | Sort 8 problems into Confidentiality, Integrity, Availability | 5 |
| 2 | The Locksmith | Passwords and MFA | Pick the stronger password, then 2 real-life situations | 6 |
| 3 | Post Office | Phishing | An inbox with 6 messages: Safe or Phish? | 6 |
| 4 | Hardware Store | Security controls | Prevent, Detect, Fix shelves, then Physical, Technical, Administrative | 6 |
| 5 | City Gate | Firewalls, packets, ports | Timed gate: allow or block 10 packets | 6 |
| 6 | Rule Workshop | Firewall rule order | 3 puzzles: reorder rules until all test packets pass | 5 |
| 7 | Watchtower | Intrusion detection (IDS) | Normal or Alert: signatures and anomalies | 5 |
| 8 | Guard Post | IPS and defense in depth | Final timed gate with IPs, ports, and messages | 6 |

**What keeps students going:** points, streak multipliers (up to x3), speed bonuses, gold packets, stars per chapter, 6 ranks from Rookie to Chief of Security, 14 badges, a class leaderboard, and a certificate at the end. Every answer shows a short explanation, and a wrong answer never ends the game.

## What is in this folder

```
index.html            the website
css/style.css         the design
js/config.js          YOUR settings (tracking URL, class code). Edit this one.
js/app.js             the built game (made from src/ by "npm run build")
src/                  the game source in TypeScript
  content.ts          all lessons and questions. Edit wording here.
  main.ts             screens, points, badges
  tracker.ts          sends answers to your Google Sheet
  stages/             the 5 mini-game types
backend/Code.gs       Google Apps Script that saves answers into a Google Sheet
analytics/            Python report for teachers
```

## Step 1: Put the game on GitHub Pages (5 minutes)

1. Create a new **public** repository on GitHub, for example `byteville-defenders`.
2. Upload everything in this folder **except** `node_modules` (drag the files onto the repository page and commit).
3. Go to **Settings > Pages**. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and click **Save**.
4. After a minute or two the game is live at `https://<your-username>.github.io/byteville-defenders/`.

That link is all students need. The game works right away. Without Step 2, progress stays in each student's own browser.

## Step 2: Collect student answers in a Google Sheet (10 minutes)

GitHub Pages only serves files, so the answers go to a Google Sheet that you own.

1. Create a new Google Sheet, for example "Byteville data".
2. In the Sheet, click **Extensions > Apps Script**. Delete the sample code, paste all of `backend/Code.gs`, and click **Save**.
3. Pick `setup` in the function menu and click **Run**. Approve the permission prompt (it asks to edit this one spreadsheet). A tab named `events` appears with column headers.
4. Click **Deploy > New deployment**. Click the gear and choose **Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. On GitHub, open `js/config.js`, click the pencil, paste the URL as `trackingUrl`, and commit:

   ```js
   trackingUrl: "https://script.google.com/macros/s/XXXX/exec",
   ```

6. Optional: to block strangers from writing to your sheet, set the same secret word as `CLASS_KEY` in Code.gs and `classKey` in config.js, then redeploy the script (**Deploy > Manage deployments > Edit > New version**).

Test it: play the first chapter yourself. Within a few seconds rows appear in the `events` tab, and the leaderboard on the town map shows your score.

### What gets recorded

One row per action: time, a random session id, the name the student typed, class code, event type (start, lesson, check, answer, chapter_complete, finish), chapter, question id, the question, the student's choice, the right answer, right or wrong, milliseconds taken, points, and total points.

Students see this notice on the sign-up screen: "Your teacher will see your answers and scores." Ask students to type only a first name and last initial. If your students are minors, check your school's policy on student data before turning tracking on. You can always run the game without tracking.

## Step 3: Get the class report (Python)

1. In the Sheet, open the `events` tab and click **File > Download > Comma-separated values (.csv)**.
2. On your computer, in the `analytics` folder:

   ```
   pip install -r requirements.txt
   python analyze.py path/to/Byteville-data-events.csv
   ```

   Add `--class CYBR-2000` to include only one class.
3. Open `analytics/report/report.html`. It shows:
   - how many students played and finished, and the class accuracy
   - a **Reteach next class** list: questions under 60% right, with the most common wrong answer
   - **Students to check in with**: under 60% right, skimming the lessons (under 8 seconds each), or stopped early
   - charts by chapter, the 10 hardest questions, points per student
   - `students.csv`, `questions.csv`, and `chapters.csv` for your gradebook

To see a report before any students play: `python make_sample_data.py` then `python analyze.py`. The sample uses fake names ("Sample Student 01").

## Changing the game

All words, questions, and answers are in `src/content.ts`. After you edit anything in `src/`, rebuild once:

```
npm install
npm run build      # type-checks the TypeScript and writes js/app.js
npm run items      # refreshes analytics/items.json for the report
```

Commit the new `js/app.js`. GitHub Pages updates in about a minute.

## Classroom tips

- Project the Town Hall lesson and do the first sort together, then let students continue alone.
- Students on a shared computer should use **Switch player** on their profile page before starting.
- Progress is saved per browser. Clearing browser data starts over, but answers already sent to your sheet stay.
- A small prize for the top of the leaderboard or the first certificate works well.
- Keyboard: `1` `2` `3` in sorting games, `A` allow and `B` block at the gate.

## Notes

All IP addresses in the game come from ranges reserved for teaching and documentation (192.0.2.x, 198.51.100.x, 203.0.113.x) and the private range 10.x.x.x. Breach figures in the lessons come from the Verizon 2026 Data Breach Investigations Report.
