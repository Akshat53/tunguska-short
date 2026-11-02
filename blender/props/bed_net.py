# Iron dormitory bed with a mattress, folded blanket, pillow and a mosquito net knotted up above it (Laughter Epidemic 1962).
# Front view (long side to camera), head end at the left, from a little above. bed.py: the same bed without the net and a
# different blanket colour.
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib
from mathutils import Vector

out, size = lib.args()
NET = globals().get("NET", True); BLANKET = globals().get("BLANKET", "#2f7f78")
lib.reset()
op = bpy.ops.mesh
iron = lib.toon("iron", "#2f4a4a"); brass = lib.toon("brass", "#c99a44"); matt = lib.toon("matt", "#efe3c2")
blank = lib.toon("blanket", BLANKET); stripe = lib.toon("stripe", "#f2e6c4"); pil = lib.toon("pillow", "#fbf4e2")
net = lib.sheer("net", "#f8faf6", 0.2, 0.86, 1.0); spring = lib.toon("spring", "#5a6a6e")
L, Wd = 0.88, 0.42   # half length (x), half width (y)

def rod(a, b, r, mat, v=16):
    va, vb = Vector(a), Vector(b); d = vb - va
    op.primitive_cylinder_add(radius=r, depth=d.length, vertices=v, location=(va + vb) / 2); o = bpy.context.object
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); return lib.give(o, mat)

def box(x0, x1, y0, y1, z0, z1, mat, bev=0.03, seg=4):
    op.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); o = bpy.context.object
    o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True); lib.give(o, mat)
    if bev: m = o.modifiers.new("b", "BEVEL"); m.width = bev; m.segments = seg; m.limit_method = "ANGLE"
    return o

# ---- iron frame: head end (tall) and foot end (low), each with an arched top rail and vertical bars ----
for x, hgt in ((-L, 1.0), (L, 0.78)):
    for y in (-Wd, Wd):
        rod((x, y, 0), (x, y, hgt), 0.025, iron)
        op.primitive_uv_sphere_add(radius=0.04, location=(x, y, hgt + 0.02)); lib.give(bpy.context.object, brass)
    n = 14; pts = [(x, -Wd + 2 * Wd * i / n, hgt - 0.06 + 0.06 * math.sin(math.pi * i / n)) for i in range(n + 1)]
    for a, b in zip(pts, pts[1:]): rod(a, b, 0.018, iron, 10)
    rod((x, -Wd, 0.36), (x, Wd, 0.36), 0.016, iron, 10)
    for k in range(1, 6):
        y = -Wd + 2 * Wd * k / 6; rod((x, y, 0.36), (x, y, hgt - 0.06 + 0.06 * math.sin(math.pi * k / 6)), 0.011, iron, 8)
for y in (-Wd, Wd): rod((-L, y, 0.36), (L, y, 0.36), 0.02, iron, 10)          # side rails
box(-L + 0.03, L - 0.03, -Wd + 0.02, Wd - 0.02, 0.33, 0.37, spring, 0.0)           # spring base
# ---- mattress, blanket folded back with a cream stripe, pillow ----
box(-L + 0.04, L - 0.04, -Wd + 0.02, Wd - 0.02, 0.37, 0.52, matt, 0.05, 5)
box(-0.45, L - 0.02, -Wd - 0.01, Wd + 0.01, 0.4, 0.545, blank, 0.05, 5)
box(-0.5, -0.36, -Wd - 0.015, Wd + 0.015, 0.47, 0.565, stripe, 0.04, 4)             # the turned-back sheet
op.primitive_uv_sphere_add(radius=0.18, location=(-0.66, 0, 0.6)); p = bpy.context.object; p.scale = (0.85, 1.8, 0.42); lib.give(p, pil)
# ---- mosquito net: hangs from a ceiling ring and drapes over the whole bed down to the mattress (a translucent tent) ----
netobs = []
if NET:
    prof = [(0.0, 1.95), (0.03, 1.94), (0.1, 1.8), (0.24, 1.5), (0.4, 1.17), (0.53, 0.88), (0.61, 0.66), (0.64, 0.46), (0.0, 0.46)]
    o = lib.lathe("net", prof, 96, wob=lambda a, z: 1 + 0.05 * math.sin(16 * a) * min(1, (1.95 - z) * 1.2))
    lib.give(o, net); o.scale = (1.55, 0.82, 1); netobs.append(o)
    op.primitive_torus_add(major_radius=0.06, minor_radius=0.008, location=(0, 0, 1.95)); netobs.append(lib.give(bpy.context.object, iron))
    netobs.append(rod((0, 0, 1.95), (0, 0, 2.02), 0.006, iron, 6))

el = math.radians(14)
yaw = math.radians(-24)   # a 3/4 view from the foot end side so the iron head and foot rails read
lib.setup_render(out, size, cam_loc=(30 * math.sin(-yaw) * math.cos(el) * -1, -30 * math.cos(yaw) * math.cos(el), 0.8 + 30 * math.sin(el)), target=(0.0, 0, 0.8), ortho=2.3, line=2.2)
if NET:  # two passes so the bed keeps its ink lines through the net (Freestyle would hide lines behind the net surface)
    for o in netobs: o.hide_render = True
    lib.render()
    others = [o for o in bpy.context.scene.objects if o.type == "MESH" and o not in netobs]
    for o in others: o.hide_render = True
    for o in netobs: o.hide_render = False
    pnet = out[:-4] + "_netpass.png"; bpy.context.scene.render.filepath = pnet; lib.render()
    import numpy as np
    A = bpy.data.images.load(out); N = bpy.data.images.load(pnet); W, H = A.size
    a = np.empty(W * H * 4, np.float32); n = np.empty(W * H * 4, np.float32); A.pixels.foreach_get(a); N.pixels.foreach_get(n)
    a = a.reshape(-1, 4); n = n.reshape(-1, 4); na = n[:, 3:4]; aa = a[:, 3:4]
    oa = na + aa * (1 - na); oc = (n[:, :3] * na + a[:, :3] * aa * (1 - na)) / np.maximum(oa, 1e-6)
    A.pixels.foreach_set(np.concatenate([oc, oa], 1).ravel()); A.filepath_raw = out; A.file_format = "PNG"; A.save()
    os.remove(pnet)
else:
    lib.render()
lib.meta(out, {"origin": (0, -Wd, 0), "x1": (1, -Wd, 0)})
