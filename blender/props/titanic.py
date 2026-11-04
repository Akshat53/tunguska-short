# RMS Titanic for survive-titanic (art pass, whole): see blender/titanic_model.py. The *_lights pass is the same
# silhouette in black with only the lit windows bright (drawn additively in the video, same crop as the art pass).
import bpy, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import lib, titanic_model as T

out, size = lib.args(2400)
objs = T.build("art", "whole")

lib.setup_render(out, size, cam_loc=(14, -40, 7), target=(0, 0, 1.6), ortho=29.5, line=2.4)

lib.render()
T.write_meta(out, "whole", 0)
