# FORM — Movement Studio

Mobile-first workout app: a Home dashboard (month training calendar, today's workout, body weight with goal, week streak), Stats (totals, 12-month activity heatmap, muscle balance by body group), build a weekly plan, run guided workouts that log weight × reps with a rest timer, and watch every exercise demonstrated by a 3D athlete. Data stays in the browser (localStorage); Stats → Your data exports it to a JSON backup file and restores from one (restoring replaces the current data). Layout and feature ideas reference openGym (AGPL-3.0); no openGym code is used.

The exercise library covers three body groups — 18 chest, 6 leg and 6 core exercises — filterable as `#exercises/chest`, `/legs`, `/abs` (old `#chest` links still work); each opens the studio at `#exercise/<id>`, a custom skinned athlete, exercise equipment, orbit/zoom, camera presets, play/pause, speed and scrub controls, muscle highlights and written form cues.

Serve `dist` over HTTP. Native modules do not load from a `file://` URL. On deploy, `scripts/version-assets.mjs` appends `?v=<commit>` to every relative `.js`/`.css` reference in the uploaded copy, so browsers never mix cached and new modules; the source in `dist` stays unversioned. Three.js 0.185.1 and matching r185 addons are vendored with the MIT license. Firebase JS SDK 12.19.0 (app, auth, firestore) is vendored in `dist/vendor/firebase` under Apache-2.0; regenerate with `node scripts/vendor-firebase.mjs <version>`. No model service, API key or runtime external asset host is required. `index.html` loads the Cloudflare Web Analytics beacon (cookieless visit counts; dashboard: Cloudflare → Analytics & Logs → Web Analytics); if it is blocked the app works unchanged.

## Accounts

FORM works as before without an account; guest data stays in localStorage. Signing in (Stats → Account, email link, no password) keeps the plan, workout in progress, weigh-ins, goal and finished workouts in Cloud Firestore under `apps/form/users/{uid}` in FORM's own Firebase project `gym-motion` (Spark plan, `asia-southeast1`). On first sign-in, guest data is uploaded to an empty account or, with confirmation, merged into an existing one. Firebase loads after first paint, so a failed load leaves the app a guest app. Security rules live in `firestore.rules` and are tested against the Firestore emulator: `cd tests/rules && npm install && npm test` (needs Java 21). After changing them, publish the same file in the Firebase console (Firestore → Rules). In the Firebase console, Authentication → Sign-in method → Email/Password must have **Email link (passwordless sign-in)** turned on; otherwise sending a link fails with `auth/operation-not-allowed`. Privacy notice: `dist/privacy.html`.

## Athlete

The athlete is "Charter T-Pose" by Tim0, from Sketchfab (https://sketchfab.com/3d-models/558a75ed32274e0d868ac22468565453), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). It was refitted to FORM's own skeleton: the mesh was re-posed onto the rig's rest joints, re-weighted to FORM bone names from the model's original skin weights, and given a Muscles-highlight region on the shirt's chest panel. Textures ship as JPEGs beside `dist/assets/athlete.glb` and are applied by `athlete.js`.

The skeleton keeps 48 bones and 30 baked exercise clips. Arms keep fixed .44/.44 segments and the torso .8 (scene units, not meters). Legs (.687 thigh, .595 shin) and hip width (.124) are measured from the model and exported from `motion.js`. Finger joints and hand bind rotations are measured from the model (`FINGERS`, `HAND_BIND` in `rig.js`). Equipment is seated at a grip point inside the curled fingers (`GRIP` in `scene.js`), not at the IK wrist target.

AnimationMixer controls deterministic clip playback; runtime IK resolves exact grip and support targets after interpolation. Clips are illustrative animations, not certified biomechanics or motion capture.

## Exercise library

Besides the 39 exercises with 3D motion, `dist/library.js` holds 129 text-only exercises (names, muscles, equipment and English steps). Exercise text from hasaneyldrm/exercises-dataset (MIT), pinned at commit `7455efae41b3` (`data/exercises.json`). The dataset's licence ships as `dist/LIBRARY-LICENSE.txt`. The dataset's images and animations (© Gym visual) are not used.

To regenerate after editing `scripts/library-ids.json` (`include` lists dataset ids; `duplicates` maps dataset ids of the 3D movements to their 3D id so they are not added twice):

1. Download the pinned dataset outside the repo: `curl -sL -o /tmp/exercises.json https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b3/data/exercises.json`
2. `node scripts/build-library.mjs /tmp/exercises.json`
3. `node --test tests/*.test.mjs`

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
- `app.js`: hash router (`#home`, `#stats`, `#exercises`, `#exercise/<id>`, `#plan`, `#workout`), day picker and toast.
- `studio-view.js`: studio interaction and rendering lifecycle; one viewer shared by the detail and workout views.
- `store.js`: plan, workout, history, body weight and goal, validated on load from localStorage or the cloud.
- `cloud.js`: the only Firebase module — email-link sign-in and FORM's Firestore documents.
- `sync.js`: pure conversion, guest merge, save debouncing and error wording for the cloud (tested in node).
- `account-view.js`: Stats → Account card and the confirm-email dialog.
- `stats.js`: streaks, monthly counts, weight change, heatmap, calendar grid and muscle-balance figures (pure).
- `charts.js`: SVG weight chart, heatmap and body figure.
- `home-view.js`, `stats-view.js`: Home and Stats screens.
- `library-view.js`, `plan-view.js`, `workout-view.js`, `ui.js`: the app screens and a small DOM helper.

## Verification and limits

`node --test tests/*.test.mjs` checks mesh skinning and closed body seams, all 18 animation clips, normalized weights, fixed body proportions, continuous short-neck geometry, hand and ankle bone targets, equipment attachment, loop endpoints, straight push-up legs and toe-supported footwear.

The model was inspected with offline geometry renders. Browser visual QA and physical-device performance benchmarks were not performed. Mobile starts with a 1.5 pixel-ratio cap and a 1024 shadow map; playback stops drawing continuously while paused, offscreen or hidden. The viewer redraws for orbiting, resizing and scrubbing. Reduced-motion settings pause initial playback.

The source includes the site's existing optional WebMCP exercise-selection integration, feature-detected at runtime. No supported live WebMCP browser context was available for testing.

## Arm and bench corrections

Presses now use a vertical forearm at the lower position, including the inclined variants. Fly paths keep a constant shoulder-to-hand reach rather than shortening into a press. The upper arm and forearm share an elbow hinge frame, and forearm skin no longer follows independent hand rotation. This preserves forearm volume while the palms rotate for grips or push-ups.

Bench padding is lower and ends before the knees; the incline seat no longer intersects the thighs. Push-up variants have revised support positions, backward elbow tracking, nearly extended arms at the top, and open palms on the support surface. Cable and dip elbow paths use the same corrected arm rig. The 15 automated checks include actual forearm cross-section preservation, press wrist/elbow alignment, push-up flare/extension and mesh-to-bench clearance. Eight representative corrected poses were also inspected using offline depth-buffered renders.

Push-up stance correction: straight .54/.56 legs now share the torso axis, with feet hip-width apart, raised heels, and reversed shoe facing with soles toward the rear. Svend press and ball throw are retired; their stable IDs are excluded from selection and exported clips.

Cable fly grip correction: mirrored thumbs-up palms follow each forearm, handles follow hand rotation, and straps connect the cable outside the fingers. Closing hands retain clearance.

Cable grip contact refinement: thinner barrels sit inside C-shaped fingers, opposed thumbs close over the grip, and the single-cable inactive hand rests on the hip with the elbow out, bracing the trunk.

Reference cable chest fly: staggered stance with softly bent knees and a small forward lean; a constant-radius sweep below shoulder height; pulleys lowered to the same chest-level path.

Cable hand attachment: two palm helper bones seat the hand beyond each wrist only during cable gripping. Handles have end caps and their strap attachment swivels toward cable tension. Existing hand placement for other exercises is preserved.

Hand chirality correction: cable palms now face inward while thumb roots and finger ordering are mirrored to keep thumbs and index fingers on top. Regression checks inspect the actual thumb position and palm-facing direction, not only an abstract wrist axis.
# gym-motion-lab
