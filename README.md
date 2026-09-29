# FORM — Movement Studio

Interactive Three.js website with three body groups — 18 chest, 6 leg and 6 core exercises — switched with Chest / Legs / Abs tabs (linkable as `#chest`, `#legs`, `#abs`), a custom skinned athlete, exercise equipment, orbit/zoom, camera presets, play/pause, speed and scrub controls, muscle highlights and written form cues.

Serve `dist` over HTTP. Native modules do not load from a `file://` URL. Three.js 0.185.1 and matching r185 addons are vendored with the MIT license. No model service, API key or runtime external asset host is required.

## Athlete

The athlete is "Charter T-Pose" by Tim0, from Sketchfab (https://sketchfab.com/3d-models/558a75ed32274e0d868ac22468565453), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). It was refitted to FORM's own skeleton: the mesh was re-posed onto the rig's rest joints, re-weighted to FORM bone names from the model's original skin weights, and given a Muscles-highlight region on the shirt's chest panel. Textures ship as JPEGs beside `dist/assets/athlete.glb` and are applied by `athlete.js`.

The skeleton keeps 48 bones and 30 baked exercise clips. Arms keep fixed .44/.44 segments and the torso .8 (scene units, not meters). Legs (.687 thigh, .595 shin) and hip width (.124) are measured from the model and exported from `motion.js`. Finger joints and hand bind rotations are measured from the model (`FINGERS`, `HAND_BIND` in `rig.js`). Equipment is seated at a grip point inside the curled fingers (`GRIP` in `scene.js`), not at the IK wrist target.

AnimationMixer controls deterministic clip playback; runtime IK resolves exact grip and support targets after interpolation. Clips are illustrative animations, not certified biomechanics or motion capture.

## Regenerate the asset

1. In Blender, import the Sketchfab model into its own scene.
2. Run `scripts/export-charter-blender.py` in Blender with `OUT` (JSON path) and `TEX` (`dist/assets`) set; see the script header.
3. `node scripts/build-athlete.mjs <OUT>` (Node 22.15+).
4. `node --test tests/*.test.mjs`

## Code organization

- `exercises.js`: exercise names and explanations.
- `motion.js`: chest pose targets and fixed-length limb solving.
- `motion-body.js`: lower-body and core poses (hip, pelvis pitch and spine bends with forward-kinematic shoulders).
- `rig.js`: skeleton definition, contact solving and animation baking.
- `athlete.js`: GLB loading, mixer playback and muscle material control.
- `scene.js`: lighting, equipment and camera.
- `app.js`: interaction and rendering lifecycle.

## Verification and limits

`node --test tests/*.test.mjs` checks mesh skinning and closed body seams, all 18 animation clips, normalized weights, fixed body proportions, continuous short-neck geometry, hand and ankle bone targets, equipment attachment, loop endpoints, straight push-up legs and toe-supported footwear.

The model was inspected with offline geometry renders. Browser visual QA and physical-device performance benchmarks were not performed. Mobile starts with a 1.5 pixel-ratio cap and a 1024 shadow map; playback stops drawing continuously while paused, offscreen or hidden. The viewer redraws for orbiting, resizing and scrubbing. Reduced-motion settings pause initial playback.

The source includes the site's existing optional WebMCP exercise-selection integration, feature-detected at runtime. No supported live WebMCP browser context was available for testing.

## Arm and bench corrections

Presses now use a vertical forearm at the lower position, including the inclined variants. Fly paths keep a constant shoulder-to-hand reach rather than shortening into a press. The upper arm and forearm share an elbow hinge frame, and forearm skin no longer follows independent hand rotation. This preserves forearm volume while the palms rotate for grips or push-ups.

Bench padding is lower and ends before the knees; the incline seat no longer intersects the thighs. Push-up variants have revised support positions, backward elbow tracking, nearly extended arms at the top, and open palms on the support surface. Cable and dip elbow paths use the same corrected arm rig. The 15 automated checks include actual forearm cross-section preservation, press wrist/elbow alignment, push-up flare/extension and mesh-to-bench clearance. Eight representative corrected poses were also inspected using offline depth-buffered renders.

Push-up stance correction: straight .54/.56 legs now share the torso axis, with feet hip-width apart, raised heels, and reversed shoe facing with soles toward the rear. Svend press and ball throw are retired; their stable IDs are excluded from selection and exported clips.

Cable fly grip correction: mirrored thumbs-up palms follow each forearm, handles follow hand rotation, and straps connect the cable outside the fingers. Closing hands retain clearance.

Cable grip contact refinement: thinner barrels sit inside C-shaped fingers, opposed thumbs close over the grip, and the single-cable inactive hand hangs beside the thigh with relaxed fingers.

Reference cable chest fly: staggered stance with softly bent knees and a small forward lean; a constant-radius sweep below shoulder height; pulleys lowered to the same chest-level path.

Cable hand attachment: two palm helper bones seat the hand beyond each wrist only during cable gripping. Handles have end caps and their strap attachment swivels toward cable tension. Existing hand placement for other exercises is preserved.

Hand chirality correction: cable palms now face inward while thumb roots and finger ordering are mirrored to keep thumbs and index fingers on top. Regression checks inspect the actual thumb position and palm-facing direction, not only an abstract wrist axis.
# gym-motion-lab
