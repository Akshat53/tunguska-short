# RMS Titanic (1912), stylised but faithful in silhouette, for "Could YOU Survive? Ep 1" (survive-titanic):
# black hull with a red bottom below the waterline, white superstructure, four buff funnels with black tops (the 4th, aft, was a
# dummy for ventilation), raked masts with rigging, lifeboats on the boat deck, rows of lit portholes and saloon windows.
# Scale 1:10 (1 unit = 10 m): length 26.9, beam 2.8. x = bow (+) / stern (-), y = port (+), z = up (waterline z = 0).
# build(mode, part): mode "art" = toon + ink; mode "lights" = the same silhouette in pure black with only the lights bright
# (drawn additively in the video, so the windows bloom while the outlines stay crisp). part "whole" or "stern" (the stern
# section after the break between funnels 3 and 4, with a jagged dark break face, propellers and rudder).
# Deterministic: any "randomness" (which windows are dark) comes from a fixed hash.
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

L2 = 13.45          # half length
XCUT = -1.25        # the break (stern part keeps x < XCUT)

def hh(i, s=0):
    v = math.sin(i * 127.1 + s * 311.7 + 0.5) * 43758.5453
    return v - math.floor(v)

class M:
    pass

def mats(mode):
    m = M()
    if mode == "art":
        m.hull = lib.toon("hull", "#1c242b", 0.7, 1.35); m.red = lib.toon("bottom", "#8f2b22", 0.72, 1.15)
        m.white = lib.toon("white", "#eef0ea", 0.78, 1.04); m.deck = lib.toon("deck", "#c9a77a", 0.8, 1.08)
        m.buff = lib.toon("buff", "#d0913a", 0.72, 1.12); m.black = lib.toon("ftop", "#161a1e", 0.8, 1.4)
        m.mast = lib.toon("mast", "#b8864e", 0.75, 1.1); m.lit = lib.toon("lit", "#ffd98a", 0.95, 1.05)
        m.gold = lib.toon("gold", "#e0b24a", 0.8, 1.1); m.boat = lib.toon("boat", "#f4f1e6", 0.8, 1.04)
        m.brk = lib.toon("break", "#0d1114", 0.9, 1.2); m.bronze = lib.toon("bronze", "#b0823e", 0.7, 1.15)
        m.steel = lib.toon("steel", "#5d6a70", 0.75, 1.15); m.plate = lib.toon("plate", "#11171c", 0.9, 1.1)
    else:
        blk = emis("blk", (0, 0, 0)); lit = emis("glow", (1.0, 0.8, 0.45), 1.0)
        for k in ("hull", "red", "white", "deck", "buff", "black", "mast", "gold", "boat", "brk", "bronze", "steel", "plate"):
            setattr(m, k, blk)
        m.lit = lit
    return m

def emis(name, col, strength=1.0):
    mt = bpy.data.materials.new(name); mt.use_nodes = True; nt = mt.node_tree; nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value = (*col, 1); e.inputs[1].default_value = strength
    o = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(e.outputs[0], o.inputs[0])
    return mt

op = None

def box(x0, x1, y0, y1, z0, z1, mat, bev=0.0, seg=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); o = bpy.context.object
    o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True)
    lib.give(o, mat, False)
    if bev: b = o.modifiers.new("b", "BEVEL"); b.width = bev; b.segments = seg; b.limit_method = "ANGLE"
    return o

def cyl(x, y, z, r, depth, mat, rot=(0, 0, 0), v=24, sx=1.0, sy=1.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=v, location=(x, y, z), rotation=rot); o = bpy.context.object
    o.scale = (sx, sy, 1); bpy.ops.object.transform_apply(scale=True)
    return lib.give(o, mat)

def rod(a, b, r, mat, v=8):
    import mathutils
    A = mathutils.Vector(a); B = mathutils.Vector(b); d = B - A
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, vertices=v, location=(A + B) / 2); o = bpy.context.object
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return lib.give(o, mat)

# ---------------- hull (lofted) ----------------
def sheer(x):            # deck height along the length (rises to the bow and a little to the stern)
    u = x / L2
    return 1.12 + 0.3 * max(0, u - 0.35) ** 2 / 0.42 + 0.12 * max(0, -u - 0.4) ** 2 / 0.36

KEEL = -1.05

def halfbeam(x, zn):
    """zn: 0 keel .. 1 deck. Fine bow entry, rounded counter stern, fuller at the top."""
    b = 1.4
    if x > 4.0:
        k = min(1.0, (x - 4.0) / (L2 - 4.0))
        b *= max(0.0, 1 - k ** 2.0) ** 0.6 * (1 + (0.55 + 0.45 * zn ** 0.6 - 1) * k ** 1.5)
    if x < -7.5:
        k = min(1.0, (-7.5 - x) / (L2 - 7.5))
        b *= max(0.0, 1 - k ** 2.4) ** 0.5 * (1 + (0.35 + 0.65 * zn ** 0.9 - 1) * k ** 1.5)
    # bilge: rounded bottom
    if zn < 0.22: b *= math.sqrt(max(0.0, 1 - ((0.22 - zn) / 0.235) ** 2)) * 0.9 + 0.1
    return max(0.0, b)

def stern_end(zn):       # the counter: the stern overhangs at the top, the run ends earlier near the keel
    return -L2 + 1.6 * (1 - zn) ** 1.6

def hull(m, xmax=L2):
    NX, NZ = 140, 20
    x0, x1 = -L2, min(L2, xmax)
    verts, faces, fm = [], [], []
    for i in range(NX + 1):
        x = x0 + (x1 - x0) * i / NX
        top = sheer(x)
        for j in range(NZ + 1):
            zn = j / NZ
            z = KEEL + (top - KEEL) * zn
            xe = max(x, stern_end(zn))
            b = halfbeam(xe, zn) if xe <= L2 else 0
            if x > L2 - 0.02: b = 0
            verts.append((xe, -b, z))
        for j in range(NZ + 1):
            zn = j / NZ; z = KEEL + (top - KEEL) * zn
            xe = max(x, stern_end(zn)); b = halfbeam(xe, zn)
            if x > L2 - 0.02: b = 0
            verts.append((xe, b, z))
    R = 2 * (NZ + 1)
    for i in range(NX):
        a, c = i * R, (i + 1) * R
        for j in range(NZ):
            zmid = (verts[a + j][2] + verts[a + j + 1][2]) / 2
            f1 = (a + j, c + j, c + j + 1, a + j + 1)
            f2 = (a + NZ + 1 + j, a + NZ + 1 + j + 1, c + NZ + 1 + j + 1, c + NZ + 1 + j)
            mi = 1 if zmid < 0 else 0
            faces += [f1, f2]; fm += [mi, mi]
        # deck
        faces.append((a + NZ, a + R - 1, c + R - 1, c + NZ)); fm.append(2)
        # keel strip
        faces.append((a, c, c + NZ + 1, a + NZ + 1)); fm.append(1)
    # end caps (break face / stern)
    end = NX * R
    if x1 < L2:
        cap = [end + j for j in range(NZ + 1)] + [end + NZ + 1 + j for j in reversed(range(NZ + 1))]
        faces.append(tuple(cap)); fm.append(3)
    me = bpy.data.meshes.new("hull"); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new("hull", me); bpy.context.scene.collection.objects.link(o)
    for mt in (m.hull, m.red, m.deck, m.brk): o.data.materials.append(mt)
    for p, mi in zip(o.data.polygons, fm): p.material_index = mi; p.use_smooth = True
    return o

def hull_y(x, z):
    """starboard hull surface y at (x, z) (negative)"""
    top = sheer(x); zn = (z - KEEL) / (top - KEEL)
    return -halfbeam(x, max(0, min(1, zn)))

# ---------------- details ----------------
def portholes(m, xmax):
    rows = [(0.42, 0.16, 0.05), (0.66, 0.15, 0.05), (0.9, 0.15, 0.052)]
    n = 0
    for ri, (z, step, r) in enumerate(rows):
        x = -11.2 + 0.07 * ri
        while x < min(11.0, xmax - 0.2):
            n += 1
            on = hh(n, ri + 3) < (0.82 if ri else 0.62)
            if abs(x - 1.6) > 0.12 or ri:
                y = hull_y(x, z) - 0.004
                cyl(x, y, z, r, 0.02, m.lit if on else m.plate, rot=(math.radians(90), 0, 0), v=12)
            x += step * (1.6 if (n % 9 == 0) else 1.0)
    # plating seams (thin dark strakes) and the gold sheer line
    for z in (0.18, 0.55, 0.78):
        xs = [x / 10 for x in range(-125, int(min(125, xmax * 10 - 2)), 3)]
        for x in xs[::1]:
            pass
    for k in range(-112, int(min(118, xmax * 10 - 3)), 2):
        x = k / 10
        z = sheer(x) - 0.06
        y = hull_y(x, z) - 0.006
        box(x - 0.05, x + 0.05, y - 0.004, y + 0.002, z - 0.012, z + 0.012, m.gold)

def superstructure(m, xmax, boats=True):
    out = []
    def cut(x0, x1):
        return x0, min(x1, xmax)
    # B / A decks: long white block over the hull, two rows of big windows
    x0, x1 = cut(-8.6, 7.2)
    if x1 > x0:
        box(x0, x1, -1.26, 1.26, 1.1, 1.42, m.white, 0.02)
        box(x0 + 0.3, x1 - 0.1 if x1 < 7.2 else x1, -1.2, 1.2, 1.42, 1.72, m.white, 0.02)
        for zr, n0 in ((1.28, 0), (1.58, 500)):
            x = x0 + 0.3; i = 0
            while x < x1 - 0.2:
                i += 1
                on = hh(i + n0, 7) < 0.78
                box(x, x + 0.09, -1.27 if zr < 1.4 else -1.21, -1.25 if zr < 1.4 else -1.19, zr - 0.05, zr + 0.05, m.lit if on else m.plate)
                x += 0.17
        box(x0, x1, -1.28, 1.28, 1.71, 1.75, m.deck)            # boat deck edge
    # deckhouses on the boat deck (gym, officers' quarters, entrances)
    for a, b in ((4.2, 6.9), (0.8, 3.6), (-2.2, 0.0), (-6.4, -3.4)):
        a, b = cut(a, b)
        if b <= a: continue
        box(a, b, -0.72, 0.72, 1.75, 2.0, m.white, 0.015)
        x = a + 0.12; i = 0
        while x < b - 0.15:
            i += 1; on = hh(i + int(a * 10), 11) < 0.7
            box(x, x + 0.08, -0.735, -0.72, 1.84, 1.92, m.lit if on else m.plate); x += 0.2
    # bridge + wheelhouse with wings
    if xmax > 7.6:
        box(6.9, 7.45, -0.85, 0.85, 1.75, 2.08, m.white, 0.015)
        box(7.2, 7.4, -1.38, 1.38, 1.95, 2.0, m.white)
        for k in range(6): box(6.95 + k * 0.08, 7.0 + k * 0.08, -0.865, -0.85, 1.92, 2.0, m.lit)
    # forecastle + poop deck structures
    if xmax > 12: box(9.4, 12.6, -0.9, 0.9, sheer(11) - 0.02, sheer(11) + 0.16, m.deck)
    box(-11.4, -9.2, -1.0, 1.0, sheer(-10) - 0.02, sheer(-10) + 0.2, m.white, 0.01)
    # funnels: oval, raked aft, buff with black tops, steam pipes; the 4th (aft) was a dummy
    for i, fx in enumerate((5.55, 2.85, 0.15, -2.55)):
        if fx > xmax - 0.3 or (xmax < L2 and fx > xmax - 1.6): continue   # the stern section lost funnel 4 in the break-up
        rake = math.radians(-6)
        h = 2.35
        cx, cz = fx, 2.0 + h / 2
        f = cyl(cx, 0, cz, 0.36, h, m.buff, rot=(0, rake, 0), v=40, sx=1.3, sy=1.0)
        t = cyl(cx + math.sin(rake) * (h / 2 - 0.2), 0, cz + math.cos(rake) * (h / 2 - 0.2), 0.367, 0.4, m.black, rot=(0, rake, 0), v=40, sx=1.3, sy=1.0)
        for s in (-1, 1):       # bands of the casing
            pass
        # steam pipes on the forward face
        for dy in (-0.12, 0.12):
            a = (cx + 0.48, dy, 2.0); b = (cx + 0.48 + math.sin(rake) * (h + 0.15), dy, 2.0 + math.cos(rake) * (h + 0.15))
            rod(a, b, 0.03, m.steel)
        # casing base
        box(cx - 0.55, cx + 0.55, -0.45, 0.45, 1.75, 2.02, m.white, 0.01)
        # cowl ventilators around the funnel
        for k, (vx, vy) in enumerate(((0.75, -0.6), (-0.7, -0.55), (0.7, 0.6))):
            vxx = cx + vx
            if vxx > xmax - 0.1: continue
            cyl(vxx, vy, 1.92, 0.05, 0.34, m.white, v=10)
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(vxx, vy - 0.02, 2.12)); o = bpy.context.object; lib.give(o, m.white)
    # lifeboats in davits along the boat deck edge (starboard side visible), clinker lines implied
    if boats:
        for bx in (6.4, 5.5, 4.6, 3.7, -3.5, -4.4, -5.3, -6.2):
            if bx > xmax - 0.4: continue
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(bx, -1.08, 1.9)); o = bpy.context.object
            o.scale = (0.75, 0.2, 0.13); bpy.ops.object.transform_apply(scale=True); lib.give(o, m.boat)
            box(bx - 0.36, bx + 0.36, -1.18, -0.98, 1.95, 1.97, m.deck)
            for dx in (-0.32, 0.32): rod((bx + dx, -1.0, 1.75), (bx + dx, -1.18, 2.18), 0.014, m.steel)
    # deck lamps along the promenade (lights)
    x = -8.2
    while x < min(7.0, xmax - 0.2):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.025, location=(x, -1.29, 1.65)); lib.give(bpy.context.object, m.lit); x += 0.55

def masts(m, xmax):
    fore = ((10.1, 0, sheer(10.1)), (9.8, 0, 6.1))
    aft = ((-10.6, 0, sheer(-10.6) + 0.2), (-10.85, 0, 5.6))
    if xmax > 10.2:
        rod(*fore, 0.05, m.mast)
        cyl(9.88, 0, 4.4, 0.09, 0.14, m.mast, v=16)                                 # crow's nest
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, location=(9.85, 0, 5.2)); lib.give(bpy.context.object, m.lit)   # masthead light
        rod((9.8, 0, 6.0), (L2 - 0.1, 0, sheer(L2) + 0.05), 0.008, m.steel)           # forestay
        rod((9.8, 0, 6.0), (-10.85, 0, 5.5), 0.008, m.steel)                           # aerial between the masts
        for s in (-1, 1): rod((9.8, 0, 5.7), (9.9, s * 1.2, sheer(9.9)), 0.006, m.steel)
        # cargo cranes on the well deck
        for cxp in (8.7, 11.6): cyl(cxp, 0.5, sheer(cxp) + 0.15, 0.04, 0.3, m.steel, v=8)
    rod(*aft, 0.05, m.mast)
    for s in (-1, 1): rod((-10.85, 0, 5.2), (-10.7, s * 1.1, sheer(-10.7)), 0.006, m.steel)
    if xmax <= 10.2: rod((-10.85, 0, 5.5), (-10.85 + 1.6, 0, 6.0 - 0.1), 0.008, m.steel)      # torn aerial stub
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(-13.0, 0, sheer(-13) + 0.15)); lib.give(bpy.context.object, m.lit)   # stern light
    rod((-12.6, 0, sheer(-12.6)), (-12.9, 0, sheer(-12.6) + 0.9), 0.012, m.mast)   # ensign staff

def stern_gear(m):
    # rudder + three propellers (two 3-blade wing, one 4-blade centre)
    box(-12.2, -11.86, -0.035, 0.035, -1.02, -0.3, m.red, 0.01)
    for py, pz, nb, r in ((-0.62, -0.78, 3, 0.36), (0.62, -0.78, 3, 0.36), (0.0, -0.72, 4, 0.3)):
        px = -11.2 if py else -11.6
        rod((px + 1.2, py * 0.6, pz + 0.1), (px, py, pz), 0.05, m.steel)          # shaft
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(px, py, pz)); lib.give(bpy.context.object, m.bronze)
        for k in range(nb):
            a = 2 * math.pi * k / nb
            bpy.ops.mesh.primitive_uv_sphere_add(radius=r / 2, location=(px - 0.02, py + math.cos(a) * r * 0.55, pz + math.sin(a) * r * 0.55)); o = bpy.context.object
            o.scale = (0.12, 1.0, 0.45); o.rotation_euler = (a + 0.4, 0, 0); bpy.ops.object.transform_apply(scale=True, rotation=True); lib.give(o, m.bronze)

def jagged_break(m):
    # torn plates and beams sticking out of the break face (dark interior), deterministic
    for k in range(26):
        z = KEEL + 0.1 + (sheer(XCUT) - KEEL) * hh(k, 41)
        y = (hh(k, 42) - 0.5) * 2.4
        L = 0.15 + 0.45 * hh(k, 43)
        box(XCUT - 0.05, XCUT + L, y - 0.05, y + 0.05, z - 0.02, z + 0.02, m.brk if k % 3 else m.hull)
    for k in range(9):
        z = 1.2 + 0.7 * hh(k, 51); y = (hh(k, 52) - 0.5) * 2.2
        box(XCUT - 0.1, XCUT + 0.2 + 0.3 * hh(k, 53), y - 0.08, y + 0.08, z - 0.03, z + 0.03, m.white)

def build(mode="art", part="whole"):
    lib.reset()
    m = mats(mode)
    xmax = XCUT if part == "stern" else L2
    objs_before = set(bpy.data.objects)
    hull(m, xmax)
    portholes(m, xmax)
    superstructure(m, xmax, boats=(part == "whole"))
    masts(m, xmax)
    if part == "stern":
        stern_gear(m); jagged_break(m)
    return [o for o in bpy.data.objects if o not in objs_before]

def pitch_all(objs, deg, pivot):
    """rotate every object about the y axis through pivot (stern-up: positive deg lifts -x)"""
    import mathutils
    R = mathutils.Matrix.Rotation(math.radians(deg), 4, "Y")
    T = mathutils.Matrix.Translation(mathutils.Vector(pivot))
    for o in objs:
        o.matrix_world = T @ R @ T.inverted() @ o.matrix_world

def write_meta(out, part, deg=0.0):
    """waterline + key points in cropped-image pixels (lib.meta), for placing the card on the water in the video"""
    import mathutils
    pts = {"bow_wl": (L2, 0, 0), "stern_wl": (-L2 + 1.0, 0, 0), "mid_wl": (0, 0, 0), "f4_top": (-2.55, 0, 4.35)}
    if part == "stern": pts = {"brk_low": (XCUT, 0, KEEL), "brk_top": (XCUT, 0, sheer(XCUT)), "stern_top": (-L2, 0, sheer(-L2)), "prop": (-11.6, 0, -0.72)}
    R = mathutils.Matrix.Rotation(math.radians(deg), 4, "Y"); T0 = mathutils.Matrix.Translation(mathutils.Vector((XCUT, 0, -0.2)))
    if deg: pts = {k: tuple((T0 @ R @ T0.inverted()) @ mathutils.Vector(v)) for k, v in pts.items()}
    lib.meta(out, pts)

def lights_render_settings():
    """keep Freestyle (same silhouette -> identical crop as the art pass) but draw the lines in pure black (adds nothing)"""
    vl = bpy.context.scene.view_layers[0]
    for ls in vl.freestyle_settings.linesets: ls.linestyle.color = (0, 0, 0)
