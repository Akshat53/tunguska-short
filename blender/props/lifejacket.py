# The 1912 White Star cork life jacket (survive-titanic): off-white canvas over cork blocks, front panels with stitched
# block seams, shoulder straps and white tapes, floating flat and a little crumpled. 3/4 view from above. Metres.
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib
out, size = lib.args(1600)
lib.reset()
cv = lib.toon("canvas", "#efe6cf", 0.76, 1.05); seam = lib.toon("seam", "#b9ab8c", 0.8, 1.05); tape = lib.toon("tape", "#f8f3e6", 0.8, 1.04)
def box(c, s, mat, rz=0, ry=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c, rotation=(0, ry, rz)); o = bpy.context.object
    o.scale = s; bpy.ops.object.transform_apply(scale=True, rotation=True); lib.give(o, mat, False)
    b = o.modifiers.new("b", "BEVEL"); b.width = 0.02; b.segments = 3; return o
for side in (-1, 1):
    for r in range(4):
        for c in range(2):
            box((side * (0.12 + 0.13 * c), -0.3 + r * 0.17, 0.04 + 0.01 * ((r + c) % 2)), (0.12, 0.155, 0.07), cv, 0.03 * side, 0.04 * (r - 1.5))
for side in (-1, 1): box((side * 0.2, 0.42, 0.02), (0.1, 0.22, 0.03), cv)          # shoulder pieces
box((0, 0.55, 0.015), (0.52, 0.08, 0.025), cv)                                       # back collar strip
for y in (-0.05, 0.2): box((0, y, 0.085), (0.62, 0.025, 0.008), tape, 0.05)          # tapes
box((0.34, -0.16, 0.02), (0.22, 0.025, 0.008), tape, -0.7); box((-0.32, -0.2, 0.02), (0.2, 0.025, 0.008), tape, 0.8)
lib.setup_render(out, size, cam_loc=(0.9, -1.6, 1.9), target=(0, 0.08, 0.0), ortho=1.45, line=2.4)
lib.render()
