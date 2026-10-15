# Shoulders and Arms in 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six live-posed 3D exercises: the overhead press (35), lateral raise (36) and rear fly (37) as a Shoulders group, and the biceps curl (38), hammer curl (39) and cable triceps pushdown (40) as an Arms group. Old library ids `L0426`, `L0334`, `L0378`, `L0294`, `L0313` and `L0201` carry over to them.

**Architecture:** This follows the Back step exactly. Body poses for 35–40 go in `dist/motion-body.js` `BODY_IDS` and play without baked clips. `dist/scene.js` shows the dumbbells, or builds the high pulley for 40 and links its bar to the palms each frame. The catalog maps the new 3D groups and aliases, and the studio disables the Muscles toggle for every group without an overlay.

**Tech Stack:** Vanilla ES modules in `dist/`, Three.js r185 (vendored), `node --test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-15-shoulders-arms-3d-design.md`

## Global Constraints

- Ids are 35 for the overhead press, 36 for the lateral raise, 37 for the rear fly, 38 for the biceps curl, 39 for the hammer curl and 40 for the cable triceps pushdown.
- The 3D group keys are `shoulders` and `arms`, with `groups.shoulders=[35,36,37]`, `groups.arms=[38,39,40]` and `allIds` of length 39. `bakedIds` stays at 30.
- Aliases: `L0426:35, L0334:36, L0378:37, L0294:38, L0313:39, L0201:40`. These six leave `include` and are added to `duplicates`. The library becomes 129 entries.
- Do not re-export `athlete.glb`. Do not change the poses of the existing 33 exercises; crunch and goblet were just fixed.
- The Muscles button is disabled for `back`, `shoulders` and `arms`. The legend reads `<Title> overlay not available`.
- Posture checks run on the real skinned mesh, using the `tests/posture.test.mjs` helpers: `studio()`, `clearance`, `elbow`, `torso`, `world`, `aboveSkin`.
- Every standing exercise keeps its feet planted, with the shoe gap to the floor between −.012 and +.015, and no skin below the floor.

## Review Focus

- **Saved data:** data or a backup holding any of the six aliased library ids must load as the 3D exercise with its sets intact. Covered by the Task 6 test.
- **Muscles toggle:** if Muscles is left on while moving from a chest exercise to a shoulders or arms one, the button must turn off and become disabled, with nothing lit. Covered by the Task 2 browser step.
- **Leftover equipment:** switching from 40 to a dumbbell exercise and back must not leave the pulley cable or bar behind. The scene reset clears `pushCable`. Covered by the Task 5 test.
- **Elbows:** the arms must never hyperextend or flip when dumbbells pass close to the body. The elbow hinge is checked at 21 phases per exercise in Tasks 2–5.
- **Group hash parsing:** `groupFromHash('#arms')` used to be the "unknown group" example in a test. Arms is now a real group, so the example changes to `'#calves'` (Task 2).

---

### Task 1: Shoulders and Arms group plumbing

**Files:** Modify `dist/exercises.js` (`groups.shoulders=[]`, `groups.arms=[]` for now, `GROUP_META` for both, `allIds`), `dist/catalog.js` (`GROUP_3D.shoulders='shoulders'`, `GROUP_3D.arms='arms'`), `dist/studio-view.js` (noOverlay rule); Tests: `tests/body.test.mjs`, `tests/catalog.test.mjs`.

**Interfaces:** Produces `GROUP_META.shoulders={label:'Shoulders',title:'Shoulders',region:'UPPER BODY',overlay:'Shoulders overlay not available',note:'Shoulder exercises with 3D motion: pressing and raises.',link:[ACE library url,'Exercise library · ACE ↗']}` and `GROUP_META.arms` with the same shape (`note:'Arm exercises with 3D motion: curls and pushdowns.'`). Also produces `NO_OVERLAY=['back','shoulders','arms']`, exported from `dist/exercises.js`.

- [ ] **Step 1: Failing tests.** In body.test, `GROUP_META.shoulders.overlay==='Shoulders overlay not available'`, `GROUP_META.arms.overlay==='Arms overlay not available'`, `NO_OVERLAY` deep-equals `['back','shoulders','arms']`, and `groupFromHash('#arms')==='arms'`. The unknown-group example becomes `'#calves'`→`'chest'`, and the allowed group list includes `shoulders` and `arms`.
- [ ] **Step 2: Run** `node --test tests/body.test.mjs`. Expect FAIL.
- [ ] **Step 3: Implement.** In studio-view, replace `group==='back'` with `NO_OVERLAY.includes(group)`.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs`. Expect PASS.
- [ ] **Step 5: Commit** "Add Shoulders and Arms 3D groups".

### Task 2: Overhead press and lateral raise

**Files:** Modify `dist/exercises.js` (entries 35 and 36, appended to `groups.shoulders`), `dist/motion-body.js` (`BODY_IDS[35]`, `[36]`) and `dist/scene.js` (add 35 and 36 to the two-dumbbell list `[0,1,2,5,7,8,13,21]`). Tests: `tests/posture.test.mjs`, `tests/body.test.mjs`.

**Interfaces:** Consumes `GROUP_META.shoulders` (Task 1). Each entry has copy fields like 32–34: three steps, a cue, a mistake to avoid, two breath lines, the stance, and labels `[[0,'PRESSING'],[.5,'LOWERING']]` for 35 and `[[0,'RAISING'],[.5,'LOWERING']]` for 36.

- [ ] **Step 1: Failing tests** in posture.test. Add a helper `standingChecks(id)` that checks, for all of `F`, the shoe gap to the floor (between −.012 and +.015) and that no skin is below the floor. Add a helper `elbowAngle(id,u,s)` that returns degrees from `elbow()`.
  - **`overhead press presses from the shoulders to straight arms over the head`:**
    - The trunk stays within 8° of vertical (hip → ShoulderLine).
    - At u=0, the hand y is within .1 of the shoulder y, the forearm is within 20° of vertical, and the elbow is below the hand.
    - At u=.5, the elbow angle is ≥160° and the hand y is above the shoulder y by ≥.35. The hand |x| is ≥ the shoulder |x| and ≤ the shoulder |x| + .15.
    - At all phases, the head-region skin is ≥ .03 from each dumbbell centre minus the plate radius .135, and the elbow angle is ≤ 180°.
  - **`lateral raise lifts the arms sideways to shoulder height`:**
    - The trunk stays within 5° of vertical and does not move: the hip stays within .01 of its u=0 position.
    - At u=0, the hands are beside the thighs: hand |x| ≥ .15 and hand y < hip y.
    - At u=.5, the hand y is within .08 of the shoulder y and the hand |x| is ≥ shoulder |x| + .4.
    - At all phases, the elbow angle is 150–175°, the hand y is ≤ shoulder y + .02, and the hand z is within .25 of the shoulder z, so the arms stay in the side plane. At u=.5 the palm normal has y < −.7 (palms down).
  - **body.test:** `groups.shoulders` deep-equals `[35,36]`.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement** the poses with `cycleT(u,.5)`, the standing `hip=[0,stand(),0]` and flat feet as in 20.
  - **35:** hands go from `T.shoulder(s)+[s*.1,.02,.05]` up to `[s*.45,shoulderY+.78,.0]`, with pole `[s,-.6,0]`, palms forward, `fingers:'grip'`.
  - **36:** the hand path is an arc in the side plane at reach `.8`, from `-80°` to `0°` below horizontal, with pole `[0,-.3,-1]` (elbows soft back), palms toward the thighs turning to down.
  - Tune the numbers until the tests pass. Record any number the tests forced as a ruling.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs`. Expect PASS. In the browser, check 35 and 36 side, front and perspective views at u = 0, .25, .5 and .75 on a fresh port (the browser caches modules, so use a new port or close the browser). Turn Muscles on at `#exercise/4`, then open `#exercise/35`: the button must be off and disabled.
- [ ] **Step 5: Commit** "Add the 3D overhead press and lateral raise".

### Task 3: Rear fly

**Files:** `dist/exercises.js` (37, appended to `groups.shoulders`), `dist/motion-body.js` (`BODY_IDS[37]`), `dist/scene.js` (37 in the two-dumbbell list). Tests: `tests/posture.test.mjs`, `tests/body.test.mjs`.

- [ ] **Step 1: Failing test `rear fly hinges forward and opens the arms sideways`:**
  - At all phases:
    - the trunk is 40–55° from horizontal;
    - each spine bend is ≤ .1 rad;
    - the knee angle is 150–175°;
    - the elbow angle is 150–175°;
    - the feet stay planted, following `standingChecks`;
    - the dumbbell centres are ≥ .135 + .02 from every thigh and shin skin vertex.
  - At u=0, the hands hang below the shoulders: |hand x| ≤ shoulder |x| + .1, and the hand y is below the shoulder y by ≥ .5.
  - At u=.5, |hand x| ≥ shoulder |x| + .45, and the hand y is within .15 of the shoulder y.
  - body.test: `groups.shoulders` deep-equals `[35,36,37]`.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** Use the row's hinge (33: `hip=[0,ANKLE_HEIGHT+1.146,-.5]`, `pitch=Math.PI/4`) with the hands on an arc in the plane across the trunk. The pole is `[s,.3,0]` with palms facing each other.
- [ ] **Step 4: Run.** Expect PASS. Check the browser views as in Task 2.
- [ ] **Step 5: Commit** "Add the 3D rear fly".

### Task 4: Biceps and hammer curl

**Files:** `dist/exercises.js` (38 and 39, with `groups.arms=[38,39]`), `dist/motion-body.js`, `dist/scene.js` (two-dumbbell list). Tests: `tests/posture.test.mjs`, `tests/body.test.mjs`.

**Interfaces:** Labels `[[0,'CURLING'],[.5,'LOWERING']]` for both.

- [ ] **Step 1: Failing test `curls keep the upper arm at the side`, for both 38 and 39:**
  - At all phases:
    - the trunk is within 5° of vertical;
    - the elbow stays within .06 of its u=0 position;
    - the upper arm is within 15° of vertical;
    - the feet stay planted.
  - Elbow angle: ≥160° at u=0 and ≤45° at u=.5.
  - At u=.5, the hand is in front of the shoulder: hand z > shoulder z, and hand y > shoulder y − .25.
  - Palm direction: for 38 at u=0, the palm normal has z > .7 (forward). For 39 at all phases, the palm normal has |x| > .7 (toward the midline) and the dumbbell axis has |y| > .9 (vertical).
  - body.test: `groups.arms` deep-equals `[38,39]`.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.**
  - The elbow sits fixed at `T.shoulder(s)+[0,-.43,.03]`.
  - The hand rotates about the elbow in the sagittal plane, from straight down to 145° of flexion. Use pole `[0,0,-1]`.
  - Use palm `[0,0,1]` for 38 and `[-s,0,0]` for 39. For 39 the dumbbell rotation in scene follows the hand bone already, so check that its axis is vertical.
- [ ] **Step 4: Run.** Expect PASS. Check the browser views.
- [ ] **Step 5: Commit** "Add the 3D biceps and hammer curls".

### Task 5: Cable triceps pushdown

**Files:** `dist/exercises.js` (40, with `groups.arms=[38,39,40]`), `dist/motion-body.js` (`BODY_IDS[40]`, `export const PUSH_PULLEY=[0,2.1,.55]`), `dist/scene.js` (a column and pulley at `PUSH_PULLEY`, plus `this.pushCable={anchor,handle,line}` linked in `update` like `rowCable`, and `this.pushCable=null` in reset). Tests: `tests/posture.test.mjs`, `tests/equipment.test.mjs`, `tests/body.test.mjs`.

- [ ] **Step 1: Failing tests:**
  - **`triceps pushdown keeps the elbows pinned and runs the cable from a high pulley`:**
    - At all phases:
      - each grip is within .02 of the bar segment;
      - the cable line ends at `PUSH_PULLEY` within .01, and its other end is at the bar centre;
      - the elbow stays within .06 of its u=0 position;
      - the trunk is within 12° of vertical;
      - the feet stay planted;
      - at 10 points along the cable, no skin vertex is within .02.
    - At u=0, the elbow angle is 80–100° and the bar y is within .15 of the Chest bone y.
    - At u=.5, the elbow angle is ≥160° and the bar is in front of the thighs: bar z > thigh skin z max at bar height, and the gap is ≤ .12.
  - **equipment.test, `switching away from the pushdown removes its cable`:** after `setExercise(40)` then `setExercise(38)`, `s.pushCable` is null and the scene holds no cable mesh.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** The athlete stands with a slight forward lean (pitch ≈ .12), elbows fixed at the sides, and forearms hinging from about 90° to straight. The palms face down with `fingers:'grip'`. The scene draws a column box behind the pulley at z ≈ .65.
- [ ] **Step 4: Run.** Expect PASS. Check the browser views.
- [ ] **Step 5: Commit** "Add the 3D cable triceps pushdown".

### Task 6: Aliases and library

**Files:** `scripts/library-ids.json`, `dist/library.js` (regenerated with the pinned dataset), `dist/catalog.js` (`ALIASES`), `README.md`. Tests: `tests/catalog.test.mjs`, `tests/store.test.mjs`, `tests/library.test.mjs`, `tests/stats.test.mjs`.

**Interfaces:** Consumes the existing `resolveExerciseId` and `cleanEntries`.

- [ ] **Step 1: Failing tests:**
  - The library has 129 entries and none of the six ids.
  - Each of the six aliases resolves.
  - `routeFor('#exercise/L0201')` returns `['exercise',40]`.
  - `normalize` of a backup holding `L0294` with sets yields 38 with the sets intact.
  - `muscleSets` counts 35 under `shoulders` and 40 under `arms`.
  - Library counts are `{chest:18,back:3,shoulders:3,arms:3,legs:6,core:6}` for 3D, and the text-only counts drop by 3 each.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** Update the ids json, then regenerate with `node scripts/build-library.mjs <exercises.json @ 7455efae41b3>`. Extend `ALIASES` and update the README counts to 39 and 129.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs`. Expect PASS.
- [ ] **Step 5: Commit** "Carry library history for six shoulder and arm exercises over to 3D".

### Task 7: Final verification

- [ ] **Step 1:** Run `node --test tests/*.test.mjs`. All tests pass.
- [ ] **Step 2:** In the browser, at desktop width and 390 px:
  - the Shoulders and Arms tabs show three each with the 3D badge, and In 3D shows 39;
  - each of 35–40 renders from a cold load of its link;
  - a backup containing `L0201` restores as the 3D pushdown;
  - there are no console errors.
- [ ] **Step 3:** Commit any fixes, then open the PR against `main`.
