# RMS Titanic for survive-titanic (art pass, stern): see blender/titanic_model.py. The *_lights pass is the same
# silhouette in black with only the lit windows bright (drawn additively in the video, same crop as the art pass).
import bpy, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib, titanic_model as T

out, size = lib.args(2400)
objs = T.build("art", "stern")
T.pitch_all(objs, 58, (T.XCUT, 0, -0.2))
lib.setup_render(out, size, cam_loc=(-9, -40, 2.0), target=(-5.2, 0, 4.4), ortho=15, line=2.4)

lib.render()
T.write_meta(out, "stern", 58)
