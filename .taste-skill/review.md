## 2026-10-20 — Interaction continuity and recovery context

- Kept the existing Bauhaus direction, Jost type and primary-color palette (existing direction seed 887472513). No redraw. User's established art direction takes priority over the skill's subdued dashboard defaults.
- Screen question: what should I do next, based on weight, waist and how the week felt? Added honest waist comparisons, sleep averages with recorded-night counts, and a dated recovery strip. Missing values remain unknown. One practical next step stays primary; the method is disclosed on demand.
- Motion: immediate press compression and a short release; fixed-position send action while writing expands above it; height-aware composer/proposal/toast transitions; mobile bottom-sheet and desktop side-drawer entry/exit; mobile drag-to-dismiss; stable settings header/tabs; animated settings panes. Existing React Bits AnimatedContent remains the AI response entrance; GSAP controls state changes. Reduced-motion branches are present in the shared primitives.
- Browser checks through CUA (rather than a separate browser driver): 320, 390, 768 and 1440 CSS-pixel layouts have no page overflow. Verified mobile drag dismissal, Escape, Tab/Shift+Tab focus loop, return focus, scroll unlock, rapid settings switches, mixed waist/sleep/hunger/steps proposal, save, partial correction, Undo and persisted reload. Verified send-button bounds stay identical before/after input expansion (390px: x320, y693.5, 44×44).
- Fixed during browser review: moving send hit target, inherited horizontal definition-list styles, and settings tabs changing vertical position when pane heights differed.
- Fictional records used only in the separate localhost:4174 test origin, including 84cm waist, 5h sleep, high hunger and 6000 steps. Main localhost:4173 data was preserved. No live provider call or Apple Health transfer was made.
- Validation: 78 tests pass; production build passes. Existing mixed static/dynamic coach import warning remains; bundle is approximately 502kB before gzip, 160kB compressed. Taste lint on changed interaction components: 0 FAIL, 2 WARN. Sample-response label conveys provenance; em dashes represent missing observations.

# Calorie: design and interaction review

Date: 2026-10-19. No production deployment in this pass.

## Latest revision: composition and visual understanding

The user rejected the earlier treatment as insufficiently Bauhaus, then asked
for charts instead of lengthy explanations. This section supersedes the earlier
rounded colour pass below. No production deployment in this revision.

Art direction: self-hosted Jost variable (400–800, 26.6 kB WOFF2, SIL OFL license
in public/licenses/jost.txt), warm paper #f4f1e8, black #171917, blue #164bc6,
yellow #f0c72f and vermilion #d43d2b. Large lowercase type, sharp colour fields,
black structural rules and functional circles/triangles/squares replace rounded
pastel cards and pill navigation. Daily energy is now an open composition of a
large number and a proportional sector dial. Category symbols have visible text
labels, and the three macro columns are contiguous rather than isolated tiles.
Primary composition references consulted:
- https://www.moma.org/collection/works/5104 (Herbert Bayer, 1926)
- https://bauhauskooperation.de/wissen/das-bauhaus/werke/graphische-druckerei/plakat-zur-bauhaus-ausstellung-in-weimar-1923 (Joost Schmidt, 1923)

Visual information changes:
- Plan: a stacked macro energy bar uses 4/4/9 kcal per gram, paired with the
  labelled gram targets; two aligned bars compare intake with estimated needs.
- Progress: a weight-goal rail shows start, current weekly average and goal.
  Insufficient readings show a two-week coverage diagram, not invented progress.
- Body: real dated measurements become a line chart; a single reading stays a
  single point. Weight, body fat, lean mass and BMI share labelled controls.
  The axis follows observed readings so a distant goal cannot flatten the trend;
  the goal remains separately visible in the summary above.
- Food: daily columns distinguish complete logs (solid) and partial logs (hatch).
  Missing days are empty, never zero intake. Mean intake uses complete days only.
  The current target line starts at the date the plan/targets took effect.
- Charts support click/tap selection and a labelled keyboard-accessible range
  input. Details announce exact dates/values; full daily values and context remain
  available in disclosures. Practice is a dated grid, with no streak penalty.
- Only the next action stays prominent; repeated summaries, duplicate statistics
  and long explanations are removed from the default view or progressively shown.

Motion uses the existing scoped GSAP hooks, with short chart reveals and the
existing linked completion/undo feedback. Reduced-motion branches remain in all
new animated charts. The previously fetched React Bits response component remains
in use; no new third-party animated component was invented. Stitch remains deferred.

Verification: production build and 71 tests pass (including four new tests for
missing/partial/complete days, sample separation, date boundaries and macro energy
ratios). Scoped Taste lint: 0 failures, 25 warnings reviewed (ordinary labels,
shadow/blur false positives and data-missing dashes). The broad repository lint
also sees older design files; it was not used as the changed-UI result.

Real-browser checks: 320, 390, 768 and 1440px; no horizontal page/chart overflow.
An isolated local origin on port 4174 used explicitly fictional imported records
for populated charts, target revisions, above-target intake, gaps, 7/30/90-day
ranges, metric switching, click selection and Home/End keyboard selection.
The 90-day accessible values table contained all 90 dates. Console captured no
errors or warnings. The temporary tab and server were closed. Existing user data
was not replaced. In the original fictional sample, completion changed the intake
bar/average to complete/360 kcal, and Undo restored the original partial record.
No live provider call or actual Apple Health transfer was performed.

Proof files in the task visualization directory:
- calorie-charts-sample-desktop.png (isolated fictional records)
- calorie-body-chart-sample-mobile.png (isolated fictional records)
- calorie-visual-progress-sample-mobile.png (isolated fictional records)
- calorie-visual-plan-mobile.png (original fictional sample)

## Earlier direction: colour and Bauhaus revision

The user rejected the restrained, monochromatic result and explicitly requested
classic Bauhaus references. This supersedes the original draw's under-2% accent
budget, muted blue, regular 40px headline number, and tonal-only surfaces below.
The prior draw remains a record, not a constraint against this explicit request.

On this screen, the daily energy allowance becomes the dominant blue colour
field, while three macro categories become labelled geometric units. Blue leads;
yellow supports the weekly practice and vermilion is a supporting category hue.
These category colours are not good/bad nutrition judgments. A day above target
keeps the same colour and supportive copy. The page stays warm off-white, with
dark sans-serif type and 8px spacing. There are no decorative charts or invented
measurements, image downloads, extra animation dependencies or new input routes.

Primary references:
- [Bauhaus-Archiv: Bormann's colour study from Kandinsky's course](https://www.bauhaus.de/en/sammlung/highlights/204_unterricht/444)
  documents the blue circle, yellow triangle and red square relationship.
- [Bauhaus Kooperation: bauhaus.typography](https://bauhauskooperation.de/en/knowledge/publications/publikationen-zum-bauhaus/bauhaustypography)
  informs the clear type area and contrast of colour, scale and position.

Applied across Today, My plan, Progress, food details, navigation, settings and
the composer. Macro identity repeats with a text label, a distinct shape and a
colour; there is no reliance on colour alone. The primary calorie figure is
64px on desktop and 48px on phones. Rounded corners are reduced to 8–16px while
controls retain practical touch targets. Practice feedback adds a short GSAP
settle to the existing linked mark/count timeline. The fetched React Bits
response animation, disclosure transitions and reduced-motion branches remain.

Verification for this revision: production build and all 67 tests pass. Real
browser checks cover Today at 320/390/768/1440px, Plan at 320/390px, and mobile
Progress. No horizontal page or macro-tile overflow. Toggling practice updates
the weekly count and marker, completion changes the next action, and reversing
both restores the fictional sample. Food details expand with consistent macro
colours. Text contrast on the two saturated panels exceeds 4.5:1; data fills
were darkened where needed for at least 3:1 against their tracks. No claim of
full WCAG certification or an OS-level reduced-motion test.

The original review follows for provenance; its colour decisions are superseded.

### Follow-through: more character beyond colour

The user's follow-up asked for the rest of the design to feel less rigid too.
Replace the daily horizontal calorie bar with an SVG sector dial: its area is
the clamped logged-intake/target ratio, with the exact values still beside it
and exposed as an accessible meter. Animate updates from the visible offset
with scoped GSAP cleanup; initial rendering is immediate. Do not reward being
under target or imply that the sector measures fat loss.

Meal suggestions now use larger titles, distinct coloured surfaces and circular
direction controls; hover lifts a card and turns its arrow, while touch retains
press feedback. Fix the legacy mobile two-column rule that squeezed their
headings into a 32px column. Give journal disclosure controls a rotating circular
surface. Show starting weight and goal as labelled endpoints, without inventing
a current average when evidence is missing. First-use prompt examples become
coloured, clickable suggestions feeding the same composer. Route sections enter
in a brief sequence, disabled when reduced motion is requested.

Final verification: build and 67 tests pass; scoped Taste lint across eight UI
files reports 0 failures and 27 reviewed label/shadow/glass warnings. Browser
save/undo verifies 360 → 720 → 360 kcal, with sector offsets 84 → 68 → 84 for a
2,250 kcal target. Macro meters reconcile with the same data. React Bits response
settles to visible/opaque/untransformed; selecting a meal idea fills and focuses
the single composer without sending. Empty-date intake remains zero. Final
320px/390px/1440px layouts have no horizontal overflow; 768px was inspected in
the colour pass. First use was checked separately at 1280px and 390px on an empty
local origin. Console reports no errors or warnings. The fictional sample was
restored after checks. Production was not deployed.

## Skill use

- Taste: read the complete app-screens branch, ran the app direction draw and
  static lint, then reviewed the app in the real browser.
- GSAP: read the official core, React and timeline skills; apply scoped cleanup,
  interruptible tweens, transform-based progress fills and linked state feedback.
- React Bits: read the component integration skill from
  `Philotheephilix/reactbits.dev-skill`; fetch actual component source from the
  official `DavidHDev/react-bits` repository, then adapt the mounted response
  animation. Provenance and license accompany the component.
- Stitch: official skills installed and read; no Stitch screens generated.
  The user explicitly deferred Stitch during this pass.

## Data and jobs inventory

1. Product: Calorie, a personal nutrition plan and food journal.
2. Users return several times daily, primarily on a phone.
3. The frequent task is describing a meal in the persistent composer.
4. Text, dictation and photos share this one input surface.
5. AI output is a structured, reviewable proposal; saving is explicit and undoable.
6. Food entries contain dates, portions, calories, macros and source evidence.
7. Daily totals are computed from entries, never independently authored numbers.
8. A plan has personal targets, preferences and one weekly practice.
9. Completion means the user has logged the whole day; incomplete days do not
   masquerade as zero intake in progress summaries.
10. Body weight and composition readings have dates, units and missing-data states.
11. New accounts and short histories must remain useful without invented trends.
12. Sample mode is visibly fictional and separate from personal records.

## Direction and adaptations

The workspace/light draw offered two matching styles: Achromatic ledger and
Editorial greeting. Chosen: Editorial greeting, seed **887472513**. Its quiet
tonal surfaces and regular-weight figures suit a personal daily check-in. The
identity is Calorie's muted ocean-blue data on a cool neutral ground; its
signature is the single input changing a reviewable nutrition record.

Keep the user's blue palette and sans-serif preference. Adapt the drawn shell
to three labelled destinations and a persistent input: a desktop sidebar would
add machinery to a mobile-first three-view product. Keep the 8px spacing grid
requested by the user instead of the draw's 20px padding and 22px radii. Do not
use the draw's power-flow signature: it matched the word energy but does not
belong to this product. The first direction preview accidentally said Nourish;
the saved draw corrects this to the repository's actual product name, Calorie.

## Questions and findings

- Today: What have I eaten and what fits next? Calories and macros lead; the
  next-meal action sits beside their evidence, above the journal on mobile.
- My plan: What am I aiming for and how does this fit my routine? Show targets,
  rationale on expansion, preferences and practical meals.
- Progress: What can my records actually tell me, and what should I do next?
  Separate observations, incomplete evidence and proposed changes.
- Settings: How do I connect my AI, health data or backups? Each area has its
  own view and keeps editable credentials out of ordinary tracking.

## Changes from the review

1. Move the meal-planning prompt from below the mobile food journal to the daily
   nutrition panel. Keep the same single composer entry point and explicit send.
2. Reduce the headline calorie figure to 40px; daily numbers still lead without
   turning the working screen into a landing page.
3. Replace width transitions with GSAP scale transforms for all four daily
   meters. First render is immediate, updates start from the visible state.
4. Link the practice checkbox to its weekly marker and count using one timeline;
   changing dates or opening the page does not replay a completion animation.
5. Use the fetched React Bits component for newly returned AI review feedback,
   removing the competing CSS animation and a decorative star in the receipt.
6. Keep the next action at a stable height when a day becomes complete: it changes
   to "See today's progress". Saved-row emphasis expires after its feedback so
   returning to a view does not repeatedly celebrate an old save.

## Static checks

Taste lint of the changed UI files: **0 FAIL**, 26 warnings reviewed.
The label warnings identify ordinary sentence-case data and response-status
labels. Shadow warnings include `box-shadow: none` false positives; remaining
shadows belong to the floating composer, dialog/toast or a subtle navigation
selection. The glass warning matches `backdrop-filter: none`, not glass.
The vendored component has no wipe/gradient or scroll-effect code after adaptation.

Browser inspection uses the task's supported CUA browser API instead of the
skill's separate CDP inspector. Responsive geometry, visible data, interactions
and screenshots are checked in that browser; this is not a claim that
`inspect.mjs` ran.

## Browser verification

- Inspected 320, 390, 768 and 1440px layouts: no horizontal page overflow.
- At 390px the first sample food row is fully above the input dock; tightened
  the mobile header, type and vertical spacing after the first screenshot.
- Submitted a local sample meal, inspected the React Bits wrapper's final
  visible/opaque/untransformed state, saved it and verified every displayed total.
- The calorie fill was exactly 0.32 for 720 / 2,250; macro fills matched their
  respective targets. Undo restored 360 kcal and the original single entry.
- Checked/un-checked the day, followed the completed-day progress action, and
  verified the completed-day count. Restored the original incomplete-day state.
- Checked/un-checked the practice; the weekly marker and count matched. Restored
  the original practice state.
- Opened/closed meal details using Enter. Settings exited with Escape and restored
  focus to the Settings button after its exit animation.
- Browser console: no errors or warnings captured.
- Production build and the existing 67 tests passed. A pre-existing mixed
  static/dynamic import warning for shared/coach.ts remains.
- Reduced-motion code paths are present; OS preference switching was not exercised
  through the browser tools. No live provider call was made: the browser walkthrough
  used clearly labelled fictional sample data.
