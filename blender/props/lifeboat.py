# A Titanic wooden lifeboat (Harland & Wolff 30 ft standard boat, survive-titanic): white-painted planked hull with a
# varnished wooden gunwale, thwarts (benches), floorboards, rudder; 3/4 view from the port bow, slightly above, bow to
# screen-right. Units: metres (9.1 x 2.8 x 1.2). Renders three images with ONE camera:
#   lifeboat.png       the whole boat (crop by build.sh)
#   lifeboat_far.png   interior + far side only (people are drawn on top of this in the video)
#   lifeboat_near.png  the near side of the hull + near gunwale only (drawn over the people)
# then run: .venv/bin/python blender/crop_pair.py public/props/lifeboat_far.png public/props/lifeboat_near.png
# (writes lifeboat_pair.json: seat points in cropped pixels).
import bpy, math, os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib
from mathutils import Vector

out, size = lib.args(2000)
lib.reset()
white = lib.toon("white", "#f1eee4", 0.74, 1.05); strake = lib.toon("strake", "#e2ddcf", 0.74, 1.05)
wood = lib.toon("wood", "#b8834a", 0.72, 1.12); dark = lib.toon("darkwood", "#7a5232", 0.72, 1.1)
inner = lib.toon("inner", "#c99a62", 0.75, 1.1); innerb = lib.toon("innerb", "#b98a54", 0.75, 1.1); band = lib.toon("band", "#2f8f83", 0.75, 1.1); rope = lib.toon("rope", "#d8c49a", 0.8, 1.05)
LEN, BEAM, DEP = 9.1, 2.8, 1.15

def hb(x, zn):     # half beam at x (-L/2..L/2), zn 0 keel .. 1 gunwale: double-ended
    u = abs(x) / (LEN / 2)
    return BEAM / 2 * max(0.0, 1 - u ** 2.3) ** 0.55 * (0.25 + 0.75 * zn ** 0.55)

def shell(side, thick=0.0, mat=white, name="shell", alt=None):
    """one side of the hull (side = -1 near / +1 far) as a lofted surface, outer (thick=0) or inner (thick>0)"""
    NX, NZ = 60, 10; vs = []; fs = []
    for i in range(NX + 1):
        x = -LEN / 2 + LEN * i / NX
        sheer = 0.12 * (2 * abs(x) / LEN) ** 2.5
        for j in range(NZ + 1):
            zn = j / NZ; z = -DEP + (DEP + sheer) * zn
            vs.append((x, side * max(0.0, hb(x, zn) - thick), z))
    for i in range(NX):
        for j in range(NZ):
            a = i * (NZ + 1) + j; c = (i + 1) * (NZ + 1) + j
            fs.append((a, c, c + 1, a + 1) if side < 0 else (a, a + 1, c + 1, c))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    lib.give(o, mat)
    if alt is not None:
        o.data.materials.append(alt)
        for k, p in enumerate(o.data.polygons): p.material_index = (k % NZ) % 2
    sol = o.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.04
    return o

def box(x0, x1, y0, y1, z0, z1, mat, bev=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); o = bpy.context.object
    o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True); lib.give(o, mat, False)
    if bev: b = o.modifiers.new("b", "BEVEL"); b.width = bev; b.segments = 2
    return o

def gunwale(side, mat):
    """one continuous rail (rectangular section swept along the sheer line)"""
    N = 80; vs = []; fs = []
    for i in range(N + 1):
        x = -LEN / 2 + LEN * i / N; sh = 0.12 * (2 * abs(x) / LEN) ** 2.5; y = side * hb(x, 1.0)
        for dy, dz in ((-0.07, -0.05), (0.07, -0.05), (0.07, 0.07), (-0.07, 0.07)):
            vs.append((x, y + dy, sh + dz))
    for i in range(N):
        for k in range(4):
            a, b = i * 4 + k, i * 4 + (k + 1) % 4
            fs.append((a, b, b + 4, a + 4))
    fs += [(0, 1, 2, 3), (N * 4 + 3, N * 4 + 2, N * 4 + 1, N * 4)]
    me = bpy.data.meshes.new("gw"); me.from_pydata(vs, [], fs); me.update()
    o = bpy.data.objects.new("gw", me); bpy.context.scene.collection.objects.link(o)
    return [lib.give(o, mat)]

near = [shell(-1, 0, white, "near", strake)]
far = [shell(1, 0, white, "far"), shell(1, 0.05, inner, "farin", innerb), shell(-1, 0.05, inner, "nearin", innerb)]
near += gunwale(-1, wood)
# a teal band under the near gunwale (the boat number board sits on the bow)
far += gunwale(1, wood)
# thwarts (benches), floorboards, stem/stern posts, rudder
SEATS = (-2.9, -1.6, -0.3, 1.0, 2.3)
for x in SEATS:
    w = hb(x, 0.72) * 2 - 0.08
    far.append(box(x - 0.16, x + 0.16, -w / 2, w / 2, -0.34, -0.28, wood))
for i in range(5):
    y = -0.4 + i * 0.2
    far.append(box(-2.6, 2.6, y - 0.08, y + 0.08, -0.7, -0.67, dark, 0.005))
for sx in (-1, 1):
    near.append(box(sx * LEN / 2 - 0.08, sx * LEN / 2 + 0.08, -0.06, 0.06, -DEP, 0.3, wood))
far.append(box(-LEN / 2 - 0.4, -LEN / 2 - 0.05, -0.03, 0.03, -0.9, 0.0, wood))       # rudder
bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.035, location=(LEN / 2 - 0.4, 0, 0.32)); far.append(lib.give(bpy.context.object, rope))
lib.setup_render(out, size, cam_loc=(6.5, -12.5, 5.2), target=(0.2, 0, -0.35), ortho=10.5, line=2.2)
lib.render()
# seat points (where people sit: on each thwart, both halves) -> raw pixels, converted by crop_pair.py
from bpy_extras.object_utils import world_to_camera_view
sc = bpy.context.scene; W = sc.render.resolution_x; H = sc.render.resolution_y
pts = {"px_per_m": round(W / sc.camera.data.ortho_scale, 3)}
for i, x in enumerate(SEATS):
    for s, tag in ((-0.5, "n"), (0.5, "f")):
        v = world_to_camera_view(sc, sc.camera, Vector((x, s * hb(x, 0.72), -0.28)))
        pts[f"s{i}{tag}"] = [round(v.x * W, 1), round((1 - v.y) * H, 1)]
for k, p in {"bow": (LEN / 2, 0, 0.3), "stern": (-LEN / 2, 0, 0.12), "wl_bow": (LEN / 2 - 0.3, -hb(LEN / 2 - 0.3, 0.45), -0.55), "wl_stern": (-LEN / 2 + 0.3, -hb(-LEN / 2 + 0.3, 0.45), -0.55),
                 "wl_mid": (0, -hb(0, 0.45), -0.55), "lantern": (LEN / 2 - 0.6, 0, 0.6), "oar_n": (0.4, -hb(0.4, 1), 0.05), "oar_f": (0.4, hb(0.4, 1), 0.05)}.items():
    v = world_to_camera_view(sc, sc.camera, Vector(p)); pts[k] = [round(v.x * W, 1), round((1 - v.y) * H, 1)]
base = out[:-4]
json.dump(pts, open(base + "_far.pts.json", "w"))
for tag, keep in (("_far", far), ("_near", near)):
    for o in sc.objects:
        if o.type == "MESH": o.hide_render = o not in keep
    sc.render.filepath = base + tag + ".png"; bpy.ops.render.render(write_still=True)
