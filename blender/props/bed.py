# Same iron bed as bed_net.py, no net, a sunflower-ochre blanket.
import os
NET = False; BLANKET = "#d9a441"
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bed_net.py")).read())
