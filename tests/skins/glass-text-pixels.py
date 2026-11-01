"""Measure actual text and its halo using an opaque glyph-mask capture."""
import json
import math
import sys
from PIL import Image

normal, backing, mask = [Image.open(p).convert("RGB") for p in sys.argv[1:4]]
metadata = json.load(open(sys.argv[4], encoding="utf-8"))

def luminance(rgb):
    values = [v / 255 for v in rgb]
    values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
    return sum(v * w for v, w in zip(values, [.2126, .7152, .0722]))

def contrast(a, b):
    a, b = luminance(a), luminance(b)
    return (max(a, b) + .05) / (min(a, b) + .05)

cores = set()
for r in metadata["textRects"]:
    for y in range(max(0, math.floor(r["top"])), min(mask.height, math.ceil(r["bottom"]))):
        for x in range(max(0, math.floor(r["left"])), min(mask.width, math.ceil(r["right"]))):
            if max(mask.getpixel((x, y))) <= 12:
                cores.add((x, y))
under = [(contrast(normal.getpixel(p), backing.getpixel(p)), p) for p in cores]
edges = []
for x, y in cores:
    # Match each edge core to the nearest clear mask pixel within two pixels.
    neighbors = []
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            q = x + dx, y + dy
            if not (0 <= q[0] < mask.width and 0 <= q[1] < mask.height):
                continue
            if min(mask.getpixel(q)) >= 243:
                neighbors.append((dx * dx + dy * dy, q))
    if neighbors:
        distance = min(n[0] for n in neighbors)
        for d, q in neighbors:
            if d == distance:
                edges.append((contrast(normal.getpixel((x, y)), backing.getpixel(q)), (x, y), q))
minimum = min(under, default=(0, None))
edge = min(edges, default=(0, None, None))
print(json.dumps({"solidGlyphPixels": len(cores), "edgeSamples": len(edges), "minimumContrast": minimum[0], "minimumEdgeContrast": edge[0], "worstCore": minimum[1], "worstEdge": edge[1:], "pass": bool(cores) and bool(edges) and minimum[0] >= 4.5 and edge[0] >= 4.5}))
