# Legs and abs groups

## Goal
Extend FORM from a chest-only studio to three body groups: Chest (existing 18), Legs (6) and Abs (6). Same athlete, viewer, coach panel and playback. New movements use FORM's procedural pose → IK → baked-clip pipeline (option 1), extended with a bendable spine and hip-driven lower-body motion.

## Exercises (new stable IDs 20–31)
Legs: 20 barbell back squat, 21 goblet squat, 22 walking lunge, 23 Romanian deadlift, 24 glute bridge, 25 standing calf raise.
Abs: 26 crunch, 27 forearm plank, 28 lying leg raise, 29 Russian twist, 30 dead bug, 31 hanging knee raise.

Each entry in `exercises.js` gains `group` ('chest' | 'legs' | 'abs'); new entries also carry `stance` (angle-label text), `phases` (two phase labels) and `split` (fraction of the cycle spent in the first phase). Chest entries keep their current app.js label logic. `displayOrder` becomes `groups = {chest:[…existing], legs:[20…25], abs:[26…31]}`.

## Motion (new `dist/motion-body.js`)
`poseAt(id, phase)` in motion.js dispatches ids ≥ 20 to `bodyPose(id, phase)`. Chest code is untouched.

A body pose defines the trunk directly instead of deriving it from shoulders:
- `hip` position and pelvis frame (`pelvis`: forward + up vectors).
- `spine`: per-bone `{flex, side, twist}` radians for Spine, Chest, ShoulderLine (and Neck for head counter-motion).
- Shoulders come from forward kinematics through the same bone offsets as `makeSkeleton` (.26/.27/.27, ±.35), so `arms(s).shoulder` always equals the rig's shoulder bone. Hand targets are given explicitly; the existing two-bone arm IK solves elbows.
- `ankles` targets with the existing knee solver; `feet` mode: `'floor'` (flat, optional `footPitch` for calf raise and toe contact) or `'shin'` (neutral ankle following the shin, for leg raises and hanging).
- `hands(side)`: `{palm, fingers:'grip'|'open'|'relaxed'}` hint replacing the id-based hand rules for new exercises.

Per-exercise intent (tempo: controlled first phase, smooth turnaround, as chest):
- Back squat: feet ±.2 planted, hips descend to about parallel, trunk leans forward up to ~40°, knees track forward over toes; bar sits across the upper back, hands just outside shoulders.
- Goblet squat: same pattern, more upright trunk; one dumbbell held vertically at the chest by both palms.
- Walking lunge: two steps per cycle (left then right), hips travel forward; a short labelled reset returns the athlete to the start (same convention as the retired ball throw).
- Romanian deadlift: soft fixed knee bend, hips move back, trunk hinges to ~70° from vertical with a neutral spine; arms hang vertically, bar slides down the thighs to mid-shin.
- Glute bridge: supine on the mat, knees bent, feet planted; hips lift to a straight shoulder–hip–knee line; arms flat beside the body.
- Standing calf raise: forefeet on a step edge; heels drop below and rise above the step via foot pitch; body rises with the ankles.
- Crunch: supine, knees bent; spine flexion (~35° total, spread across Spine/Chest/ShoulderLine) lifts the shoulder blades; hands crossed on the chest.
- Forearm plank: static hold, elbows under shoulders, straight body line; the cycle is a breath (small rib/pelvis motion), phase labels "HOLD".
- Lying leg raise: supine, lower back flat; straight legs rise from ~10° to ~90° at the hip.
- Russian twist: seated, trunk reclined ~45°, feet on the floor; spine twist ±35° carries a plate side to side.
- Dead bug: supine, arms vertical, knees 90/90; opposite arm and leg extend over a two-rep cycle; spine stays flat.
- Hanging knee raise: hanging from a pull-up bar, arms straight; knees rise to hip height with slight posterior pelvic tilt.

## Rig (`rig.js`)
`applyRigPose` applies `pelvis` and `spine` rotations when present (Spine/Chest/ShoulderLine/Neck currently stay at rest). Foot orientation honours `feet`/`footPitch`. Hand orientation and finger curl use `hands(side)` when present. Clip baking covers all 30 displayed ids.

## Equipment (`scene.js`)
Reuse existing parts where possible: barbell (squat, RDL), dumbbell (goblet), plate (Russian twist), mat (floor work), ring frame without rings as a pull-up bar (hanging knee raise). New primitives: squat rack uprights with J-hooks, and a calf-raise step block. Equipment follows the palm grip point as in chest.

## Muscles highlight
The build adds material regions `FocusLegs` (thigh skin and shorts: quads, glutes, hamstrings) and `FocusAbs` (the tank top's abdominal panel) next to `FocusChest`. `setMuscles(on)` highlights the current group's region. Coach "Muscle focus" copy is per exercise as today.

## UI (`index.html`, `app.js`, `style.css`)
- Group tabs (Chest / Legs / Abs) above the exercise list, using the same ARIA tablist pattern and arrow-key handling as the coach tabs.
- URL hash `#chest`, `#legs`, `#abs` selects the group (shareable, back button works); default chest.
- Heading and eyebrow follow the group ("Chest, in motion." / "Legs, in motion." / "Core, in motion."; UPPER BODY / LOWER BODY / CORE). Counts, "ABOUT THIS COLLECTION" note and the technique link are per group.
- Camera target per stance (standing, floor, bench, seated, hanging) instead of id lists.
- The WebMCP tool accepts all displayed ids and mentions body groups.
- Mobile keeps the horizontal card strip; tabs sit above it.

## Verification
- Existing chest tests stay green unchanged except for iterating the combined id list.
- Extend to ids 20–31: fixed limb lengths, loop continuity, finite transforms, hand/bone contact with equipment, neck connection.
- New: shoulder bone world position equals `arms(s).shoulder` (FK consistency); planted feet stay fixed where the exercise says so (squats, RDL, bridge, calf-raise toes); skinned vertices do not go below the floor/mat for floor exercises; crunch/twist spine angles stay within their stated ranges.
- Visual: built-in browser contact sheets of all 12 new exercises at three phases, plus close-ups of grips and feet.

## Out of scope
Back, shoulders and arms groups; motion capture; machine-based leg exercises; per-muscle (not per-group) highlighting.
