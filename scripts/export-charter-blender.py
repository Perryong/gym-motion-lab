"""Fit the Sketchfab "Charter T-Pose" character (Tim0, CC-BY 4.0) to FORM's rest skeleton.

Run inside Blender with the model imported in the active scene (Mixamo rig):
    OUT = '/path/athlete-surface.json'; TEX = '/path/dist/assets'; exec(open('scripts/export-charter-blender.py').read())
Then: node scripts/build-athlete.mjs /path/athlete-surface.json

Each Mixamo bone gets a transform mapping its rest segment onto the matching FORM
segment (same roll frame, length stretched only along the bone). Vertices are blended
through those transforms with the model's own skin weights, then re-weighted to FORM
bone names. FORM space: Y up, facing +Z, hips at the origin, R_ bones on +X.
"""
import bpy, json, re
import numpy as np
from mathutils import Vector, Matrix

arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE' and any(b.name.startswith('mixamorig:') for b in o.data.bones))
arm.data.pose_position = 'REST'
bpy.context.view_layer.update()
short = lambda n: re.sub(r'_\d+$', '', n.split(':')[-1])
bones = {short(b.name): b for b in arm.data.bones}
to_form = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))  # Blender Z-up/-Y-forward -> Y-up/+Z-forward
raw = lambda n: to_form @ (arm.matrix_world @ bones[n].head_local)
origin = raw('Hips')
k = .8 / (((raw('LeftArm') + raw('RightArm')) / 2) - origin).length  # torso length -> FORM .8
J = lambda n: (raw(n) - origin) * k

# Measured leg/hip proportions become FORM's leg constants (no leg stretching).
THIGH = round((J('LeftUpLeg') - J('LeftLeg')).length, 3)
SHIN = round((J('LeftLeg') - J('LeftFoot')).length, 3)
HIP = round(abs(J('LeftUpLeg').x), 3)

def frame(axis, up):
    x = axis.normalized(); z = x.cross(up).normalized(); y = z.cross(x)
    return Matrix((x, y, z)).transposed()

def mapping(src_a, src_b, dst_a, dst_b, up_src=Vector((0, 1, 0)), up_dst=Vector((0, 1, 0)), stretch=True):
    """Affine map: src segment frame -> dst segment frame, stretching only along the axis."""
    Fs, Fd = frame(src_b - src_a, up_src), frame(dst_b - dst_a, up_dst)
    s = (dst_b - dst_a).length / (src_b - src_a).length if stretch else 1
    S = Matrix.Diagonal((s, 1, 1))
    L = Fd @ S @ Fs.transposed()
    return L, dst_a - L @ src_a, Fd @ Fs.transposed()

T = {}  # mixamo bone -> (linear, offset, rotation)
spine_src = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End']
neck_y, head_y = .875, .97
h = [J(n).y for n in spine_src]
dst_y = lambda y: y * neck_y / h[4] if y <= h[4] else neck_y + (y - h[4]) * (head_y - neck_y) / (h[5] - h[4])
for a, b in zip(spine_src, spine_src[1:]):
    T[a] = mapping(J(a), J(b), Vector((0, dst_y(J(a).y), 0)), Vector((0, dst_y(J(b).y), 0)), Vector((0, 0, 1)), Vector((0, 0, 1)))
T['HeadTop_End'] = T['Head']
landmarks = {'THIGH': THIGH, 'SHIN': SHIN, 'HIP': HIP, 'fingers': {}}
for side, n, s in (('Left', 'R', 1), ('Right', 'L', -1)):  # FORM R_ is +X (the model's left)
    sh, el, wr = Vector((s * .35, .80, 0)), Vector((s * .79, .80, 0)), Vector((s * 1.23, .80, 0))
    up = Vector((0, 1, 0))
    T[side + 'Shoulder'] = mapping(J(side + 'Shoulder'), J(side + 'Arm'), Vector((s * .06, .80, 0)), sh, up, up)
    T[side + 'Arm'] = mapping(J(side + 'Arm'), J(side + 'ForeArm'), sh, el, up, up)
    T[side + 'ForeArm'] = mapping(J(side + 'ForeArm'), J(side + 'Hand'), el, wr, up, up)
    # The hand stays straight (rigid with the forearm, no stretch); FORM's hand bone
    # gets a bind rotation instead: local +Y along the fingers, +Z out of the palm.
    Rf = T[side + 'ForeArm'][2]
    hand = (Rf, wr - Rf @ J(side + 'Hand'), Rf)
    for b in bones:
        if b.startswith(side + 'Hand'): T[b] = hand
    place = lambda b: hand[0] @ J(b) + hand[1]
    axis = (place(side + 'HandMiddle1') - wr).normalized()
    palm = axis.cross(place(side + 'HandIndex1') - place(side + 'HandPinky1')).normalized()
    if palm.y > 0: palm = -palm  # T-pose palms face down
    palm = (palm - axis * palm.dot(axis)).normalized()
    B = Matrix((axis.cross(palm), axis, palm)).transposed()  # columns: local X, Y, Z
    q = B.to_quaternion(); landmarks['handBind_' + n] = [q.x, q.y, q.z, q.w]
    local = lambda b: [round(v, 4) for v in B.transposed() @ (place(b) - wr)]
    for f in ('Index', 'Middle', 'Ring', 'Pinky'):
        landmarks['fingers'][n + '_' + f] = [local(side + 'Hand' + f + str(j)) for j in (1, 2, 3)]
    landmarks['fingers'][n + '_Thumb'] = [local(side + 'HandThumb' + str(j)) for j in (2, 3)]
    landmarks['palm_' + n] = local(side + 'HandMiddle1')
    hip, knee, ankle = Vector((s * HIP, 0, 0)), Vector((s * HIP, -THIGH, 0)), Vector((s * HIP, -THIGH - SHIN, 0))
    fwd = Vector((0, 0, 1))
    T[side + 'UpLeg'] = mapping(J(side + 'UpLeg'), J(side + 'Leg'), hip, knee, fwd, fwd)
    T[side + 'Leg'] = mapping(J(side + 'Leg'), J(side + 'Foot'), knee, ankle, fwd, fwd)
    for b in ('Foot', 'ToeBase', 'Toe_End'):
        if side + b in bones: T[side + b] = mapping(J(side + 'Leg'), J(side + 'Foot'), knee, ankle, fwd, fwd, stretch=False)[:2] + (T[side + 'Leg'][2],)

def form_bone(m):
    if m in ('Hips',): return 'Hips'
    if m == 'Spine': return 'Spine'
    if m == 'Spine1': return 'Chest'
    if m == 'Spine2' or m.endswith('Shoulder'): return 'ShoulderLine'
    if m == 'Neck': return 'Neck'
    if m.startswith('Head'): return 'Head'
    side = 'R' if m.startswith('Left') else 'L'
    rest = m[4:] if side == 'R' else m[5:]
    table = {'Arm': 'UpperArm', 'ForeArm': 'Forearm', 'Hand': 'Hand', 'UpLeg': 'Thigh', 'Leg': 'Shin', 'Foot': 'Foot', 'ToeBase': 'Foot', 'Toe_End': 'Foot'}
    if rest in table: return side + '_' + table[rest]
    mt = re.match(r'Hand(Index|Middle|Ring|Pinky|Thumb)(\d)', rest)
    if mt:
        f, j = mt.group(1), int(mt.group(2))
        if f == 'Thumb': return side + '_Hand' if j == 1 else side + '_Thumb' + str(min(j - 1, 2))
        return side + '_' + f + str(min(j, 3))
    raise KeyError(m)

out = {'landmarks': landmarks, 'parts': []}
deps = bpy.context.evaluated_depsgraph_get()
for o in [c for c in arm.children if c.type == 'MESH']:
    ev = o.evaluated_get(deps); me = ev.to_mesh(); me.calc_loop_triangles()
    Mw = to_form.to_4x4() @ o.matrix_world
    names = [short(g.name) for g in o.vertex_groups]
    co = np.array([list((Mw @ v.co - origin) * k) for v in me.vertices])
    # Blend per-bone maps with the model's own weights.
    new_co = np.zeros_like(co); rot = [np.zeros((3, 3)) for _ in me.vertices]; fw = []
    for i, v in enumerate(me.vertices):
        gs = [(names[g.group], g.weight) for g in v.groups if g.weight > 1e-4 and names[g.group] in T]
        tot = sum(w for _, w in gs) or 1
        acc, R, fb = Vector(), Matrix.Diagonal((0, 0, 0)), {}
        for b, w in gs:
            L, off, Rb = T[b]; w /= tot
            acc += (L @ Vector(co[i]) + off) * w; R += Rb * w
            fb[form_bone(b)] = fb.get(form_bone(b), 0) + w
        new_co[i] = acc; rot[i] = np.array(R); fw.append(sorted(fb.items(), key=lambda x: -x[1])[:4])
    uv = me.uv_layers.active.data
    verts, index, remap = [], [], {}
    for tri in me.loop_triangles:
        for li in tri.loops:
            vi = me.loops[li].vertex_index; u = tuple(uv[li].uv)
            nrm = Vector(rot[vi] @ np.array(Mw.to_3x3() @ me.corner_normals[li].vector)).normalized()
            key = (vi, round(u[0], 5), round(u[1], 5), round(nrm.x, 3), round(nrm.y, 3), round(nrm.z, 3))
            if key not in remap:
                remap[key] = len(verts)
                verts.append((list(map(float, new_co[vi])), list(nrm), [u[0], 1 - u[1]], fw[vi]))
            index.append(remap[key])
    out['parts'].append({'name': o.name, 'material': o.data.materials[0].name, 'positions': [c for v in verts for c in v[0]],
        'normals': [c for v in verts for c in v[1]], 'uvs': [c for v in verts for c in v[2]],
        'bones': [v[3] for v in verts], 'indices': index})
    ev.to_mesh_clear()

for mat, size in (('Material_1', 2048), ('Material_2', 2048)):
    for kind in ('baseColor', 'normal', 'metallicRoughness'):
        src = bpy.data.images[mat + '_' + kind + '.png']; img = src.copy()
        img.scale(size if kind == 'baseColor' else size // 2, size if kind == 'baseColor' else size // 2)
        img.filepath_raw = f"{TEX}/athlete-{'body' if mat == 'Material_1' else 'outfit'}-{kind}.jpg"; img.file_format = 'JPEG'; img.save()
        bpy.data.images.remove(img)
json.dump(out, open(OUT, 'w'))
print('scale', round(k, 5), 'THIGH', THIGH, 'SHIN', SHIN, 'HIP', HIP, 'parts', [(p['name'], p['material'], len(p['positions']) // 3) for p in out['parts']])
