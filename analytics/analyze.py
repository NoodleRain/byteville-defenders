"""Byteville Defenders: teacher report.

Turns the game data from your Google Sheet into a one-page report:
  - each student's points, chapters finished, accuracy, and time
  - which questions the class missed most, and the most common wrong answer
  - a short "reteach" list and students who may need a check-in

How to use
  1. In your Google Sheet: File > Download > Comma-separated values (.csv), events tab.
  2. python analyze.py path/to/your-download.csv
     (or try it first with the sample:  python make_sample_data.py  then  python analyze.py)
  3. Open report/report.html in any browser.

Optional:  --class CYBR-2000   only include one class code
           --out myfolder      choose where the report goes
"""
import argparse
import base64
import html
import io
import json
from datetime import datetime
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

HERE = Path(__file__).parent
INK, SUN, TEAL, CORAL, LEAF, LINE = "#2E2A3B", "#F5A623", "#17807E", "#E8604C", "#3C9D5D", "#EADCC8"


def load(path: str, class_code: str | None) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str).fillna("")
    for col in ("correct", "time_ms", "points", "total_points"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["ts"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df["class_code"] = df["class_code"].str.upper().str.strip()
    df["student"] = df["student"].str.strip()
    if class_code:
        df = df[df["class_code"] == class_code.upper()]
    df = df[df["student"] != ""]
    # The game may resend a batch if the network drops. Remove exact duplicates.
    return df.drop_duplicates(subset=["session_id", "timestamp", "event", "item_id", "choice"])


def item_key(item_id: str) -> str:
    # Rule-order puzzles log every attempt (c6-o1-try1, -try2...). Keep the puzzle id.
    return item_id.split("-try")[0]


def student_table(df: pd.DataFrame) -> pd.DataFrame:
    ans = df[df["event"].isin(["answer", "check"])]
    done = df[df["event"] == "chapter_complete"]
    lessons = df[df["event"] == "lesson"]
    g = df.groupby(["class_code", "student"])
    out = pd.DataFrame({
        "points": g["total_points"].max(),
        "chapters_done": done.groupby(["class_code", "student"])["chapter"].nunique(),
        "answers": ans.groupby(["class_code", "student"]).size(),
        "accuracy_pct": ans.groupby(["class_code", "student"])["correct"].mean() * 100,
        "minutes_played": done.groupby(["class_code", "student"])["time_ms"].sum() / 60000,
        "median_lesson_sec": lessons.groupby(["class_code", "student"])["time_ms"].median() / 1000,
        "last_seen": g["ts"].max(),
    }).reset_index()
    out = out.fillna({"chapters_done": 0, "answers": 0, "points": 0})
    out["chapters_done"] = out["chapters_done"].astype(int)
    out["answers"] = out["answers"].astype(int)
    out["points"] = out["points"].astype(int)

    def note(r):
        notes = []
        if r.answers >= 10 and r.accuracy_pct < 60:
            notes.append("needs help: under 60% right")
        if pd.notna(r.median_lesson_sec) and r.median_lesson_sec < 8:
            notes.append("skimming lessons")
        if r.chapters_done < 8:
            notes.append(f"stopped after {r.chapters_done} of 8")
        return "; ".join(notes)
    out["check_in"] = out.apply(note, axis=1)
    for c in ("accuracy_pct", "minutes_played", "median_lesson_sec"):
        out[c] = out[c].round(1)
    return out.sort_values(["points"], ascending=False)


def item_table(df: pd.DataFrame, items: dict) -> pd.DataFrame:
    ans = df[df["event"].isin(["answer", "check"])].copy()
    ans["key"] = ans["item_id"].map(item_key)
    # For rule-order puzzles count only the first try, so the rate means "solved on the first try".
    ans = ans[~ans["item_id"].str.contains("-try") | ans["item_id"].str.endswith("-try1")]
    rows = []
    for key, grp in ans.groupby("key"):
        wrong = grp[grp["correct"] == 0]["choice"]
        info = items.get(key, {})
        rows.append({
            "item_id": key,
            "chapter": info.get("place", grp["chapter"].iloc[0]),
            "question": info.get("prompt", grp["prompt"].iloc[0])[:120],
            "kind": info.get("kind", ""),
            "attempts": len(grp),
            "pct_correct": round(grp["correct"].mean() * 100, 1),
            "common_wrong_answer": wrong.mode().iloc[0] if len(wrong) else "",
            "right_answer": info.get("answer", grp["correct_answer"].iloc[0]),
        })
    return pd.DataFrame(rows).sort_values("pct_correct")


def chapter_table(df: pd.DataFrame, items: dict) -> pd.DataFrame:
    places = {v["chapter"]: v["place"] for v in items.values()}
    ans = df[df["event"].isin(["answer", "check"])]
    done = df[df["event"] == "chapter_complete"].copy()
    done["stars"] = pd.to_numeric(done["choice"].str.extract(r"(\d)")[0], errors="coerce")
    t = pd.DataFrame({
        "accuracy_pct": ans.groupby("chapter")["correct"].mean() * 100,
        "students_finished": done.groupby("chapter")["student"].nunique(),
        "avg_stars": done.groupby("chapter")["stars"].mean(),
        "median_minutes": done.groupby("chapter")["time_ms"].median() / 60000,
    }).reset_index()
    t.insert(1, "place", t["chapter"].map(places))
    t = t.round(1)
    return t.sort_values("chapter")


def fig_to_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="#FFFDF8")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def style(ax):
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(LINE)
    ax.tick_params(colors=INK, labelsize=9)
    ax.set_facecolor("#FFFDF8")


def charts(students, items_t, chapters, out: Path) -> dict:
    imgs = {}
    # 1. Accuracy by chapter
    fig, ax = plt.subplots(figsize=(7.5, 3.2))
    labels = [f"{r.chapter[1:]}. {r.place}" for r in chapters.itertuples()]
    vals = chapters["accuracy_pct"].tolist()
    bars = ax.bar(labels, vals, color=[CORAL if v < 70 else SUN if v < 85 else LEAF for v in vals], edgecolor=INK, linewidth=.8)
    ax.bar_label(bars, labels=[f"{v:.0f}%" for v in vals], fontsize=8, color=INK, padding=2)
    ax.set_ylim(0, 105)
    ax.set_ylabel("% answers right", color=INK)
    ax.set_title("Class accuracy by chapter", color=INK, loc="left", fontsize=11, fontweight="bold")
    plt.setp(ax.get_xticklabels(), rotation=20, ha="right")
    style(ax)
    imgs["chapters"] = fig_to_b64(fig)

    # 2. Hardest questions
    hard = items_t[items_t["attempts"] >= 3].head(10).iloc[::-1]
    fig, ax = plt.subplots(figsize=(7.5, 3.8))
    lab = [(q[:52] + "...") if len(q) > 55 else q for q in hard["question"]]
    b = ax.barh(lab, hard["pct_correct"], color=[CORAL if v < 60 else SUN for v in hard["pct_correct"]], edgecolor=INK, linewidth=.8)
    ax.bar_label(b, labels=[f"{v:.0f}%" for v in hard["pct_correct"]], fontsize=8, color=INK, padding=2)
    ax.set_xlim(0, 105)
    ax.set_xlabel("% right", color=INK)
    ax.set_title("10 hardest questions", color=INK, loc="left", fontsize=11, fontweight="bold")
    style(ax)
    imgs["hardest"] = fig_to_b64(fig)

    # 3. Points per student
    s = students.sort_values("points")
    fig, ax = plt.subplots(figsize=(7.5, max(2.5, .22 * len(s) + .8)))
    b = ax.barh(s["student"], s["points"], color=TEAL, edgecolor=INK, linewidth=.6)
    ax.bar_label(b, labels=[str(v) for v in s["points"]], fontsize=7, color=INK, padding=2)
    ax.set_xlabel("points", color=INK)
    ax.set_title("Points per student", color=INK, loc="left", fontsize=11, fontweight="bold")
    style(ax)
    imgs["students"] = fig_to_b64(fig)

    for k, v in imgs.items():
        (out / f"chart_{k}.png").write_bytes(base64.b64decode(v))
    return imgs


def table_html(df: pd.DataFrame, fmt: dict | None = None) -> str:
    fmt = fmt or {}
    head = "".join(f"<th>{html.escape(c.replace('_', ' '))}</th>" for c in df.columns)
    body = []
    for _, r in df.iterrows():
        cells = []
        for c in df.columns:
            v = r[c]
            if c in fmt and pd.notna(v):
                v = fmt[c](v)
            elif pd.isna(v):
                v = ""
            cells.append(f"<td>{html.escape(str(v))}</td>")
        body.append("<tr>" + "".join(cells) + "</tr>")
    return f"<div class='tw'><table><thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table></div>"


def main():
    ap = argparse.ArgumentParser(description="Byteville Defenders teacher report")
    ap.add_argument("csv", nargs="?", default=str(HERE / "sample_events.csv"), help="CSV downloaded from your Google Sheet")
    ap.add_argument("--class", dest="class_code", default=None, help="only this class code")
    ap.add_argument("--out", default=str(HERE / "report"), help="output folder")
    a = ap.parse_args()

    items = {i["item_id"]: i for i in json.loads((HERE / "items.json").read_text())}
    df = load(a.csv, a.class_code)
    if df.empty:
        raise SystemExit("No rows found. Check the file and the --class value.")
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    students = student_table(df)
    items_t = item_table(df, items)
    chapters = chapter_table(df, items)
    students.drop(columns=["last_seen"]).to_csv(out / "students.csv", index=False)
    items_t.to_csv(out / "questions.csv", index=False)
    chapters.to_csv(out / "chapters.csv", index=False)
    imgs = charts(students, items_t, chapters, out)

    reteach = items_t[(items_t["pct_correct"] < 60) & (items_t["attempts"] >= 3)]
    check_in = students[students["check_in"] != ""][["student", "class_code", "points", "chapters_done", "accuracy_pct", "check_in"]]
    n = len(students)
    finished = int((students["chapters_done"] >= 8).sum())
    avg_acc = df[df["event"].isin(["answer", "check"])]["correct"].mean() * 100
    pct = lambda v: f"{v:.0f}%"  # noqa: E731
    one = lambda v: f"{v:.1f}"  # noqa: E731

    reteach_html = "".join(
        f"<li><b>{html.escape(r.question)}</b> ({html.escape(str(r.chapter))}): {r.pct_correct:.0f}% right. "
        f"Most common wrong answer: <i>{html.escape(str(r.common_wrong_answer))}</i>. Right answer: {html.escape(str(r.right_answer))}.</li>"
        for r in reteach.itertuples()) or "<li>Nothing under 60%. Nice work, class.</li>"

    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Byteville class report</title><style>
body{{font:15px/1.55 system-ui,'Segoe UI',sans-serif;color:{INK};background:#FFF3E3;margin:0}}
.w{{max-width:1000px;margin:0 auto;padding:24px 16px 48px}}h1{{margin:.2em 0}}h2{{margin-top:1.8em}}
.k{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0}}
.k div{{background:#FFFDF8;border:1px solid {LINE};border-radius:12px;padding:12px}}.k b{{display:block;font-size:26px}}
img{{max-width:100%;background:#FFFDF8;border:1px solid {LINE};border-radius:12px;margin:8px 0}}
.tw{{overflow-x:auto;background:#FFFDF8;border:1px solid {LINE};border-radius:12px}}table{{border-collapse:collapse;width:100%;font-size:13px}}
th,td{{text-align:left;padding:7px 10px;border-bottom:1px solid {LINE};vertical-align:top}}th{{background:#FFE7B8;position:sticky;top:0}}
.muted{{color:#5E586E}}li{{margin-bottom:.4em}}</style></head><body><div class="w">
<p class="muted">Byteville Defenders · class report · generated {datetime.now():%B %d, %Y %I:%M %p}{' · class ' + html.escape(a.class_code.upper()) if a.class_code else ''}</p>
<h1>How the class did</h1>
<div class="k"><div><b>{n}</b>students played</div><div><b>{finished}</b>finished all 8 chapters</div>
<div><b>{avg_acc:.0f}%</b>answers right</div><div><b>{int(students['points'].median()) if n else 0}</b>median points</div></div>
<h2>Reteach next class</h2><p class="muted">Questions fewer than 60% of attempts got right.</p><ul>{reteach_html}</ul>
<img src="data:image/png;base64,{imgs['chapters']}" alt="Class accuracy by chapter">
<img src="data:image/png;base64,{imgs['hardest']}" alt="Hardest questions">
<h2>Students to check in with</h2>{table_html(check_in, {'accuracy_pct': pct}) if len(check_in) else '<p>Everyone is on track.</p>'}
<h2>All students</h2>{table_html(students.drop(columns=['last_seen']), {'accuracy_pct': pct, 'minutes_played': one, 'median_lesson_sec': one})}
<img src="data:image/png;base64,{imgs['students']}" alt="Points per student">
<h2>Chapters</h2>{table_html(chapters, {'accuracy_pct': pct, 'avg_stars': one, 'median_minutes': one})}
<h2>Every question</h2>{table_html(items_t, {'pct_correct': lambda v: f'{v:.0f}%'})}
<p class="muted">Also saved next to this file: students.csv, questions.csv, chapters.csv, and the chart images.</p>
</div></body></html>"""
    (out / "report.html").write_text(page, encoding="utf-8")
    print(f"Report ready: {out / 'report.html'}  ({n} students, {len(df)} rows)")


if __name__ == "__main__":
    main()
