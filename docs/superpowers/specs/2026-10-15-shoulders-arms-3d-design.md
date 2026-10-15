# Shoulders and Arms exercises in 3D — design

Step 4 of the improvement plan. Follows the Back step (`2026-10-15-back-3d-design.md`): live poses, no change to `athlete.glb`. Adds 3D motion for three Shoulders and three Arms exercises, so every library group has some 3D exercises.

## Exercises and ids

| 3D id | Exercise | Group | Equipment | Replaces |
|---|---|---|---|---|
| 35 | Dumbbell overhead press | shoulders | Two dumbbells | library `L0426` |
| 36 | Dumbbell lateral raise | shoulders | Two dumbbells | library `L0334` |
| 37 | Dumbbell rear fly | shoulders | Two dumbbells | library `L0378` |
| 38 | Dumbbell biceps curl | arms | Two dumbbells | library `L0294` |
| 39 | Dumbbell hammer curl | arms | Two dumbbells | library `L0313` |
| 40 | Cable triceps pushdown | arms | High pulley, straight bar | library `L0201` |

- `dist/exercises.js` gains entries 35–40 with the same fields as the other 3D exercises (name, short, equipment, type, focus, secondary, steps ×3, cue, avoid, breath ×2, stance, labels). It also gains 3D group keys `shoulders` (`[35,36,37]`) and `arms` (`[38,39,40]`), each with a `GROUP_META` entry, and both groups join `allIds` (39 total). `bakedIds` stays the 30 baked exercises.
- `dist/catalog.js` maps 3D group `shoulders` → Shoulders and `arms` → Arms, and extends `ALIASES` with `L0426:35, L0334:36, L0378:37, L0294:38, L0313:39, L0201:40`. Plans, history, the active workout, backups and `#exercise/L…` links resolve through the existing `resolveExerciseId`.
- `scripts/library-ids.json`: the six ids leave `include` and join `duplicates` with their 3D targets. The library is regenerated to 129 entries.
- README counts become "39 exercises with 3D motion" and "129 text-only".

## Screens

- Studio page: counter, group label, note and technique link come from `GROUP_META.shoulders` / `GROUP_META.arms` (ACE exercise library link, as for Back).
- Muscle highlight: the model has no shoulder or arm material. For both groups the Muscles button is disabled and the legend reads "Shoulders overlay not available" / "Arms overlay not available". This generalises the Back rule to every group without an overlay.
- Exercises list: the Shoulders and Arms tabs show the six with the 3D badge, and In 3D lists 39.

## Postures (test-first, real mesh where it matters)

All six stand with feet planted hip-width (shoe gap to floor −.012…+.015), knees straight or soft, with no skin below the floor. Dumbbells sit in the real grip every frame, as for the existing dumbbell exercises. Elbows never bend backwards (elbow angle ≤ 180°, hinge on the natural side), limb lengths stay fixed, and the clips loop without a jump.

- **Overhead press (35):** trunk upright (±8°). At the bottom the dumbbells are at shoulder height, forearms within 20° of vertical, elbows below the hands. At the top the arms are nearly straight (elbow ≥ 160°), hands above and slightly wider than the shoulders. Head skin stays ≥ .03 from both dumbbells all rep.
- **Lateral raise (36):** trunk upright and still. The arms rise in the side plane, from hanging beside the thighs to hands at shoulder height (within .08) at the top. Elbows stay softly bent (150–175°), palms face down at the top, and hands never go above the shoulders.
- **Rear fly (37):** hip hinge with the trunk 40–55° from horizontal, back flat (each spine bend ≤ .1 rad), knees soft (150–175°). The arms hang under the chest at the bottom and open sideways to about trunk level at the top, elbows soft (150–175°). Dumbbells stay clear of the thighs and shins.
- **Biceps curl (38):** trunk upright. The upper arm stays by the side all rep (elbow within .06 of its start, upper arm within 15° of vertical). The palms face forward and the forearm rotates the dumbbell up to the front of the shoulder (elbow ≤ 45° at the top, ≥ 160° at the bottom).
- **Hammer curl (39):** the same path as 38, but palms face each other and the dumbbell stays vertical.
- **Triceps pushdown (40):** a cable column with a high pulley in front of the athlete. The cable runs from the pulley to the centre of a short straight bar held in both grips (each grip within .02 of the bar). Elbows stay pinned at the sides (within .06 of their start). The bar moves from chest height (elbow about 90°) down to the front of the thighs (elbow ≥ 160°). The cable never passes through the body.

## Out of scope

Muscle highlight materials for shoulders and arms (needs a model rebuild), barbell and machine variants, seated versions, and the deferred minors from the Back step.
