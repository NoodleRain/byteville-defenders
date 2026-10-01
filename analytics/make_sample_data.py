"""Make a SAMPLE data file so you can try the report before real students play.

Every name here is fake ("Sample Student 01" ...). Run:
    python make_sample_data.py
It writes sample_events.csv in the same columns your Google Sheet uses.
"""
import csv
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).parent
random.seed(7)
items = json.loads((HERE / "items.json").read_text())

# Some items are harder than others, so the sample report has something to show.
HARD = {"c1-s7": .45, "c2-p3": .5, "c3-e6": .55, "c4-s5": .5, "c4-k4": .55, "c6-o3": .35,
        "c7-w4": .4, "c8-lane-tricky-clean": .45, "c8-lane-signature": .6, "c5-lane-blocklist": .55}
WRONG = {"Confidentiality": "Integrity", "Integrity": "Availability", "Availability": "Confidentiality",
         "Phish": "Safe", "Safe": "Phish", "ALLOW": "BLOCK", "BLOCK": "ALLOW", "Normal": "Alert", "Alert": "Normal",
         "Prevent": "Detect", "Detect": "Fix", "Fix": "Prevent"}

COLS = ["received_at", "timestamp", "session_id", "student", "class_code", "event", "chapter", "item_id", "prompt",
        "choice", "correct_answer", "correct", "time_ms", "points", "total_points"]
rows = []
start = datetime(2026, 10, 6, 9, 0)

for s in range(1, 25):
    name = f"Sample Student {s:02d}"
    skill = random.uniform(.55, .97)
    reach = random.choice([8, 8, 8, 8, 7, 6, 5])  # some students run out of time
    t = start + timedelta(minutes=random.randint(0, 4))
    total = 0
    sess = f"s-sample-{s:02d}"

    def add(**kw):
        row = {c: "" for c in COLS}
        row.update(timestamp=t.isoformat(), received_at=t.isoformat(), session_id=sess, student=name, class_code="CYBR-2000")
        row.update(kw)
        rows.append(row)

    add(event="start", choice="avatar 0", points=0, total_points=0)
    chapters = sorted({i["chapter"] for i in items})[:reach]
    for ch in chapters:
        ch_pts, right, n = 0, 0, 0
        for k in range(3 if ch not in ("c6",) else 2):
            secs = random.choice([random.uniform(3, 7), random.uniform(18, 60), random.uniform(20, 45)])
            t += timedelta(seconds=secs)
            add(event="lesson", chapter=ch, item_id=f"{ch}-l{k+1}", prompt="lesson", time_ms=int(secs * 1000), points=5, total_points=total)
            ch_pts += 5
        for it in [i for i in items if i["chapter"] == ch]:
            reps = 5 if it["kind"] == "gate" else 1
            for _ in range(reps):
                p_right = min(.98, skill * HARD.get(it["item_id"], 1.0) / .8)
                ok = random.random() < p_right
                secs = random.uniform(4, 18)
                t += timedelta(seconds=secs)
                pts = random.choice([10, 15, 20]) if ok else 0
                ans = it["answer"]
                choice = ans if ok else WRONG.get(ans, "other answer")
                item_id = it["item_id"] + ("-try1" if it["kind"] == "rule order" else "")
                add(event="check" if it["kind"] == "quick check" else "answer", chapter=ch, item_id=item_id, prompt=it["prompt"],
                    choice=choice, correct_answer=ans, correct=int(ok), time_ms=int(secs * 1000), points=pts, total_points=total + ch_pts)
                ch_pts += pts
                right += ok
                n += 1
        acc = right / max(n, 1)
        stars = 3 if acc >= .9 else 2 if acc >= .7 else 1
        ch_pts += 25 + (25 if stars == 3 else 0)
        total += ch_pts
        t += timedelta(seconds=20)
        add(event="chapter_complete", chapter=ch, item_id=f"{ch}-done", prompt=ch, choice=f"{stars} stars", correct=round(acc * 100),
            time_ms=int(random.uniform(3, 7) * 60000), points=ch_pts, total_points=total)
    if reach == 8:
        add(event="finish", points=0, total_points=total)

out = HERE / "sample_events.csv"
with out.open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows(rows)
print(f"Wrote {len(rows)} sample rows for 24 fake students to {out.name}")
