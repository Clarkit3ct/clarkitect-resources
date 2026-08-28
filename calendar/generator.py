#!/usr/bin/env python3
# ============================================================
# project: clarkitect / clarity-calendar — THE CANON FILE
# date: 2026-08-28 (v3; v1 2026-08-19)
# status: source of truth — edit here, regenerate, re-print
# what: emits the year-at-a-glance wall calendar as print-exact
#       HTML (@page 48in x 36in). Change YEAR, HOLIDAYS, colors,
#       or line weights below, then:
#         python3 generator.py
#         chrome --headless --no-pdf-header-footer \
#           --print-to-pdf=2027-clarity-calendar.pdf <the html>
# v3: dead days (short months) now hatched inside a full
#     31-column frame — no more ragged right edge.
# ============================================================
import calendar
import os

YEAR = 2027
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   f"{YEAR}-clarity-calendar.html")

MONTH_LABELS = ["JAN", "FEB", "MAR", "APRIL", "MAY", "JUNE",
                "JULY", "AUGUST", "SEPT", "OCT", "NOV", "DEC"]
WEEKDAYS = ["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"]  # Monday=0


def nth_weekday(year, month, weekday, n):
    """nth occurrence (1-based) of weekday (Mon=0) in month; n=-1 for last."""
    days = [d for d in range(1, calendar.monthrange(year, month)[1] + 1)
            if calendar.weekday(year, month, d) == weekday]
    return days[n - 1] if n > 0 else days[-1]


HOLIDAYS = {
    (1, 1): "NEW YEAR'S DAY",
    (1, nth_weekday(YEAR, 1, 0, 3)): "MLK DAY",
    (2, nth_weekday(YEAR, 2, 0, 3)): "PRESIDENTS' DAY",
    (5, nth_weekday(YEAR, 5, 0, -1)): "MEMORIAL DAY",
    (6, 19): "JUNETEENTH",
    (7, 4): "INDEPENDENCE DAY",
    (9, nth_weekday(YEAR, 9, 0, 1)): "LABOR DAY",
    (10, nth_weekday(YEAR, 10, 0, 2)): "INDIGENOUS PEOPLES' DAY",
    (11, 11): "VETERANS DAY",
    (11, nth_weekday(YEAR, 11, 3, 4)): "THANKSGIVING",
    (12, 25): "CHRISTMAS",
}

rows_html = []
for m in range(1, 13):
    _, ndays = calendar.monthrange(YEAR, m)
    label = MONTH_LABELS[m - 1]
    head_cells = []
    body_cells = []
    for d in range(1, ndays + 1):
        wd = calendar.weekday(YEAR, m, d)
        cls = ""
        if d == 1:
            cls += " first"
        elif wd == 0:
            cls += " wk"          # week start — medium line
        if d == ndays:
            cls += " last"
        if wd >= 5:
            cls += " wknd"
        hol = HOLIDAYS.get((m, d))
        hol_html = f'<span class="hol">{hol}</span>' if hol else ""
        head_cells.append(
            f'<div class="dh{cls}"><span class="num">{d:02d}</span>'
            f'<span class="day">{WEEKDAYS[wd]}</span></div>'
        )
        body_cells.append(f'<div class="db{cls}">{hol_html}</div>')
    fill = 31 - ndays
    # Dead days: one hatched block spanning header + body, completing the square
    filler = (f'<div class="fill" style="grid-column: {ndays + 1} / 32; grid-row: 1 / 3"></div>'
              if fill else "")
    rows_html.append(f'''    <div class="month-row">
      <div class="mlabel left"><span>{label}</span></div>
      <div class="grid">
{"".join(head_cells)}
{"".join(body_cells)}{filler}
      </div>
      <div class="mlabel right"><span>{label}</span></div>
    </div>''')

months = "\n".join(rows_html)

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{YEAR} Clarity Calendar — 48x36 Print</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  @page {{ size: 48in 36in; margin: 0; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{ background: #fff; }}
  body {{ width: 48in; height: 36in; font-family: 'Oswald', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif; color: #111; }}

  /* Line hierarchy — drawing-set weights */
  :root {{
    --w1: 0.034in solid #0d0d0d;   /* heavy: month frame */
    --w2: 0.019in solid #0d0d0d;   /* medium: header base + week starts */
    --w3: 0.009in solid #a8a196;   /* hairline: day separators */
  }}

  .sheet {{
    width: 48in; height: 36in;
    padding: 0.32in 0.38in 0.26in;
    display: flex; flex-direction: column;
    background: #fff;
  }}

  /* ── Header band ── */
  .band {{
    height: 3.0in; flex: none;
    margin-bottom: 0.22in;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background-color: #f4f4f4;
    background-image:
      radial-gradient(ellipse 58% 130% at 50% 50%, #ffffff 26%, rgba(255,255,255,0) 76%),
      repeating-linear-gradient(112deg, rgba(110,110,110,.30) 0 0.018in, rgba(255,255,255,0) 0.018in 0.10in),
      repeating-linear-gradient(112deg, rgba(150,150,150,.16) 0 0.05in, rgba(255,255,255,0) 0.05in 0.24in),
      linear-gradient(180deg, #efefef, #fbfbfb);
  }}
  .band h1 {{
    font-family: 'Anton', 'Arial Narrow', sans-serif;
    font-size: 1.62in; line-height: 1;
    letter-spacing: 0.035em;
    color: #0d0d0d;
    text-transform: uppercase;
    white-space: nowrap;
  }}
  .band .rule {{
    width: 32in; height: 0.085in;
    background: #0d0d0d;
    margin-top: 0.17in;
  }}

  /* ── Month rows ── */
  .months {{ flex: 1; display: flex; flex-direction: column; gap: 0.13in; }}
  .month-row {{ flex: 1; display: flex; align-items: stretch; }}

  .mlabel {{
    width: 0.72in; flex: none;
    display: flex; align-items: center; justify-content: center;
  }}
  .mlabel span {{
    font-weight: 700; font-size: 0.37in; letter-spacing: 0.08em;
    color: #0d0d0d; white-space: nowrap;
  }}
  .mlabel.left span  {{ writing-mode: vertical-rl; transform: rotate(180deg); }}
  .mlabel.right span {{ writing-mode: vertical-rl; }}

  .grid {{
    flex: 1;
    display: grid;
    grid-template-columns: repeat(31, 1fr);
    grid-template-rows: 0.40in 1fr;
  }}

  /* Day header cells — heavy frame top, medium base, hairline separators */
  .dh {{
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 0.08in;
    border-top: var(--w1);
    border-bottom: var(--w2);
    border-left: var(--w3);
    background: #fff;
    font-weight: 600; font-size: 0.20in; letter-spacing: 0.01em;
    line-height: 1;
  }}
  .dh .num {{ font-weight: 700; }}
  .dh.wk    {{ border-left: var(--w2); }}
  .dh.first {{ border-left: var(--w1); }}
  .dh.last  {{ border-right: var(--w1); }}

  /* Day body cells */
  .db {{
    border-bottom: var(--w1);
    border-left: var(--w3);
    background: #fff;
    display: flex; flex-direction: column;
    justify-content: flex-end; align-items: center;
    padding-bottom: 0.07in;
  }}
  .db.wk    {{ border-left: var(--w2); }}
  .db.first {{ border-left: var(--w1); }}
  .db.last  {{ border-right: var(--w1); }}

  /* Weekend shading — full column, header + body */
  .wknd {{ background: #f4dcc3 !important; }}

  /* Holiday labels — small, warm, out of the writing area */
  .hol {{
    font-weight: 600; font-size: 0.13in;
    letter-spacing: 0.055em;
    color: #966d49;
    white-space: nowrap;
  }}

  /* Dead days — hatched poché completing the 31-column square.
     The last real day's heavy right border is the terminus line. */
  .fill {{
    border-top: var(--w1);
    border-right: var(--w1);
    border-bottom: var(--w1);
    background-color: #f3f1ed;
    background-image: repeating-linear-gradient(45deg,
      rgba(13,13,13,.085) 0 0.025in, rgba(0,0,0,0) 0.025in 0.15in);
  }}

  /* Signature strip */
  .foot {{
    flex: none; height: 0.30in;
    display: flex; justify-content: space-between; align-items: flex-end;
    padding-top: 0.10in;
    font-weight: 600; font-size: 0.15in;
    letter-spacing: 0.16em; color: #8b857b;
  }}

  @media print {{
    html, body {{ width: 48in; height: 36in; overflow: hidden; }}
    .sheet {{ page-break-after: avoid; }}
  }}

  /* Screen preview only — print output is unaffected */
  @media screen {{
    body {{ background: #565656; width: auto; height: auto; }}
    .sheet {{ zoom: 0.27; margin: 40px auto; box-shadow: 0 12px 48px rgba(0,0,0,.45); }}
  }}
</style>
</head>
<body>
  <div class="sheet">
    <div class="band">
      <h1>{YEAR} Clarity Calendar</h1>
      <div class="rule"></div>
    </div>
    <div class="months">
{months}
    </div>
    <div class="foot">
      <span>365 DAYS &middot; 52 WEEKS &middot; ONE SHEET</span>
      <span>THE CLARKITECT &middot; {YEAR}</span>
    </div>
  </div>
</body>
</html>
'''

with open(OUT, "w") as f:
    f.write(html)
print(f"wrote {OUT}")
