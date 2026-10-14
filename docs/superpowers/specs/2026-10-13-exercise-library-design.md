# Exercise library — design

Step 2 of the improvement plan. Adds a curated library of ~150 text-only exercises in addition to the 30 with 3D motion (~180 in total), and moves the app from 3 body groups to 6.

## Source and licensing

- Data: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), pinned at commit `7455efae41b3`, file `data/exercises.json`. Code, data structure and instruction text are MIT; we use names, body part, equipment, target and secondary muscles, and English steps, with attribution.
- Not used: the images and GIFs (© Gym visual, separate licence). openGym's own code (AGPL-3.0) is not copied.

## Data

- `scripts/build-library.mjs` reads a local copy of the pinned dataset file and a reviewed list of ~150 dataset ids (`scripts/library-ids.json`), and writes `dist/library.js`. The output is committed; the app makes no network calls for it.
- Entry: `{id:'L0025', name, short, group, equipment, target, secondary:[…], steps:[…]}`. `short` is a trimmed display name.
- Dataset fields used: `id`, `name`, `body_part`, `equipment`, `target`, `secondary_muscles`, `instruction_steps.en` (already a list of steps). Media fields (`image`, `gif_url`, `media_id`, `attribution`) are ignored.
- Groups: `chest`, `back`, `shoulders`, `arms`, `legs`, `core`, assigned from body part and target (back → back; shoulders/delts → shoulders; upper and lower arms → arms; chest → chest; upper and lower legs → legs; waist → core). `cardio` and `neck` are not selected.
- Duplicates of the 30 3D exercises are listed in the script (`dataset id → 3D id`) and are not emitted; the 3D exercise represents that movement. The 30 keep their groups: `chest`, `legs`, and `abs` renamed to `core`.
- Selection criteria for the ~150: common gym movements, each group with at least 15 entries (3D ones included), equipment limited to barbell, dumbbell, cable, machine (leverage/smith), kettlebell and body weight, no near-duplicate variants of the same movement.
- The script refuses to write if a listed id is missing, an entry has no steps, a duplicate maps to a non-existent 3D id, or a group falls under 15.

## Exercise ids

- 3D exercises keep numeric ids 0–31; library entries use `L` + dataset id. A shared `exerciseById(id)` and `allIds` cover both.
- Stored state and backups accept any built-in id; unknown ids are still dropped. Old saved data and old backups load unchanged.

## Screens

- **Exercises list:** chips All · Chest · Back · Shoulders · Arms · Legs · Core, plus an **In 3D** toggle chip. Rows show an **In 3D** badge on the 30. Search covers name, muscles and equipment. Legacy `#chest`, `#legs` and `#abs` (→ Core) links keep working; `#exercises/<group>` accepts the six groups.
- **Exercise page:** 3D exercises unchanged. Text-only exercises get a simple page: name, group and equipment tags, target and secondary muscles, numbered steps, ＋ Plan, and the dataset credit. No 3D stage.
- **Plan:** unchanged; rows show names for any exercise.
- **Workout:** 3D exercises play the athlete as now; text-only exercises show a steps card in the viewer's place. Logging, rest timer and prefill are identical.
- **Stats muscle map:** set counts for the six groups; the body figure gains back (rear upper back), shoulders (both views) and arms (upper arms) regions; the list shows all six.
- **Home, calendar:** unchanged.

## Testing

- Generated library: ~150 entries (not counting the 30 3D), six groups with ≥15 each (3D included), required fields present, no id collisions, no duplicates of mapped 3D movements.
- Store: library ids accepted in plan, history and backups; unknown ids dropped; old numeric-only data unchanged.
- Stats: six-group muscle counts.
- Browser: list chips and In 3D filter, a text-only page, planning and logging a text-only exercise (steps card in the workout), the six-region map, legacy links.

## Out of scope

Images/GIFs, other languages, equipment filter, custom exercises, new 3D motion (steps 3–4).
