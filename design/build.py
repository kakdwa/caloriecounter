# Generates the five .dc.html artboards for the calorie tracker redesign.
import os
OUT = os.path.dirname(os.path.abspath(__file__))

HEAD_T = '''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&amp;family=Instrument+Serif:ital@0;1&amp;display=swap">
  <style>
    body { margin: 0; background: #FAFAF8; font-family: 'Instrument Sans', -apple-system, 'Helvetica Neue', sans-serif; color: #161615; -webkit-font-smoothing: antialiased; }
    a { color: ACCENT_A; } a:hover { color: ACCENT_B; }
    * { box-sizing: border-box; }
  </style>
</helmet>
'''
HEAD = HEAD_T.replace('ACCENT_A', os.environ.get('ACCENT', '#177BA8')).replace('ACCENT_B', os.environ.get('ACCENT_D', '#005783'))
TAIL = '''</x-dc>
</body>
</html>
'''

SERIF = "font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;"
SANS = "font-family: 'Instrument Sans', -apple-system, 'Helvetica Neue', sans-serif;"
INK, INK2, INK3, HAIR = "#161615", "#6E6E69", "#A3A39E", "#ECECE8"
GREEN   = os.environ.get("ACCENT",   "#177BA8")
GREEN_D = os.environ.get("ACCENT_D", "#005783")
TINT    = os.environ.get("TINT",     "#E4F3FC")
TINT2   = os.environ.get("TINT2",    "#C2E4F8")
SUFFIX  = os.environ.get("SUFFIX", "")
ONLY    = [x for x in os.environ.get("ONLY", "").split(",") if x]

def frame(inner, bottom=None):
    b = f'<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 0 24px 40px 24px; background: linear-gradient(180deg, rgba(250,250,248,0) 0%, #FAFAF8 32px);">{bottom}</div>' if bottom else ''
    return (f'<div style="position: relative; width: 390px; height: 844px; overflow: hidden; background: #FAFAF8;">'
            f'<div style="display: flex; flex-direction: column; padding: 64px 24px 0 24px;">{inner}</div>{b}</div>')

def mic(size=40, bg=GREEN, fg="#FFFFFF"):
    return (f'<div style="display: flex; align-items: center; justify-content: center; width: {size}px; height: {size}px; border-radius: 999px; background: {bg}; flex-shrink: 0;">'
            f'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{fg}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><path d="M12 18v3"></path></svg></div>')

def input_pill(placeholder, muted=True, text=None):
    label = text or placeholder
    color = INK if text else INK3
    return (f'<div style="display: flex; align-items: center; gap: 16px; height: 56px; padding: 0 8px 0 24px; border-radius: 28px; background: #FFFFFF; border: 1px solid {HAIR}; box-shadow: 0 8px 24px rgba(22,22,21,0.06);">'
            f'<div style="flex-grow: 1; font-size: 16px; line-height: 24px; color: {color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{label}</div>{mic()}</div>')

def button(label):
    return (f'<div style="display: flex; align-items: center; justify-content: center; height: 56px; border-radius: 28px; background: {GREEN}; color: #FFFFFF; font-size: 16px; font-weight: 500; letter-spacing: -0.01em;">{label}</div>')

def eyebrow(text):
    return f'<div style="font-size: 13px; line-height: 16px; color: {INK2};">{text}</div>'

def h1(text):
    return f'<h1 style="margin: 0; {SERIF} font-weight: 400; font-size: 36px; line-height: 40px; letter-spacing: -0.01em; color: {INK};">{text}</h1>'

def meter(pct, h=4, fill=GREEN, track=TINT):
    return (f'<div style="height: {h}px; border-radius: {h}px; background: {track}; overflow: hidden;">'
            f'<div style="width: {pct}%; height: {h}px; border-radius: {h}px; background: {fill};"></div></div>')

def macro_tile(name, val, goal, note=None):
    pct = round(val / goal * 100)
    n = f'<div style="font-size: 13px; line-height: 16px; color: {INK2};">{note}</div>' if note else ''
    return (f'<div style="display: flex; flex-direction: column; gap: 8px;">'
            f'<div style="font-size: 13px; line-height: 16px; color: {INK2};">{name}</div>'
            f'<div style="display: flex; align-items: baseline; gap: 4px;"><span style="font-size: 20px; line-height: 24px; font-weight: 500; letter-spacing: -0.02em;">{val}</span><span style="font-size: 13px; color: {INK3};">/ {goal} g</span></div>'
            f'{meter(min(pct,100))}{n}</div>')

def icon_btn(svg):
    return (f'<div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 22px; background: #FFFFFF; border: 1px solid {HAIR};">{svg}</div>')

CHART_ICON = f'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V11"></path><path d="M10 19V5"></path><path d="M16 19v-8"></path><path d="M22 19H2"></path></svg>'
BACK_ICON = f'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"></path></svg>'
CHECK = f'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{GREEN}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"></path></svg>'

# ---------------------------------------------------------------- Goal (onboarding)
sample = "I&#39;m 34, 5&#39;10&quot;, 182 lb. I lift three mornings a week and walk the dog most days. I want to get to 170 by Christmas without losing muscle."
goal_inner = (
    f'<div style="display: flex; flex-direction: column; gap: 16px;">'
    f'{h1("Tell me about you, and what you&#39;re after.")}'
    f'<div style="font-size: 16px; line-height: 24px; color: {INK2}; text-wrap: pretty;">Age, height, weight, how you move, what you want. Say it however you like.</div>'
    f'</div>'
    f'<div style="height: 32px;"></div>'
    f'<div style="display: flex; flex-direction: column; gap: 24px; min-height: 264px; padding: 24px; border-radius: 24px; background: #FFFFFF; border: 1px solid {HAIR};">'
    f'<div style="flex-grow: 1; font-size: 18px; line-height: 28px; color: {INK}; text-wrap: pretty;">{sample}<span style="display: inline-block; width: 2px; height: 22px; margin-left: 2px; vertical-align: -4px; background: {GREEN};"></span></div>'
    f'<div style="display: flex; align-items: center; justify-content: space-between;">'
    f'<div style="font-size: 13px; line-height: 16px; color: {INK3};">Or just say it</div>{mic()}</div>'
    f'</div>'
)
goal_bottom = (
    f'<div style="display: flex; flex-direction: column; gap: 16px;">{button("Build my plan")}'
    f'<div style="text-align: center; font-size: 13px; line-height: 16px; color: {INK3};">Change anything later, just by asking.</div></div>'
)

# ---------------------------------------------------------------- Plan
def plan_macro(name, grams, why):
    return (f'<div style="display: flex; flex-direction: column; gap: 8px;">'
            f'<div style="font-size: 13px; line-height: 16px; color: {INK2};">{name}</div>'
            f'<div style="font-size: 24px; line-height: 28px; font-weight: 500; letter-spacing: -0.02em;">{grams}<span style="font-size: 14px; font-weight: 400; color: {INK3};"> g</span></div>'
            f'<div style="{SERIF} font-style: italic; font-size: 15px; line-height: 20px; color: {INK2}; text-wrap: pretty;">{why}</div></div>')

plan_inner = (
    f'<div style="display: flex; flex-direction: column; gap: 16px;">'
    f'{h1("Your plan.")}'
    f'<div style="font-size: 16px; line-height: 24px; color: {INK2}; text-wrap: pretty;">A gentle deficit with protein kept high, so the 12 lb you lose by December 25 is fat, not muscle. About three quarters of a pound a week.</div>'
    f'</div>'
    f'<div style="height: 40px;"></div>'
    f'<div style="display: flex; flex-direction: column; gap: 8px;">'
    f'<div style="display: flex; align-items: baseline; gap: 8px;"><span style="font-size: 64px; line-height: 64px; font-weight: 500; letter-spacing: -0.03em;">2,150</span><span style="font-size: 16px; color: {INK2};">kcal a day</span></div>'
    f'<div style="font-size: 13px; line-height: 16px; color: {INK3};">Your body burns about 2,700. A little less on rest days is fine.</div>'
    f'</div>'
    f'<div style="height: 40px;"></div>'
    f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">'
    f'{plan_macro("Protein", 175, "Just under a gram per pound, to keep your lifts.")}'
    f'{plan_macro("Carbs", 215, "Most of it around training.")}'
    f'{plan_macro("Fat", 65, "Enough for hormones and feeling full.")}'
    f'</div>'
    f'<div style="height: 40px;"></div>'
    f'<div style="display: flex; align-items: center; gap: 16px; padding: 16px 0; border-top: 1px solid {HAIR}; border-bottom: 1px solid {HAIR};">'
    f'<div style="flex-grow: 1;"><div style="font-size: 13px; line-height: 16px; color: {INK2};">Today</div><div style="font-size: 16px; line-height: 24px; font-weight: 500;">182 lb</div></div>'
    f'<svg width="80" height="12" viewBox="0 0 80 12" fill="none" stroke="{INK3}" stroke-width="1.5" stroke-linecap="round"><path d="M2 6h74"></path><path d="M72 2l4 4-4 4"></path></svg>'
    f'<div style="flex-grow: 1; text-align: right;"><div style="font-size: 13px; line-height: 16px; color: {INK2};">December 25</div><div style="font-size: 16px; line-height: 24px; font-weight: 500;">170 lb</div></div>'
    f'</div>'
)
plan_bottom = (
    f'<div style="display: flex; flex-direction: column; gap: 16px;">'
    f'{input_pill("Change anything, like &#8220;more carbs on lifting days&#8221;")}'
    f'{button("Start tracking")}</div>'
)

# ---------------------------------------------------------------- Main (Today)
def entry(time, text, kcal, last=False):
    border = '' if last else f'border-bottom: 1px solid {HAIR};'
    return (f'<div style="display: flex; align-items: flex-start; gap: 16px; padding: 16px 0; {border}">'
            f'<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 4px;">'
            f'<div style="font-size: 16px; line-height: 24px; color: {INK}; text-wrap: pretty;">{text}</div>'
            f'<div style="font-size: 13px; line-height: 16px; color: {INK3};">{time}</div></div>'
            f'<div style="display: flex; align-items: baseline; gap: 4px; flex-shrink: 0; padding-top: 2px;"><span style="font-size: 16px; font-weight: 500;">{kcal}</span><span style="font-size: 13px; color: {INK3};">kcal</span></div></div>')

main_inner = (
    f'<div style="display: flex; align-items: flex-start; justify-content: space-between;">'
    f'<div style="display: flex; flex-direction: column; gap: 8px;">{eyebrow("Friday, September 5")}{h1("Good evening.")}</div>'
    f'{icon_btn(CHART_ICON)}</div>'
    f'<div style="height: 40px;"></div>'
    f'<div style="display: flex; flex-direction: column; gap: 16px;">'
    f'<div style="display: flex; align-items: baseline; gap: 8px;"><span style="font-size: 64px; line-height: 64px; font-weight: 500; letter-spacing: -0.03em;">1,140</span><span style="font-size: 16px; color: {INK2};">kcal left</span></div>'
    f'{meter(47, h=6)}'
    f'<div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 16px; color: {INK3};"><span>1,010 eaten</span><span>2,150 goal</span></div>'
    f'</div>'
    f'<div style="height: 32px;"></div>'
    f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">'
    f'{macro_tile("Protein", 98, 175)}{macro_tile("Carbs", 104, 215)}{macro_tile("Fat", 31, 65)}</div>'
    f'<div style="height: 40px;"></div>'
    f'<div style="{SERIF} font-size: 24px; line-height: 28px; color: {INK};">Today</div>'
    f'<div style="display: flex; flex-direction: column; margin-top: 8px;">'
    f'{entry("8:12 AM", "Two eggs, sourdough toast with butter, flat white", 540)}'
    f'{entry("12:40 PM", "Chicken shawarma bowl, half the rice", 470, last=True)}'
    f'</div>'
)
main_bottom = input_pill("What did you eat?")

# ---------------------------------------------------------------- Log (parsed entry)
def parsed_item(name, detail, kcal, p, c, f, last=False):
    border = '' if last else f'border-bottom: 1px solid {HAIR};'
    chip = lambda l, v: f'<span style="font-size: 13px; color: {INK3};">{l} <span style="color: {INK2}; font-weight: 500;">{v}</span></span>'
    return (f'<div style="display: flex; flex-direction: column; gap: 8px; padding: 16px 0; {border}">'
            f'<div style="display: flex; align-items: baseline; gap: 16px;">'
            f'<div style="flex-grow: 1; font-size: 16px; line-height: 24px; font-weight: 500;">{name}</div>'
            f'<div style="display: flex; align-items: baseline; gap: 4px;"><span style="font-size: 16px; font-weight: 500;">{kcal}</span><span style="font-size: 13px; color: {INK3};">kcal</span></div></div>'
            f'<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 16px;">'
            f'<div style="flex-grow: 1; font-size: 13px; line-height: 16px; color: {INK3};">{detail}</div>'
            f'<div style="display: flex; gap: 12px; flex-shrink: 0; white-space: nowrap;">{chip("P", p)}{chip("C", c)}{chip("F", f)}</div></div></div>')

log_inner = (
    f'<div style="display: flex; align-items: flex-start; justify-content: space-between;">'
    f'<div style="display: flex; flex-direction: column; gap: 8px;">{eyebrow("Logging")}{h1("Here&#39;s what I heard.")}</div>'
    f'{icon_btn(BACK_ICON)}</div>'
    f'<div style="height: 32px;"></div>'
    f'<div style="{SERIF} font-style: italic; font-size: 22px; line-height: 30px; color: {INK2}; text-wrap: pretty;">&#8220;Grilled chicken salad from Sweetgreen, no dressing, and an iced oat latte.&#8221;</div>'
    f'<div style="height: 32px;"></div>'
    f'<div style="display: flex; flex-direction: column; padding: 8px 24px; border-radius: 24px; background: #FFFFFF; border: 1px solid {HAIR};">'
    f'{parsed_item("Grilled chicken salad", "Sweetgreen &middot; no dressing", 410, "38g", "22g", "18g")}'
    f'{parsed_item("Iced oat latte", "12 oz &middot; unsweetened, assumed", 130, "3g", "16g", "5g", last=True)}'
    f'</div>'
    f'<div style="height: 24px;"></div>'
    f'<div style="display: flex; align-items: baseline; justify-content: space-between; padding: 0 24px;">'
    f'<div style="font-size: 13px; line-height: 16px; color: {INK2};">Adds up to</div>'
    f'<div style="display: flex; align-items: baseline; gap: 4px;"><span style="font-size: 24px; line-height: 28px; font-weight: 500; letter-spacing: -0.02em;">540</span><span style="font-size: 13px; color: {INK3};">kcal</span></div></div>'
    f'<div style="height: 16px;"></div>'
    f'<div style="display: flex; align-items: center; gap: 8px; padding: 0 24px; font-size: 13px; line-height: 16px; color: {INK2};">{CHECK}<span>Leaves 600 kcal and 39 g protein for tonight.</span></div>'
)
log_bottom = (
    f'<div style="display: flex; flex-direction: column; gap: 16px;">'
    f'{input_pill("Not quite? Say &#8220;half the salad&#8221; or &#8220;it had avocado&#8221;")}'
    f'{button("Add to today")}</div>'
)

# ---------------------------------------------------------------- Progress
W = 342
def bars_svg():
    days = ["M","T","W","T","F","S","S"]
    vals = [2210, 1980, 2090, 2160, 1010, None, None]
    H, MAX, TOP = 120, 2400, 8
    bw, gap = 42, 8
    parts = []
    goal_y = TOP + H - 2150 / MAX * H
    for i, v in enumerate(vals):
        x = i * (bw + gap)
        if v is None:
            parts.append(f'<rect x="{x}" y="{TOP + H - 4}" width="{bw}" height="4" rx="2" fill="{TINT2}"></rect>')
            continue
        h = v / MAX * H
        y = TOP + H - h
        fill = GREEN if i == 4 else TINT2
        r = 4
        parts.append(f'<path d="M{x} {TOP+H} V{y+r} a{r} {r} 0 0 1 {r} -{r} h{bw-2*r} a{r} {r} 0 0 1 {r} {r} V{TOP+H} Z" fill="{fill}"></path>')
    parts.append(f'<line x1="0" y1="{goal_y:.1f}" x2="{W}" y2="{goal_y:.1f}" stroke="{INK3}" stroke-width="1" stroke-dasharray="3 4"></line>')
    parts.append(f'<text x="{W}" y="{goal_y-6:.1f}" text-anchor="end" font-size="11" fill="{INK3}" font-family="Instrument Sans, -apple-system, sans-serif">goal 2,150</text>')
    for i, d in enumerate(days):
        x = i * (bw + gap) + bw / 2
        col = INK if i == 4 else INK3
        parts.append(f'<text x="{x}" y="{TOP+H+20}" text-anchor="middle" font-size="12" fill="{col}" font-family="Instrument Sans, -apple-system, sans-serif">{d}</text>')
    return f'<svg width="{W}" height="{TOP+H+24}" viewBox="0 0 {W} {TOP+H+24}">{"".join(parts)}</svg>'

def line_svg():
    ws = [184.6, 183.8, 183.1, 182.5, 182.0]
    H, TOP = 88, 12
    xs = [16 + i * ((W - 32) / 4) for i in range(5)]
    ys = [TOP + (185 - w) / 4 * H for w in ws]
    pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in zip(xs, ys))
    parts = [f'<polyline points="{pts}" fill="none" stroke="{GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>']
    parts.append(f'<circle cx="{xs[-1]:.1f}" cy="{ys[-1]:.1f}" r="4" fill="{GREEN}" stroke="#FFFFFF" stroke-width="2"></circle>')
    parts.append(f'<text x="{xs[0]:.1f}" y="{ys[0]-10:.1f}" text-anchor="start" font-size="12" fill="{INK2}" font-family="Instrument Sans, -apple-system, sans-serif">184.6</text>')
    parts.append(f'<text x="{xs[-1]:.1f}" y="{ys[-1]-12:.1f}" text-anchor="end" font-size="12" fill="{INK}" font-weight="500" font-family="Instrument Sans, -apple-system, sans-serif">182.0</text>')
    for x, lab in ((xs[0], "Aug 4"), (xs[-1], "Sep 1")):
        anchor = "start" if lab == "Aug 4" else "end"
        parts.append(f'<text x="{x:.1f}" y="{TOP+H+20}" text-anchor="{anchor}" font-size="12" fill="{INK3}" font-family="Instrument Sans, -apple-system, sans-serif">{lab}</text>')
    return f'<svg width="{W}" height="{TOP+H+24}" viewBox="0 0 {W} {TOP+H+24}">{"".join(parts)}</svg>'

def chart_block(title, stat, svg):
    return (f'<div style="display: flex; flex-direction: column; gap: 16px;">'
            f'<div style="display: flex; align-items: baseline; justify-content: space-between;">'
            f'<div style="{SERIF} font-size: 24px; line-height: 28px;">{title}</div>'
            f'<div style="font-size: 13px; line-height: 16px; color: {INK2};">{stat}</div></div>{svg}</div>')

progress_inner = (
    f'<div style="display: flex; align-items: flex-start; justify-content: space-between;">'
    f'<div style="display: flex; flex-direction: column; gap: 8px;">{eyebrow("Week of September 1")}{h1("On track.")}</div>'
    f'{icon_btn(BACK_ICON)}</div>'
    f'<div style="height: 16px;"></div>'
    f'<div style="font-size: 16px; line-height: 24px; color: {INK2}; text-wrap: pretty;">Averaging 2,110 kcal a day, 40 under your goal. Protein landed three days out of four.</div>'
    f'<div style="height: 32px;"></div>'
    f'{chart_block("Intake", "2,110 avg", bars_svg())}'
    f'<div style="height: 32px;"></div>'
    f'{chart_block("Weight", "&minus;2.6 lb in 4 weeks", line_svg())}'
    f'<div style="height: 24px;"></div>'
    f'<div style="display: flex; align-items: center; gap: 8px; padding: 16px 0; border-top: 1px solid {HAIR}; font-size: 13px; line-height: 16px; color: {INK2};">{CHECK}<span>At this pace you reach 170 lb around December 20.</span></div>'
)
progress_bottom = input_pill("Ask anything, like &#8220;why was Tuesday low?&#8221;")

screens = {
    "Goal": (goal_inner, goal_bottom),
    "Plan": (plan_inner, plan_bottom),
    "Main": (main_inner, main_bottom),
    "Log": (log_inner, log_bottom),
    "Progress": (progress_inner, progress_bottom),
}
for name, (inner, bottom) in screens.items():
    if ONLY and name not in ONLY:
        continue
    with open(os.path.join(OUT, f"{name}{SUFFIX}.dc.html"), "w") as fh:
        fh.write(HEAD + frame(inner, bottom) + "\n" + TAIL)
print("wrote", ", ".join(f"{n}.dc.html" for n in screens))
