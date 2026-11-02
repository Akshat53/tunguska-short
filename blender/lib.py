# Shared helpers for Inkfall Blender props. Run a prop script headless:
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/props/<name>.py -- <out.png> [size]
# Output: a toon-shaded (flat cel colours) prop with ink outlines (Freestyle), transparent background,
# matching the kit's card style (INK #10222B). Same script -> same image (no randomness).
import bpy, sys, math
from mathutils import Vector

INK = (0x10 / 255, 0x22 / 255, 0x2B / 255)

def hex2rgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c)  # sRGB -> linear

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def toon(name, hexcol, shade=0.72, light=1.12):
    """Flat cel material: 3 bands (shadow / base / highlight) from Shader-to-RGB + constant ColorRamp."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    base = hex2rgb(hexcol)
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (*[c * shade for c in base], 1)
    els[1].position = 0.35; els[1].color = (*base, 1)
    hi = els.new(0.8); hi.color = (*[min(1, c * light) for c in base], 1)
    emi = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(dif.outputs[0], s2r.inputs[0]); nt.links.new(s2r.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], emi.inputs[0]); nt.links.new(emi.outputs[0], out.inputs[0])
    return m

def give(obj, mat, smooth=True):
    obj.data.materials.clear(); obj.data.materials.append(mat)
    if smooth and hasattr(obj.data, "polygons"):
        for p in obj.data.polygons: p.use_smooth = True
    return obj

def bevel(obj, w=0.02, seg=2):
    m = obj.modifiers.new("bev", "BEVEL"); m.width = w; m.segments = seg; m.limit_method = "ANGLE"
    return obj

def setup_render(out, size=1024, cam_loc=(4, -5, 2.4), target=(0, 0, 0.6), ortho=None, lens=50, line=2.6):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.render.filepath = out
    # light: one sun from the upper left-front (drives the cel bands)
    sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.0
    so = bpy.data.objects.new("sun", sd); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(-35))
    # camera looking at target
    cd = bpy.data.cameras.new("cam"); cd.lens = lens
    if ortho: cd.type = "ORTHO"; cd.ortho_scale = ortho
    co = bpy.data.objects.new("cam", cd); sc.collection.objects.link(co); sc.camera = co
    co.location = cam_loc
    d = Vector(target) - Vector(cam_loc); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    # world: neutral, contributes nothing (emission materials)
    w = bpy.data.worlds.new("w"); sc.world = w
    # ink outlines
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = "ABSOLUTE"; sc.render.line_thickness = line
    vl = sc.view_layers[0]; vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new("ink")
    ls.select_by_visibility = True; ls.select_by_edge_types = True
    ls.select_silhouette = ls.select_border = ls.select_crease = True
    vl.freestyle_settings.crease_angle = math.radians(140)
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("ink")
    lst = ls.linestyle; lst.color = hex2rgb("#10222B"); lst.thickness = line

def render():
    bpy.ops.render.render(write_still=True)

def args(default_size=1024):
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return (a[0] if a else "/tmp/prop.png"), (int(a[1]) if len(a) > 1 else default_size)
