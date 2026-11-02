# The clinic lab table (Laughter Epidemic 1962): enamel-topped metal table, wooden test-tube rack with coloured samples,
# an Erlenmeyer flask, a round-bottom flask on a ring stand, a brass microscope, a notebook. Front view, a little above
# (the doctors stand behind it). Same layout as the canvas labTable (rack left, flask, microscope right of centre).
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib

out, size = lib.args()
lib.reset()
op = bpy.ops.mesh
top = lib.toon("top", "#f4f1e6"); steel = lib.toon("steel", "#c3cacb"); legm = lib.toon("leg", "#5a6a6e")
wood = lib.toon("wood", "#b07a42"); wdark = lib.toon("wdark", "#7a4e2e"); glass = lib.sheer("glass", "#d8f0f2", 0.5)
brass = lib.toon("brass", "#c99a44"); bdark = lib.toon("bdark", "#8a5a26"); black = lib.toon("black", "#2a3436")
paper = lib.toon("paper", "#fbf4e2"); cover = lib.toon("cover", "#2f7f78"); hi = lib.toon("hi", "#ffffff")
LIQ = ["#ff8a5a", "#4fc3a8", "#f2c230", "#3f9fb0", "#e8663e", "#7fd0a0"]

def box(x0, x1, y0, y1, z0, z1, mat, bev=0.008, seg=2):
    op.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); o = bpy.context.object
    o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True); lib.give(o, mat, False)
    if bev: m = o.modifiers.new("b", "BEVEL"); m.width = bev; m.segments = seg; m.limit_method = "ANGLE"
    return o

def cyl(x, y, z, r, d, mat, v=32, rot=(0, 0, 0)):
    op.primitive_cylinder_add(radius=r, depth=d, vertices=v, location=(x, y, z), rotation=rot); return lib.give(bpy.context.object, mat)

def tube(x, y, z0, h, r, liq, fill=0.45):
    """test tube: round-bottomed liquid column + clear glass above + a lip"""
    lz = z0 + h * fill
    cyl(x, y, (z0 + r + lz) / 2, r, lz - z0 - r, lib.toon("l" + liq, liq))
    op.primitive_uv_sphere_add(radius=r, location=(x, y, z0 + r)); lib.give(bpy.context.object, lib.toon("l" + liq, liq))
    cyl(x, y, (lz + z0 + h) / 2, r, z0 + h - lz, glass)
    op.primitive_torus_add(major_radius=r, minor_radius=r * 0.18, location=(x, y, z0 + h)); lib.give(bpy.context.object, glass)

TZ = 0.74  # table top height
# ---- table ----
box(-1.46, 1.46, -0.42, 0.42, TZ - 0.05, TZ, top, 0.012)
box(-1.38, 1.38, -0.38, 0.38, TZ - 0.24, TZ - 0.05, steel, 0.01)
for x0 in (-1.3, -0.42, 0.46):                                              # three drawers with pulls
    box(x0, x0 + 0.84, -0.395, -0.38, TZ - 0.22, TZ - 0.07, steel, 0.006)
    box(x0 + 0.34, x0 + 0.5, -0.42, -0.395, TZ - 0.16, TZ - 0.13, black, 0.006)
for x in (-1.32, 1.32):
    for y in (-0.33, 0.33): box(x - 0.035, x + 0.035, y - 0.035, y + 0.035, 0.0, TZ - 0.24, legm, 0.006)
box(-1.32, 1.32, -0.02, 0.02, 0.12, 0.15, legm, 0.004)                      # stretcher
# ---- test-tube rack (left), 6 tubes, two tiers ----
RX0, RX1 = -1.22, -0.5
box(RX0, RX1, -0.12, 0.08, TZ, TZ + 0.025, wdark, 0.006)
box(RX0, RX1, -0.12, 0.08, TZ + 0.12, TZ + 0.145, wood, 0.006)
for x in (RX0 + 0.02, RX1 - 0.02): box(x - 0.02, x + 0.02, -0.12, 0.08, TZ, TZ + 0.2, wood, 0.006)
for k in range(6):
    x = RX0 + 0.09 + k * 0.108
    tube(x, -0.02, TZ + 0.025, 0.36 + 0.02 * (k % 2), 0.038, LIQ[k], 0.42 + 0.08 * ((k * 3) % 4) / 3)
# ---- Erlenmeyer flask with sea-green liquid ----
FX = -0.22
lib.give(lib.lathe("eliq", [(0.0, 0.0), (0.16, 0.0), (0.17, 0.012), (0.105, 0.13), (0.0, 0.13)], 48), lib.toon("eliq", "#4fc3a8")).location = (FX, -0.08, TZ)
lib.give(lib.lathe("eg", [(0.105, 0.13), (0.045, 0.25), (0.045, 0.34), (0.055, 0.35), (0.0, 0.35)], 48), glass).location = (FX, -0.08, TZ)
# ---- round-bottom flask on a ring stand with a spirit lamp (amber sample) ----
SX = 0.06
box(SX - 0.12, SX + 0.12, 0.0, 0.16, TZ, TZ + 0.015, black, 0.004)
cyl(SX + 0.1, 0.08, TZ + 0.24, 0.012, 0.48, legm)
op.primitive_torus_add(major_radius=0.08, minor_radius=0.01, location=(SX, 0.08, TZ + 0.26)); lib.give(bpy.context.object, legm)
cyl(SX + 0.05, 0.08, TZ + 0.26, 0.008, 0.1, legm, 8, (0, math.radians(90), 0))
op.primitive_uv_sphere_add(radius=0.1, location=(SX, 0.08, TZ + 0.33)); b = bpy.context.object; lib.give(b, lib.toon("amb", "#f2b632"))
cyl(SX, 0.08, TZ + 0.47, 0.03, 0.12, glass)
lib.give(lib.lathe("lamp", [(0.0, 0.0), (0.07, 0.0), (0.075, 0.05), (0.05, 0.1), (0.015, 0.11), (0.0, 0.11)], 32), lib.toon("lampg", "#bfe4e8")).location = (SX, 0.08, TZ + 0.015)
cyl(SX, 0.08, TZ + 0.14, 0.008, 0.05, paper, 8)
# ---- brass microscope (right of centre): horseshoe foot, pillar, curved arm, stage, inclined tube ----
MX, MY = 0.46, 0.0
foot = lib.lathe("foot", [(0.0, 0.0), (0.13, 0.0), (0.13, 0.03), (0.1, 0.045), (0.0, 0.045)], 40); lib.give(foot, black); foot.location = (MX, MY + 0.04, TZ)
foot.scale = (1.0, 0.8, 1)
cyl(MX, MY + 0.06, TZ + 0.12, 0.028, 0.16, brass)
box(MX - 0.11, MX + 0.11, MY - 0.09, MY + 0.1, TZ + 0.2, TZ + 0.22, black, 0.006)        # stage
box(MX - 0.05, MX + 0.05, MY - 0.06, MY - 0.03, TZ + 0.222, TZ + 0.226, hi, 0.0)          # slide
op.primitive_torus_add(major_radius=0.035, minor_radius=0.008, location=(MX, MY + 0.0, TZ + 0.14), rotation=(math.radians(80), 0, 0)); lib.give(bpy.context.object, brass)  # mirror ring
cyl(MX, MY + 0.0, TZ + 0.14, 0.032, 0.006, lib.toon("mir", "#e8f4f6"), 24, (math.radians(80), 0, 0))
# arm: a bent bar from behind the stage up and over
arm = [(MX, MY + 0.12, TZ + 0.2), (MX, MY + 0.14, TZ + 0.3), (MX, MY + 0.12, TZ + 0.4), (MX, MY + 0.07, TZ + 0.47)]
for (a, b) in zip(arm, arm[1:]):
    from mathutils import Vector
    va, vb = Vector(a), Vector(b); d = vb - va
    op.primitive_cylinder_add(radius=0.03, depth=d.length + 0.03, vertices=20, location=(va + vb) / 2); o = bpy.context.object
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); lib.give(o, brass)
for s in (-1, 1): cyl(MX + s * 0.05, MY + 0.14, TZ + 0.33, 0.035, 0.03, bdark, 24, (0, math.radians(90), 0))  # focus knobs
# body tube (tilted back a little), nosepiece, objective, eyepiece
tilt = math.radians(14)
def tp(t):  # point along the tube axis
    return (MX, MY + 0.02 + t * math.sin(tilt), TZ + 0.27 + t * math.cos(tilt))
cyl(*tp(0.16), 0.042, 0.26, brass, 32, (-tilt, 0, 0))
cyl(*tp(0.02), 0.05, 0.03, bdark, 32, (-tilt, 0, 0))
cyl(*tp(-0.015), 0.018, 0.06, black, 16, (-tilt, 0, 0))
cyl(*tp(0.31), 0.03, 0.06, black, 24, (-tilt, 0, 0))
cyl(*tp(0.345), 0.036, 0.015, brass, 24, (-tilt, 0, 0))
# ---- notebook with a pencil (right) ----
box(0.82, 1.28, -0.2, 0.12, TZ, TZ + 0.02, cover, 0.0)
box(0.84, 1.26, -0.19, 0.11, TZ + 0.02, TZ + 0.04, paper, 0.0)
cyl(1.1, -0.05, TZ + 0.045, 0.008, 0.22, lib.toon("pen", "#f2b632"), 6, (0, math.radians(90), math.radians(20)))
# a small brown medicine bottle + beaker of water
cyl(-0.38, 0.14, TZ + 0.08, 0.04, 0.16, lib.toon("bot", "#8a4a2a")); cyl(-0.38, 0.14, TZ + 0.18, 0.018, 0.04, paper)
cyl(1.36 - 0.1, 0.18, TZ + 0.06, 0.06, 0.12, glass)

el = math.radians(13)
lib.setup_render(out, size, cam_loc=(0.0, -30 * math.cos(el), TZ + 30 * math.sin(el)), target=(0.0, 0, TZ), ortho=3.2, line=2.0)
lib.render()
lib.meta(out, {"origin": (0, -0.42, 0), "x1": (1, -0.42, 0)})
