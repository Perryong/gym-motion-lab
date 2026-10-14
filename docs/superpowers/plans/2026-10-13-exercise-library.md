# Exercise Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ~150 curated text-only exercises from the MIT exercises dataset next to the 30 3D exercises, grouped into six body groups across the Exercises list, exercise pages, plans, workouts and the Stats map.

**Architecture:** A build script turns a pinned local copy of the dataset plus a reviewed id list into `dist/library.js`. A new `dist/catalog.js` merges those entries with the 30 from `dist/exercises.js` behind one lookup (`exerciseById`) and six groups; every screen moves to the catalog, while the 3D modules (`rig.js`, `scene.js`, `athlete.js`, `motion*.js`, `studio-view.js`) keep using `exercises.js` unchanged, including its internal `abs` group key that the athlete's highlight materials depend on.

**Tech Stack:** Vanilla ES modules in `dist/`, Node 22 scripts and `node --test`, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-exercise-library-design.md`

## Global Constraints

- Dataset: `hasaneyldrm/exercises-dataset` at commit `7455efae41b3`, file `data/exercises.json`; fields used: `id`, `name`, `body_part`, `equipment`, `target`, `secondary_muscles`, `instruction_steps.en`. Never copy `image`, `gif_url`, `media_id`, `attribution` or any media.
- Library ids: `'L' + dataset id` (e.g. `'L0025'`); 3D ids stay numbers `0`–`31`.
- Six group keys, in display order: `chest`, `back`, `shoulders`, `arms`, `legs`, `core`. 3D groups map `chest→chest`, `legs→legs`, `abs→core`.
- Allowed equipment: `barbell`, `dumbbell`, `cable`, `leverage machine`, `smith machine`, `kettlebell`, `body weight`.
- Each group has ≥15 exercises counting 3D ones; ~150 library entries in total.
- Attribution text (README and each text-only page): `Exercise text from hasaneyldrm/exercises-dataset (MIT).`
- Do not modify `dist/exercises.js`, `dist/rig.js`, `dist/athlete.js`, `dist/motion.js`, `dist/motion-body.js` for this feature.

## Review Focus

- Old saved data and old backups (numeric ids only, no library ids) must load with nothing dropped. → Task 3 test.
- A link to a library id that does not exist (`#exercise/L9999`) or a malformed one (`#exercise/Lfoo`) must open the Exercises list, not crash. → Task 5 test.
- Search must match a library exercise by a secondary muscle, case-insensitively (e.g. "LATS"). → Task 2 test.
- A workout mixing 3D and text-only exercises must switch between them without leaving the 3D viewer stuck in a hidden slot or an empty stage. → Task 6 browser step.
- Logged sets of a library exercise must count toward its group on the Stats map. → Task 4 test.

---

### Task 1: Library build script and curated data

**Files:**
- Create: `scripts/build-library.mjs`, `scripts/library-ids.json`, `dist/library.js` (generated)
- Test: `tests/library.test.mjs`
- Modify: `README.md` (attribution, regenerate instructions)

**Interfaces:**
- Produces: `dist/library.js` exporting `export const LIBRARY=[{id,name,short,group,equipment,target,secondary,steps}]` (strings; `secondary` and `steps` arrays) and `export const LIBRARY_SOURCE={repo:'hasaneyldrm/exercises-dataset',commit:'7455efae41b3',license:'MIT'}`.
- Produces: `scripts/build-library.mjs` exports `groupFor(bodyPart) -> group|null`, `shortName(name) -> string`, `buildLibrary(dataset, ids) -> LIBRARY array` (throws on rule violations); CLI `node scripts/build-library.mjs <path/to/exercises.json>` writes `dist/library.js`.
- `scripts/library-ids.json`: `{"include":["0025",…],"duplicates":{"<dataset id>":<3D id>,…}}`.

- [ ] **Step 1: Write the failing tests** in `tests/library.test.mjs`:
  - `groupFor`: `'chest'→'chest'`, `'back'→'back'`, `'shoulders'→'shoulders'`, `'upper arms'`/`'lower arms'→'arms'`, `'upper legs'`/`'lower legs'→'legs'`, `'waist'→'core'`, `'cardio'`/`'neck'→null`.
  - `shortName('dumbbell lateral raise')==='Lateral raise'`, `shortName('barbell bench press')==='Bench press'`, `shortName('push-up')==='Push-up'`.
  - `buildLibrary` throws `/missing/` for an id not in the dataset, `/equipment/` for a band exercise, `/group/` for a cardio one, `/steps/` for an entry with empty `instruction_steps.en`, `/duplicate/` when an id is both included and listed as a duplicate, and `/3D/` when a duplicate maps to a number outside 0–31.
  - Generated `LIBRARY`: 130–170 entries; ids unique and matching `/^L\d{4}$/`; every entry has non-empty `name`, `short`, `target`, `steps`; `group` in the six keys; `equipment` in the allowed list; counting the 3D exercises (chest 18, legs 6, core 6) every group has ≥15; no library id equals `'L'+` any key of `duplicates`; no field holds a URL or `.gif`/`.jpg`.
- [ ] **Step 2: Run** `node --test tests/library.test.mjs` — expected FAIL (module not found).
- [ ] **Step 3: Implement** `scripts/build-library.mjs` (pure functions above plus the CLI, mirroring `scripts/version-assets.mjs`'s structure); `name` is the dataset name in sentence case; output written as `export const LIBRARY=` + JSON, one entry per line.
- [ ] **Step 4: Curate `scripts/library-ids.json`.** Download the pinned file to the scratchpad (not the repo): `curl -sL -o <scratch>/exercises.json https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b3/data/exercises.json`. Pick ~150 common gym movements per the spec's criteria (no near-duplicate variants), aiming roughly at back 30, shoulders 25, arms 35, legs 25, core 20, chest 15; list in `duplicates` every dataset entry that is one of the 30 3D movements (e.g. barbell bench press → 4, push-up → 9, crunch → 26). Print a per-group summary with names and review it for oddities.
- [ ] **Step 5: Generate and test:** `node scripts/build-library.mjs <scratch>/exercises.json && node --test tests/library.test.mjs` — expected PASS; `dist/library.js` under 120 KB.
- [ ] **Step 6: README:** add a "Exercise library" section with the attribution line, the pinned commit and the regenerate command.
- [ ] **Step 7: Commit** `scripts/ dist/library.js tests/library.test.mjs README.md` — "Add curated exercise library generated from the MIT exercises dataset".

### Task 2: Catalog module

**Files:**
- Create: `dist/catalog.js`
- Test: `tests/catalog.test.mjs`

**Interfaces:**
- Consumes: `LIBRARY` (Task 1); `exercises`, `allIds` from `dist/exercises.js`.
- Produces:
  - `GROUPS` — ordered `[{key,label}]` for the six keys; labels `Chest, Back, Shoulders, Arms, Legs, Core`.
  - `catalogIds` — array: the 30 3D ids in `allIds` order, then library ids in `LIBRARY` order.
  - `exerciseById(id) -> {id,name,short,group,equipment,target,secondary:[...],steps:[...],has3d}|null` — 3D entries map `focus→target`, split `secondary` on `' · '`, group via `chest/legs/abs→chest/legs/core`.
  - `isExerciseId(id) -> boolean`.
  - `parseExerciseId(text) -> id|null` — `'4'→4`, `'L0025'→'L0025'` if known, else `null`.
  - `filterExercises({group='all',query='',only3d=false}) -> id[]` — case-insensitive substring over `name`, `target`, `secondary`, `equipment`.

- [ ] **Step 1: Write the failing tests:** six `GROUPS` in order; `catalogIds.length === 30 + LIBRARY.length` with no duplicates; `exerciseById(26).group==='core'`, `.has3d===true`; `exerciseById(LIBRARY[0].id).has3d===false`; `exerciseById(999)`, `exerciseById('L9999')`, `exerciseById('4')` → `null`; `parseExerciseId('4')===4`, `parseExerciseId('L9999')===null`, `parseExerciseId('Lfoo')===null`, `parseExerciseId('')===null`; `filterExercises({only3d:true}).length===30`; `filterExercises({group:'core'})` includes `26` and every result has group `core`; a library entry is found by uppercase search of one of its `secondary` muscles.
- [ ] **Step 2: Run** `node --test tests/catalog.test.mjs` — expected FAIL.
- [ ] **Step 3: Implement** `dist/catalog.js` with the interfaces above (build the lookup once at module load).
- [ ] **Step 4: Run** `node --test tests/*.test.mjs` — expected PASS.
- [ ] **Step 5: Commit** — "Add a catalog that merges 3D and library exercises".

### Task 3: Store accepts library ids

**Files:**
- Modify: `dist/store.js:1,9` (`valid` uses `isExerciseId`)
- Test: `tests/store.test.mjs`

**Interfaces:**
- Consumes: `isExerciseId` (Task 2).

- [ ] **Step 1: Write the failing tests:** `addToPlan(s,'mon',LIBRARY[0].id)` succeeds; `normalize` keeps a library id in plan, history and `active`, and drops `'L9999'`; `readBackup` of a backup containing a library id keeps it; an old-style state with only numeric ids round-trips through `normalize` deep-equal.
- [ ] **Step 2: Run** — expected FAIL on the library-id cases.
- [ ] **Step 3: Implement** — replace the `allIds` import and `valid` with `isExerciseId`.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs` — expected PASS.
- [ ] **Step 5: Commit** — "Accept library exercise ids in saved data and backups".

### Task 4: Six-group Stats map

**Files:**
- Modify: `dist/stats.js` (`muscleSets`), `dist/charts.js` (`bodyFigure` regions), `dist/stats-view.js` (titles from `GROUPS`), `dist/style.css` (no change expected)
- Test: `tests/stats.test.mjs`

**Interfaces:**
- Consumes: `exerciseById`, `GROUPS` (Task 2).
- Produces: `muscleSets(history, now, days) -> {chest,back,shoulders,arms,legs,core}`; `bodyFigure(sets)` with `data-group` regions for all six keys (front: chest, shoulders, arms, core, legs; back: back, shoulders, arms, core, legs).

- [ ] **Step 1: Update/write the failing tests:** existing muscle-sets test now expects six keys (`{chest:2,back:0,shoulders:0,arms:0,legs:1,core:0}` for the 7-day case); a history entry with a library `arms` exercise and 3 done sets adds 3 to `arms`; `bodyFigure({chest:1,back:1,shoulders:1,arms:1,legs:1,core:1})` contains `data-group="<key>"` for all six and no `data-group="abs"`.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** — `muscleSets` keys from `GROUPS`; rename the figure's `abs` regions to `core`; add rear upper-back, shoulder-cap (both views) and upper-arm regions; `stats-view` labels from `GROUPS`.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs` — expected PASS.
- [ ] **Step 5: Commit** — "Count and draw six muscle groups on Stats".

### Task 5: Exercises list and routing

**Files:**
- Modify: `dist/library-view.js`, `dist/app.js` (`parse`, `pickDay`), `dist/index.html` (In 3D chip container if needed), `dist/style.css` (thumb colours for six groups, badge)
- Test: `tests/catalog.test.mjs` (route parsing)

**Interfaces:**
- Consumes: `GROUPS`, `filterExercises`, `exerciseById`, `parseExerciseId` (Task 2).
- Produces: route `#exercises/<group>` for the six keys; legacy `#chest`, `#legs`, `#abs`→core; `#exercise/<id>` via `parseExerciseId`, falling back to the list.

- [ ] **Step 1: Write the failing test** for a pure `routeFor(hash) -> [view, arg]` exported from `dist/catalog.js` and used by `app.js`: `'#abs'→['exercises','core']`, `'#exercises/back'→['exercises','back']`, `'#exercise/L9999'→['exercises']`, `'#exercise/Lfoo'→['exercises']`, `'#exercise/4'→['exercise',4]`, `'#exercise/'+LIBRARY[0].id→['exercise',LIBRARY[0].id]`, `''→['home']`.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** `routeFor` (moving `app.js`'s `parse` into it) and switch `library-view.js` to the catalog: chips All + six groups, an **In 3D** toggle chip (`aria-pressed`), rows with an **In 3D** badge for `has3d`, `library-count` text `"<n> exercises · 30 in 3D"`; `pickDay` names via `exerciseById`.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs` — expected PASS.
- [ ] **Step 5: Commit** — "Six-group exercise list with an In 3D filter".

### Task 6: Text-only exercise page, plan and workout

**Files:**
- Modify: `dist/index.html` (new `#view-text-exercise` section), `dist/app.js` (route `exercise` to studio when `has3d`, else text page), `dist/plan-view.js`, `dist/workout-view.js`, `dist/style.css`
- Create: `dist/text-exercise-view.js` (`renderTextExercise(id, {onPlan, back})`)

**Interfaces:**
- Consumes: `exerciseById` (Task 2); `parkViewer`, `attachViewer` from `studio-view.js`.

- [ ] **Step 1: Implement the text page:** name, group and equipment tags, "Target: …", "Also working: …", numbered steps, ＋ Plan (same day picker), back link like the studio page, and the attribution line from Global Constraints.
- [ ] **Step 2: Plan and workout:** `plan-view` and the workout start screen read names via `exerciseById`; in `renderWorkout`, a `has3d` exercise calls `show(id, slot)` as now, a text-only one calls `parkViewer()` and renders a steps card (title, numbered steps) in the slot.
- [ ] **Step 3: Run** `node --test tests/*.test.mjs` — expected PASS (no regressions).
- [ ] **Step 4: Browser check on the local preview:** Exercises → Back chip → open a library exercise → text page with steps and credit, no stage; ＋ Plan to today; Start → log a set on the text-only exercise (steps card shown), go Next/Previous between it and a 3D exercise — athlete appears and animates on the 3D one, no empty stage, no console errors; Finish → Stats shows the set under that group; `#exercise/L9999` opens the list.
- [ ] **Step 5: Commit** — "Text-only exercise pages and steps in workouts".

### Task 7: Final verification

- [ ] **Step 1:** `node --test tests/*.test.mjs` — all pass.
- [ ] **Step 2:** Phone-width (390 px) pass over Exercises (chips scroll, badge legible), a text page, Stats map with sets in all six groups; old backup file from `.playwright-mcp/form-backup-2026-10-13.json` restores with nothing dropped.
- [ ] **Step 3:** Commit any fixes; open the PR.
