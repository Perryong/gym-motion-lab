# FORM — Chest Training Studio

Interactive Three.js website with 18 chest exercises, a custom skinned athlete, exercise equipment, orbit/zoom, camera presets, play/pause, speed and scrub controls, muscle highlights and written form cues.

Serve `dist` over HTTP. Native modules do not load from a `file://` URL. Three.js 0.185.1 and matching r185 addons are vendored with the MIT license. No model service, API key or runtime external asset host is required.

## Athlete

`dist/assets/athlete.glb` is an original sculpted model with a continuous body surface, red shirt, black shorts, white trainers, short neck, brown hair and articulated fingers. It contains 48 bones and 18 baked exercise clips. Body and clothing colors share the same continuous surface; this is fitted clothing rather than simulated fabric. Smaller features are batched into skinned material groups.

The body uses fixed .44/.44 arm lengths, .54/.56 leg lengths and a .8 torso length in scene units. Those units are not meters. AnimationMixer controls deterministic clip playback; runtime IK resolves exact grip and support targets after interpolation. Exercises retain stable IDs. All 16 movements in the labeled reference remain, followed by floor press, pullover, incline push-up and squeeze press.

The rig is custom-authored programmatically rather than imported from Blender or a purchased character. Its clips are baked from the site's exercise targets, with a controlled lowering/return curve. They are illustrative animations, not independently certified biomechanics or motion capture. No claim of clinical accuracy or measured muscle activation is made.

## Regenerate the asset

Requires Node 22+ (the repository test loader uses `registerHooks`) and Python with numpy, scipy and scikit-image:

```sh
python scripts/sculpt-athlete.py /tmp/form-athlete-surface.json
node scripts/build-athlete.mjs /tmp/form-athlete-surface.json
node --test tests/*.test.mjs
```

The scripts provide the editable authoring source; the GLB is the runtime delivery asset. No texture downloads are required. To change proportions, keep the sculpt, rig rest offsets and motion constraints consistent, then regenerate and verify.

## Code organization

- `exercises.js`: exercise names and explanations.
- `motion.js`: pose targets and fixed-length limb solving.
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
