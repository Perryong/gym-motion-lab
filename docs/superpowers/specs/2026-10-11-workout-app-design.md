# Workout app shell — design

Reference: openGym (github.com/alexpcosta/opengym, AGPL-3.0). Used for screen layout and feature ideas only; no code copied.

## Goal

Turn FORM into a mobile-first workout app whose exercise demos are the existing 3D athlete. First slice: Exercises, Plan, guided workout (Start). Home and Stats are later slices; their tabs are not shown yet.

## Constraints

- Static site in `dist/`, vanilla ES modules, no build, vendored Three.js, GitHub Pages deploy unchanged.
- All data client-side in localStorage (`gml.v1`). No server, no login.
- One WebGL `Studio` instance and one athlete load, shared between views.

## Screens and routes

| Route | View |
|-------|------|
| `#exercises`, `#exercises/<group>`, legacy `#chest` `#legs` `#abs`, empty | Exercise list: search, group chips, rows with "＋ Plan" |
| `#exercise/<id>` | Existing studio (viewer, playback, coach panel) as detail view |
| `#plan` | Seven weekday cards: routine name, exercises with sets × reps, remove |
| `#workout` | Guided workout, or a start screen when none is running |

Bottom tab bar: Plan · Start (raised) · Exercises.

## Guided workout

- Start uses today's weekday routine (or any other day chosen on the start screen).
- Each exercise: the athlete loops its clip in the shared viewer; a set table with kg, reps and a done tick. kg is prefilled from the last logged set of that exercise, reps from the plan.
- Ticking a set starts a 90 s rest timer (−/+15 s, skip).
- Previous/next exercise, add set, finish. Finish stores only completed sets in history; an empty workout is discarded.
- The running workout survives reloads.

## Modules

- `store.js`: state shape, normalisation of stored data (unknown exercise ids dropped), plan edits, start/finish workout, prefill. Pure functions plus `load`/`save`.
- `studio-view.js`: the former `app.js` studio wiring; exports `selectExercise` and `attachViewer(slot)`.
- `library-view.js`, `plan-view.js`, `workout-view.js`: DOM rendering per view.
- `app.js`: hash router, tab bar state, day-picker dialog, toast.

## Testing

`tests/store.test.mjs` covers normalisation, plan edits, prefill, finish and weekday mapping. Existing 37 tests keep passing. Browser QA at phone and desktop widths.
