# A test tube for the doctor's raised hand (Laughter Epidemic 1962, "Poison?"): a thick, clearly readable tube with a
# rolled lip, bright sample liquid with a meniscus and a white glass highlight. Front view, slightly from below (held up).
# tube_mint.py renders the same tube with the second sample colour.
import bpy, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib

out, size = lib.args()
LIQ = globals().get("LIQ", "#ff7a45")
lib.reset()
op = bpy.ops.mesh
glass = lib.sheer("glass", "#e4f6f8", 0.55); liq = lib.toon("liq", LIQ, 0.78, 1.15); hi = lib.toon("hi", "#ffffff", 1, 1)
R, H, F = 0.1, 1.0, 0.5   # radius, length, fill
# liquid: hemisphere bottom + column + a slightly concave meniscus cap
bot = [(R * math.sin(math.radians(a)), R - R * math.cos(math.radians(a))) for a in range(0, 91, 10)]
lib.give(lib.lathe("liq", bot + [(R, H * F - 0.002), (0.0, H * F - 0.002)], 48), liq)   # one mesh: no seam line
lib.give(lib.lathe("men", [(0.0, H * F - 0.012), (R * 0.7, H * F - 0.004), (R, H * F + 0.012), (R, H * F - 0.002), (0.0, H * F - 0.02)], 48), lib.toon("men", LIQ, 0.9, 1.3))
# glass above the liquid + rolled lip
op.primitive_cylinder_add(radius=R, depth=H - H * F, vertices=48, location=(0, 0, H * F + (H - H * F) / 2)); lib.give(bpy.context.object, glass)
op.primitive_torus_add(major_radius=R, minor_radius=0.018, location=(0, 0, H)); lib.give(bpy.context.object, glass)
# highlight streak down the glass (and over the liquid)
op.primitive_cube_add(size=1, location=(-R * 0.55, -R * 0.86, H * 0.55)); s = bpy.context.object; s.scale = (0.026, 0.01, H * 0.62); lib.give(s, hi, False)
noink = bpy.data.collections.new("noink"); bpy.context.scene.collection.children.link(noink)
bpy.context.scene.collection.objects.unlink(s); noink.objects.link(s)
el = math.radians(-6)
lib.setup_render(out, size, cam_loc=(0.0, -10 * math.cos(el), 0.5 + 10 * math.sin(el)), target=(0.0, 0, 0.5), ortho=1.15, line=3.0)
ls = bpy.context.scene.view_layers[0].freestyle_settings.linesets[0]   # the highlight gets no ink line
ls.select_by_collection = True; ls.collection = noink; ls.collection_negation = "EXCLUSIVE"
lib.render()
lib.meta(out, {"top": (0, 0, H), "bottom": (0, 0, 0)})
