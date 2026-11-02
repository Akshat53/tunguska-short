# Bronze field cannon on a wooden carriage with spoked wheels (Iron Pillar: the cannonball shot).
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib

out, size = lib.args()
lib.reset()
bronze = lib.toon("bronze", "#c08a3e"); dark = lib.toon("darkbronze", "#8a5a26")
wood = lib.toon("wood", "#8a5632"); iron = lib.toon("iron", "#3c3f46")
op = bpy.ops.mesh

# barrel: lathe a profile (radius along the bore) with a screw-free spin
prof = [(0.0, -0.95), (0.13, -0.95), (0.19, -0.9), (0.21, -0.8), (0.205, -0.55), (0.23, -0.5), (0.23, -0.44), (0.19, -0.4),
        (0.17, 0.2), (0.19, 0.24), (0.19, 0.3), (0.16, 0.34), (0.145, 0.95), (0.17, 1.0), (0.2, 1.08), (0.2, 1.16), (0.11, 1.16), (0.11, 1.0), (0.0, 1.0)]
me = bpy.data.meshes.new("barrel"); n = 40
verts = []; faces = []
for i in range(n):
    a = 2 * math.pi * i / n
    for r, z in prof: verts.append((r * math.cos(a), r * math.sin(a), z))
m = len(prof)
for i in range(n):
    for j in range(m - 1):
        a0, a1 = i * m + j, ((i + 1) % n) * m + j
        faces.append((a0, a1, a1 + 1, a0 + 1))
me.from_pydata(verts, [], faces); me.update()
barrel = bpy.data.objects.new("barrel", me); bpy.context.scene.collection.objects.link(barrel)
lib.give(barrel, bronze)
barrel.rotation_euler = (math.radians(-80), 0, 0); barrel.location = (0, 0.05, 0.86)  # tilted up a little
# cascabel knob + trunnions
op.primitive_uv_sphere_add(radius=0.09, location=(0, 0.05, 0.86)); k = bpy.context.object
k.location = barrel.matrix_world @ __import__("mathutils").Vector((0, 0, -1.03)); lib.give(k, dark)
op.primitive_cylinder_add(radius=0.07, depth=0.62, location=(0, 0, 0.86), rotation=(0, math.radians(90), 0)); lib.give(bpy.context.object, dark)

# carriage cheeks (two slanted planks) + transom
for s in (-1, 1):
    op.primitive_cube_add(size=1, location=(s * 0.26, -0.25, 0.55)); c = bpy.context.object
    c.scale = (0.08, 1.35, 0.3); c.rotation_euler = (math.radians(-12), 0, 0); lib.bevel(lib.give(c, wood, False), 0.02)
op.primitive_cube_add(size=1, location=(0, -0.55, 0.5)); t = bpy.context.object; t.scale = (0.5, 0.12, 0.16); lib.bevel(lib.give(t, wood, False))
# trail to the ground
op.primitive_cube_add(size=1, location=(0, -1.15, 0.22)); t = bpy.context.object; t.scale = (0.3, 0.9, 0.12)
t.rotation_euler = (math.radians(14), 0, 0); lib.bevel(lib.give(t, wood, False))
# axle + two spoked wheels
op.primitive_cylinder_add(radius=0.06, depth=0.95, location=(0, 0, 0.5), rotation=(0, math.radians(90), 0)); lib.give(bpy.context.object, iron)
for s in (-1, 1):
    x = s * 0.42
    op.primitive_torus_add(major_radius=0.46, minor_radius=0.045, location=(x, 0, 0.5), rotation=(0, math.radians(90), 0))
    lib.give(bpy.context.object, wood)
    op.primitive_torus_add(major_radius=0.5, minor_radius=0.022, location=(x, 0, 0.5), rotation=(0, math.radians(90), 0))
    lib.give(bpy.context.object, iron)  # iron tyre
    op.primitive_cylinder_add(radius=0.09, depth=0.14, location=(x, 0, 0.5), rotation=(0, math.radians(90), 0)); lib.give(bpy.context.object, dark)
    for i in range(12):
        a = 2 * math.pi * i / 12
        op.primitive_cylinder_add(radius=0.022, depth=0.4, location=(x, 0.23 * math.cos(a), 0.5 + 0.23 * math.sin(a)),
                                  rotation=(a - math.pi / 2, 0, 0))
        lib.give(bpy.context.object, wood, False)
# a few cannonballs stacked by the wheel
for (bx, by, bz) in [(0.85, -0.5, 0.1), (1.05, -0.5, 0.1), (0.95, -0.33, 0.1), (0.95, -0.44, 0.27)]:
    op.primitive_uv_sphere_add(radius=0.1, location=(bx, by, bz)); lib.give(bpy.context.object, iron)

lib.setup_render(out, size, cam_loc=(3.4, 3.2, 1.6), target=(0.1, -0.1, 0.55), lens=55)
lib.render()
