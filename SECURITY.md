# Security policy

## Reporting a problem

Please do not open a public issue for a security problem. Use GitHub's **Report a vulnerability** button under this repository's **Security** tab, or email **noodlerain9@gmail.com**.

Include what you found, how to reproduce it, and what could happen. You'll get a reply within 7 days. Please give the author a reasonable amount of time to fix the problem before you share it publicly.

Only test against your own installation. Don't test against a live class, a school's server, or student data.

## How Byteville is protected

| Area | Protection |
| --- | --- |
| Scoring | Each school's server re-checks every answer. Scores sent by the browser are never trusted. |
| Night Watch | Answers and passcodes come from each school's secret seed, which is stored only on that school's server. Passcodes are signed with HMAC-SHA256. |
| Abuse | The server limits how fast anyone can submit, caps request sizes, rejects unknown events, and refuses forged level completions. |
| Spreadsheet | Every value is stored as plain text, so nobody can plant a formula in the teacher's Sheet. |
| Website | A Content Security Policy allows no outside scripts and only talks to Google Fonts and the school's server. The page escapes all text it shows. |
| Privacy | Student data stays in the teacher's own Google account. The game collects no email addresses or passwords. |

## Known limits

- Players are not signed in, so a student could type someone else's name. Each player has a random session id to help the teacher spot this.
- Answers for the beginner chapters are in the game so it can give instant feedback. The leaderboard still counts only answers the server checks.
