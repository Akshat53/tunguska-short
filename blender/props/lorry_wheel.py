# Road wheel for lorry.py, seen face-on (the video rotates it by the frame and squashes it to the lorry's 3/4 angle).
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib

out, size = lib.args()
lib.reset()
op = bpy.ops.mesh
tyre = lib.toon("tyre", "#2a2d2f"); rim = lib.toon("rim", "#f2b632"); hub = lib.toon("hub", "#a9b0b2"); dark = lib.toon("dark", "#3a2a20")
R = 0.46
# tyre: lathe profile (radius, y) spun around the axle (Z here, camera looks down -Z)
prof = [(0.29, -0.13), (0.31, -0.14), (0.42, -0.14), (0.45, -0.12), (0.46, -0.06), (0.46, 0.06), (0.45, 0.12), (0.42, 0.14), (0.31, 0.14), (0.29, 0.13)]
lib.give(lib.lathe("tyre", prof, 64), tyre)
# tread blocks around the rim edge (show the spin)
for i in range(24):
    a = 2 * math.pi * i / 24
    op.primitive_cube_add(size=1, location=(0.445 * math.cos(a), 0.445 * math.sin(a), 0.1), rotation=(0, 0, a)); b = bpy.context.object
    b.scale = (0.03, 0.06, 0.06); lib.give(b, dark, False)
# steel disc wheel: dished rim, 6 holes, hub cap, 6 wheel nuts
op.primitive_cylinder_add(radius=0.3, depth=0.05, vertices=64, location=(0, 0, 0.11)); lib.give(bpy.context.object, rim)
op.primitive_torus_add(major_radius=0.27, minor_radius=0.018, location=(0, 0, 0.14)); lib.give(bpy.context.object, dark)
for i in range(6):
    a = 2 * math.pi * i / 6 + math.pi / 6
    op.primitive_cylinder_add(radius=0.042, depth=0.02, location=(0.19 * math.cos(a), 0.19 * math.sin(a), 0.14)); lib.give(bpy.context.object, dark)
op.primitive_cylinder_add(radius=0.12, depth=0.06, vertices=48, location=(0, 0, 0.15)); lib.give(bpy.context.object, hub)
for i in range(6):
    a = 2 * math.pi * i / 6
    op.primitive_cylinder_add(radius=0.016, depth=0.03, vertices=6, location=(0.09 * math.cos(a), 0.09 * math.sin(a), 0.19)); lib.give(bpy.context.object, dark)
op.primitive_uv_sphere_add(radius=0.05, location=(0, 0, 0.18)); o = bpy.context.object; o.scale = (1, 1, 0.6); lib.give(o, hub)
lib.setup_render(out, size, cam_loc=(0, 0, 10), target=(0, 0, 0), ortho=1.05, line=2.4)
bpy.data.objects["cam"].rotation_euler = (0, 0, 0)
lib.render()
lib.meta(out, {"c": (0, 0, 0.2), "top": (0, R, 0.2)})
