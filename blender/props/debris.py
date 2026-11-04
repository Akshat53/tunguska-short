# Floating wreckage from the Titanic (survive-titanic): a few planks, a wooden crate, a carved oak panel (the ship's fine
# joinery that floated off), a cork lifebuoy ring. Composed as a loose cluster seen from above at an angle. Metres.
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib
out, size = lib.args(1800)
lib.reset()
oak = lib.toon("oak", "#b07a44", 0.7, 1.15); oakd = lib.toon("oakd", "#7a4e2c", 0.7, 1.1); pine = lib.toon("pine", "#cfa66c", 0.72, 1.12)
white = lib.toon("white", "#efeadc", 0.75, 1.05); red = lib.toon("red", "#c8323a", 0.72, 1.12); rope = lib.toon("rope", "#d8c49a", 0.8, 1.05)
def box(c, s, mat, rz=0, rx=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c, rotation=(rx, 0, rz)); o = bpy.context.object
    o.scale = s; bpy.ops.object.transform_apply(scale=True, rotation=True); lib.give(o, mat, False)
    b = o.modifiers.new("b", "BEVEL"); b.width = 0.008; b.segments = 2; return o
# planks
for i, (x, y, rz, L) in enumerate(((-0.9, -0.2, 0.3, 1.6), (-0.4, 0.5, -0.5, 1.2), (0.9, -0.5, 1.2, 1.0), (1.4, 0.4, 0.15, 1.4))):
    box((x, y, 0.0), (L, 0.16, 0.04), pine if i % 2 else oak, rz)
    for k in range(3): box((x + math.cos(rz) * (k - 1) * L * 0.3, y + math.sin(rz) * (k - 1) * L * 0.3, 0.022), (0.02, 0.02, 0.01), oakd, rz)  # nail heads
# crate
box((0.2, -0.1, 0.12), (0.5, 0.42, 0.34), pine, 0.4, math.radians(8))
for dz in (-0.1, 0.1): box((0.2, -0.1, 0.12 + dz), (0.52, 0.44, 0.05), oakd, 0.4, math.radians(8))
# carved panel with a raised moulding
box((-1.1, -0.9, 0.0), (0.7, 0.5, 0.05), oak, -0.2)
box((-1.1, -0.9, 0.03), (0.5, 0.32, 0.02), oakd, -0.2)
# a lifebuoy ring
bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.09, location=(1.25, -1.0, 0.03)); o = bpy.context.object; lib.give(o, white)
for k in range(4):
    a = k * math.pi / 2 + 0.3
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.12, location=(1.25 + 0.32 * math.cos(a), -1.0 + 0.32 * math.sin(a), 0.03), rotation=(math.radians(90), 0, a)); lib.give(bpy.context.object, red)
lib.setup_render(out, size, cam_loc=(2.5, -5.0, 4.2), target=(0.1, -0.3, 0.0), ortho=4.4, line=2.4)
lib.render()
