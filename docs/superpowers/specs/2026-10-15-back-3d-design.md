# Back exercises in 3D — design

Step 3 of the improvement plan. Builds on the exercise library (`exercise-library` branch). Adds 3D motion for three Back exercises: pull-up, barbell bent-over row and seated cable row.

## Exercises and ids

| 3D id | Exercise | Equipment | Replaces |
|---|---|---|---|
| 32 | Pull-up | Pull-up bar | dataset `0652` (not in the library) |
| 33 | Barbell bent-over row | Barbell | library `L0027` |
| 34 | Seated cable row | Cable station, bench | library `L0861` |

- `dist/exercises.js` gains entries 32–34 with the same fields as the other 3D exercises (name, short, equipment, type, focus, secondary, steps ×3, cue, avoid, breath ×2, stance, labels), a new 3D group key `back` with `groups.back=[32,33,34]` and a `GROUP_META.back` entry.
- `scripts/library-ids.json`: `0652→32`, `0027→33`, `0861→34` move into `duplicates`; `0027` and `0861` leave `include`. The library is regenerated (135 entries).
- **Aliases:** `dist/catalog.js` exports `ALIASES={L0027:33,L0861:34}` and `resolveExerciseId(id)`. `store.normalize` maps an aliased id to its 3D id instead of dropping it, in plans, history, the active workout and backups. Routes `#exercise/L0027` and `#exercise/L0861` open the 3D exercise.
- Catalog maps 3D group `back` → Back.

## Playback without baked clips

- `athlete.js`: when no `Exercise_<id>` clip exists, the athlete skips the mixer for that exercise and `applyRigPose` poses every bone live, as it does on top of clips today. The 30 baked exercises are unchanged.
- `allIds` covers all 33 3D exercises; a new `bakedIds` lists the 30 with clips, and `tests/avatar.test.mjs` checks the model against `bakedIds`.

## Screens

- Studio page: counter, group label and technique link come from `GROUP_META.back` (ACE link for a row).
- Muscle highlight: the model has no back material. For `back` exercises the Muscles button is disabled and the legend reads "Back overlay not available".
- Exercises list, Back tab: the three show the 3D badge; In 3D lists 33.

## Postures (test-first, real mesh where it matters)

- **Pull-up:** overhand grip slightly wider than shoulders; dead hang with straight arms at the bottom, chin above the bar at the top; legs hang straight below the hips; the bar is seated through both grips every frame (like the hanging knee raise); feet never touch the floor.
- **Bent-over row:** feet planted hip-width, knees soft; trunk held 40–50° from horizontal with a neutral spine through the rep; the bar starts below the shoulders at arm's length and rises to the lower ribs; the bar stays within 0.15 of the shins/thighs line; the bar is seated through both grips.
- **Seated cable row:** seated on a bench, feet braced on a footplate, knees softly bent; trunk upright (±15° from vertical); the handle starts at arm's length toward the pulley and finishes at the stomach with elbows past the torso; the handle sits in both grips; the cable runs from the handle to a low pulley in front.
- All three: no skin through the floor, bench or bar; knees never bend backwards; clips loop without a jump; fixed limb lengths.

## Out of scope

Lat pulldown, a back highlight material (needs a model rebuild), Shoulders and Arms 3D (step 4).
