# 1950s/60s East African flatbed lorry (Laughter Epidemic 1962: the lorry that takes the girls home). Side 3/4 view facing
# screen-right. The near road wheels are HOLDOUTS (transparent holes): the video draws lorry_wheel.png behind the body,
# rotated by the frame, so the wheels turn while the card drives off. lorry.json gives wheel centres in image pixels.
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib
from mathutils import Vector

out, size = lib.args()
lib.reset()
op = bpy.ops.mesh
cab = lib.toon("cab", "#2f8f83"); fend = lib.toon("fender", "#1f6a63"); cream = lib.toon("cream", "#f2e6c4")
wood = lib.toon("wood", "#b07a42"); post = lib.toon("post", "#6b4428"); chas = lib.toon("chassis", "#3a2a20")
tyre = lib.toon("tyre", "#2a2d2f"); metal = lib.toon("metal", "#a9b0b2"); glass = lib.toon("glass", "#bfe4e8", 0.85, 1.05)
lamp = lib.toon("lamp", "#fff2b0"); sun = lib.toon("sunflower", "#f2b632"); hole = lib.holdout()
R, WY = 0.46, -0.86            # wheel radius, near-wheel centre plane
WX = (-1.55, 1.75)             # rear, front axle x

def box(x0, x1, y0, y1, z0, z1, mat, bev=0.02, seg=2):
    op.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); o = bpy.context.object
    o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True)
    lib.give(o, mat, False)
    if bev: m = o.modifiers.new("b", "BEVEL"); m.width = bev; m.segments = seg; m.limit_method = "ANGLE"
    return o

def cyl_y(x, y, z, r, depth, mat, v=48):
    op.primitive_cylinder_add(radius=r, depth=depth, vertices=v, location=(x, y, z), rotation=(math.radians(90), 0, 0))
    return lib.give(bpy.context.object, mat)

def arch(xc, zc, r0, r1, y0, y1, a0, a1, mat, n=28):
    """a curved mudguard: annulus sector (angles in deg, 0 = +x, 90 = up) extruded between y0 and y1"""
    vs = []; fs = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        for r in (r0, r1):
            for y in (y0, y1): vs.append((xc + r * math.cos(a), y, zc + r * math.sin(a)))
    for i in range(n):
        b, c = i * 4, (i + 1) * 4
        fs += [(b + 0, c + 0, c + 1, b + 1), (b + 2, b + 3, c + 3, c + 2), (b + 0, b + 2, c + 2, c + 0), (b + 1, c + 1, c + 3, b + 3)]
    fs += [(0, 1, 3, 2), (n * 4, n * 4 + 2, n * 4 + 3, n * 4 + 1)]
    me = bpy.data.meshes.new("arch"); me.from_pydata(vs, [], fs); me.update()
    o = bpy.data.objects.new("arch", me); bpy.context.scene.collection.objects.link(o)
    return lib.give(o, mat)

# ---- chassis, bed, slatted side rails ----
box(-2.45, 2.55, -0.5, 0.5, 0.58, 0.78, chas, 0.01)
box(-2.5, 0.92, -1.05, 1.05, 0.82, 0.98, post, 0.015)                     # bed floor
for i, x in enumerate([-2.42, -1.6, -0.78, 0.04, 0.86]):                   # stake posts, both sides
    for y in (-1.07, 1.07): box(x - 0.06, x + 0.06, y - 0.05, y + 0.05, 0.8, 1.64, post, 0.012)
for z in (1.04, 1.32):                                                      # two planks per side (gap between)
    for y in (-1.02, 1.02): box(-2.46, 0.92, y - 0.035, y + 0.035, z, z + 0.2, wood, 0.012)
for z in (1.04, 1.32): box(-2.5, -2.43, -1.0, 1.0, z, z + 0.2, wood, 0.012)    # tailgate
box(0.86, 0.94, -1.0, 1.0, 0.98, 1.8, wood, 0.012)                        # headboard against the cab
for y in (-1.04, 1.04): box(-2.48, 0.92, y - 0.05, y + 0.05, 1.58, 1.64, post, 0.01)  # top capping rail
for x in (-2.0, -1.2, -0.4, 0.4):                                          # rope hooks on the side
    op.primitive_torus_add(major_radius=0.04, minor_radius=0.012, location=(x, -1.09, 0.86), rotation=(math.radians(90), 0, 0)); lib.give(bpy.context.object, metal)

# ---- rounded cab ----
c = box(0.98, 2.05, -0.95, 0.95, 0.95, 2.18, cab, 0.34, 10)
box(1.08, 1.86, -0.97, -0.94, 1.5, 1.98, glass, 0.06, 3)                   # side window
box(2.02, 2.07, -0.85, -0.06, 1.52, 1.98, glass, 0.06, 3); box(2.02, 2.07, 0.06, 0.85, 1.52, 1.98, glass, 0.06, 3)  # split windscreen
box(1.62, 1.74, -1.0, -0.97, 1.38, 1.42, metal, 0.008)                      # door handle
box(1.95, 2.0, -1.12, -1.0, 1.7, 1.72, metal, 0.0); box(1.94, 2.0, -1.2, -1.12, 1.6, 1.86, metal, 0.02)  # mirror arm + mirror
# ---- bonnet, grille, lamps, bumper ----
box(2.0, 2.92, -0.62, 0.62, 0.9, 1.62, cab, 0.24, 8)
box(2.88, 2.98, -0.42, 0.42, 0.88, 1.5, chas, 0.06, 3)                      # grille opening
for k in range(8): box(2.97, 3.04, -0.38 + k * 0.105, -0.32 + k * 0.105, 0.92, 1.46, metal, 0.0)
box(2.95, 3.03, -0.45, 0.45, 1.46, 1.53, metal, 0.02); box(2.95, 3.03, -0.45, 0.45, 0.86, 0.92, metal, 0.02)
op.primitive_cylinder_add(radius=0.035, depth=0.9, location=(2.4, 0, 1.63), rotation=(0, math.radians(90), 0)); lib.give(bpy.context.object, metal)  # bonnet hinge strip
# front wings (mudguards) sweeping over the front wheel down into the running board
for y0, y1 in ((-1.0, -0.62), (0.62, 1.0)):
    arch(WX[1], R, R + 0.06, R + 0.15, y0, y1, -8, 180, fend)
    box(0.98, WX[1] - R - 0.12, y0, y1, 0.42, 0.52, fend, 0.03)              # running board
for s in (-1, 1):
    op.primitive_uv_sphere_add(radius=0.15, location=(2.55, s * 0.78, 1.2)); h = bpy.context.object; h.scale = (1.25, 1, 1); lib.give(h, fend)
    op.primitive_uv_sphere_add(radius=0.11, location=(2.72, s * 0.78, 1.2)); lib.give(bpy.context.object, lamp)
box(2.92, 3.08, -1.0, 1.0, 0.5, 0.64, metal, 0.04)                          # bumper
op.primitive_uv_sphere_add(radius=0.05, location=(3.08, -0.55, 0.57)); lib.give(bpy.context.object, sun)  # indicator
box(2.97, 3.02, -0.18, 0.18, 0.66, 0.8, cream, 0.01)                        # number plate
# rear mudguards
for y0, y1 in ((-1.02, -0.66), (0.66, 1.02)): arch(WX[0], R, R + 0.05, R + 0.12, y0, y1, 20, 160, chas)
box(-2.52, -2.46, -0.95, -0.75, 0.62, 0.78, lib.toon("tail", "#c4483a"), 0.01)   # tail lamp
# fuel tank + spare wheel slung under the bed, between the axles
op.primitive_cylinder_add(radius=0.17, depth=0.7, location=(0.45, -0.66, 0.55), rotation=(0, math.radians(90), 0)); lib.give(bpy.context.object, metal)
op.primitive_torus_add(major_radius=0.29, minor_radius=0.1, location=(-0.42, -0.62, 0.48), rotation=(math.radians(90), 0, 0)); lib.give(bpy.context.object, tyre)
cyl_y(-0.42, -0.62, 0.48, 0.2, 0.12, sun); cyl_y(-0.42, -0.69, 0.48, 0.07, 0.04, metal)
box(-0.48, -0.36, -0.62, -0.5, 0.48, 0.8, chas, 0.0)                        # hanger bracket
# ---- wheels: near side = tyre tread + holdout face (the sprite shows through); far side = plain tyres ----
for x in WX:
    cyl_y(x, WY + 0.02, R, R, 0.26, tyre)
    cyl_y(x, WY - 0.115, R, R + 0.002, 0.012, hole)
    cyl_y(x, -WY, R, R, 0.26, tyre)
op.primitive_cylinder_add(radius=0.06, depth=1.6, location=(WX[0], 0, R), rotation=(math.radians(90), 0, 0)); lib.give(bpy.context.object, chas)

yaw, el = math.radians(22), math.radians(2.5)
tgt = Vector((0.3, 0, 1.05)); D = 30
cam = tgt + D * Vector((math.sin(yaw) * math.cos(el), -math.cos(yaw) * math.cos(el), math.sin(el)))
lib.setup_render(out, size, cam_loc=tuple(cam), target=tuple(tgt), ortho=6.6, line=2.4)
# roll the camera so the road line (along the lorry) stays level in the image: the card stands on a flat road
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix
sc = bpy.context.scene; co = sc.camera; bpy.context.view_layer.update()
p0 = world_to_camera_view(sc, co, Vector((-2, -1, 0))); p1 = world_to_camera_view(sc, co, Vector((2, -1, 0)))
roll = math.atan2(p1.y - p0.y, p1.x - p0.x)
co.matrix_world = co.matrix_world @ Matrix.Rotation(roll, 4, "Z"); bpy.context.view_layer.update()
lib.render()
fy = WY - 0.122
lib.meta(out, {"rear": (WX[0], fy, R), "front": (WX[1], fy, R), "rear_top": (WX[0], fy, 2 * R), "rear_side": (WX[0] + R, fy, R), "origin": (0, -1.0, 0), "x1": (1, -1.0, 0)})
