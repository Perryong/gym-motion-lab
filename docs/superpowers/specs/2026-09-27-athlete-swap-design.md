# Athlete swap: presentable character on the FORM skeleton

## Goal
Replace the procedurally sculpted athlete with a more presentable, realistic Sketchfab human while keeping every existing clip, IK target, grip and contact fix working.

## Constraints
- Runtime code keeps driving bones by name (`rig.js` `makeSkeleton`): 48 bones, arm segments .44/.44, legs .54/.56, torso .8. Bones are not moved or renamed; the mesh is fitted to them.
- `athlete.js` expects a node named `AthleteSurface` containing skinned meshes and a material named `FocusChest` (the Muscles toggle).
- Clips `Exercise_<id>` for all `displayOrder` ids stay in the GLB.
- No Draco/KTX2 (vendored loader has no decoders). Target GLB < 6 MB.
- Model licence CC0 or CC-BY; credit goes in README.

## Pipeline (Blender, new file — never the user's open scene)
1. Import current `dist/assets/athlete.glb` → FORM armature + clips. Save a copy as `dist/assets/athlete-legacy.glb`.
2. Import the chosen Sketchfab model. Remove its own armature/modifiers; apply transforms.
3. Pose the model to the FORM rest pose and scale/align it to the joints (shoulders, elbows, wrists, hips, knees, ankles, neck).
4. Parent to the FORM armature with automatic weights. Fix weights at wrists, fingers, shoulders and neck. Hair/eyes rigid to `Head`.
5. Assign `FocusChest` material to the pec region (vertex group/face selection split from the shirt/skin material).
6. Name the mesh parent `AthleteSurface`; export GLB with animations, no compression.
7. Record the steps as `scripts/rebind-athlete-blender.py` for repeatability.

## Verification
- `node --test tests/*.test.mjs`; tests tied to the old sculpt (neck seam, forearm cross-section, sculpt proportions) are updated to check the new mesh's equivalent invariants, not deleted silently.
- Playwright screenshots of all 18 exercises at phase 0 / .3 / .56 in perspective and side views: hands meet grips, no bench/floor intersection, no candy-wrapper wrists.

## Out of scope (follow-up)
Motion-feel tempo/secondary motion, Kiln equipment and environment lighting — separate change after the swap lands.

## Risks
Proportion mismatch between the model and FORM limb lengths (fit mesh to bones; slight stretching possible). Fingers are the weakest area of automatic weights.
