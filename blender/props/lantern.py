# A ship's hurricane lantern (survive-titanic: the light in Lifeboat 14 going back): tin/brass frame, glass globe,
# wire guards, bail handle. Upright, slight 3/4 from above. Metres.
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib
out, size = lib.args(1400)
lib.reset()
tin = lib.toon("tin", "#c9a24a", 0.7, 1.18); dark = lib.toon("tind", "#7a5a2a", 0.72, 1.1)
glass = lib.toon("glass", "#ffe9a8", 0.92, 1.04); flame = lib.toon("flame", "#ffffff", 1.0, 1.0)
lib.give(lib.lathe("base", [(0.0, 0.0), (0.11, 0.0), (0.12, 0.03), (0.11, 0.07), (0.09, 0.08)], 40), tin)
lib.give(lib.lathe("globe", [(0.07, 0.08), (0.095, 0.13), (0.1, 0.2), (0.09, 0.26), (0.06, 0.29)], 40), glass)
lib.give(lib.lathe("cap", [(0.07, 0.29), (0.1, 0.3), (0.09, 0.33), (0.05, 0.36), (0.035, 0.4), (0.0, 0.41)], 40), tin)
for k in range(4):
    a = k * math.pi / 2 + 0.4
    bpy.ops.mesh.primitive_cylinder_add(radius=0.006, depth=0.22, location=(0.105 * math.cos(a), 0.105 * math.sin(a), 0.185)); lib.give(bpy.context.object, dark)
bpy.ops.mesh.primitive_torus_add(major_radius=0.105, minor_radius=0.006, location=(0, 0, 0.19)); lib.give(bpy.context.object, dark)
bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.008, location=(0, 0, 0.42), rotation=(math.radians(90), 0, 0)); o = bpy.context.object
o.scale = (1, 1.3, 1); lib.give(o, dark)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.025, location=(0, 0, 0.16)); o = bpy.context.object; o.scale = (0.7, 0.7, 1.4); lib.give(o, flame)
lib.setup_render(out, size, cam_loc=(0.9, -1.4, 0.8), target=(0, 0, 0.24), ortho=0.75, line=2.2)
lib.render()
