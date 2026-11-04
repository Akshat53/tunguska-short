# A White Star Line wooden steamer (deck) chair, floating on its back at a tilt (survive-titanic debris).
# Teak frame, slatted seat and back, armrests, footrest folded. 3/4 view from above. Units: metres.
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib
from mathutils import Vector, Matrix
out, size = lib.args(1800)
lib.reset()
teak = lib.toon("teak", "#a8703e", 0.7, 1.15); dark = lib.toon("teakd", "#7a4e2c", 0.7, 1.1); brass = lib.toon("brass", "#d6a542", 0.75, 1.15)
objs = []
def box(c, s, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c, rotation=rot); o = bpy.context.object
    o.scale = s; bpy.ops.object.transform_apply(scale=True, rotation=True); lib.give(o, mat, False)
    b = o.modifiers.new("b", "BEVEL"); b.width = 0.006; b.segments = 2; objs.append(o); return o
# seat frame (x along the chair), side rails
for y in (-0.3, 0.3): box((0, y, 0.0), (1.0, 0.05, 0.07), dark)
for i in range(8): box((-0.42 + i * 0.12, 0, 0.04), (0.08, 0.58, 0.02), teak)            # seat slats
# back rest raised at the head end, slats along it
ang = math.radians(48)
for y in (-0.3, 0.3): box((-0.5 - 0.32 * math.cos(ang), y, 0.32 * math.sin(ang)), (0.7, 0.05, 0.06), dark, (0, ang, 0))
for i in range(6):
    t = 0.1 + i * 0.1
    box((-0.5 - t * math.cos(ang) * 1.0, 0, t * math.sin(ang) + 0.03), (0.07, 0.56, 0.02), teak, (0, ang, 0))
# armrests + legs
for y in (-0.34, 0.34):
    box((-0.15, y, 0.24), (0.6, 0.07, 0.04), teak)
    for x in (-0.38, 0.1): box((x, y, 0.12), (0.04, 0.04, 0.24), dark)
    box((0.45, y, -0.12), (0.04, 0.04, 0.26), dark)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.02, location=(-0.15, y - 0.04 * (1 if y < 0 else -1), 0.12), rotation=(math.radians(90), 0, 0)); objs.append(lib.give(bpy.context.object, brass))
# footrest folded under
box((0.62, 0, -0.03), (0.3, 0.56, 0.03), teak)
# floating tilt: rotate the whole chair
R = Matrix.Rotation(math.radians(-20), 4, "X") @ Matrix.Rotation(math.radians(12), 4, "Y")
for o in objs: o.matrix_world = R @ o.matrix_world
lib.setup_render(out, size, cam_loc=(2.2, -3.2, 2.6), target=(-0.05, 0, 0.05), ortho=2.2, line=2.4)
lib.render()
