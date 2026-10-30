"""Sample rendered ring edges around rounded rectangles, capsules and circles."""
import json
import math
import sys
from PIL import Image

image = Image.open(sys.argv[1]).convert("RGB")
data = json.load(open(sys.argv[2], encoding="utf-8"))
left, top, width, height = [data["bounds"][k] for k in ["x", "y", "width", "height"]]
right, bottom = left + width, top + height
radius = min(data["radius"], width / 2, height / 2)
two_color = data["twoColor"]

def lum(rgb):
    values = [v / 255 for v in rgb[:3]]
    values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
    return sum(v * w for v, w in zip(values, [.2126, .7152, .0722]))

def ratio(a, b):
    x, y = lum(a), lum(b)
    return (max(x, y) + .05) / (min(x, y) + .05)

def distance(x, y):
    qx = abs(x - (left + right) / 2) - (width / 2 - radius)
    qy = abs(y - (top + bottom) / 2) - (height / 2 - radius)
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - radius

def samples(x, y, low, high):
    result = []
    for py in range(max(0, math.floor(y) - 2), min(image.height, math.floor(y) + 3)):
        for px in range(max(0, math.floor(x) - 2), min(image.width, math.floor(x) + 3)):
            if low <= distance(px + .5, py + .5) <= high:
                result.append(image.getpixel((px, py)))
    return result

perimeter = []
def straight(x1, y1, x2, y2, nx, ny):
    steps = max(1, math.ceil(math.hypot(x2 - x1, y2 - y1)))
    perimeter.extend((x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, nx, ny) for i in range(steps + 1))

straight(left + radius, top, right - radius, top, 0, -1)
straight(left + radius, bottom, right - radius, bottom, 0, 1)
straight(left, top + radius, left, bottom - radius, -1, 0)
straight(right, top + radius, right, bottom - radius, 1, 0)
for cx, cy, start in [(right - radius, top + radius, -90), (right - radius, bottom - radius, 0), (left + radius, bottom - radius, 90), (left + radius, top + radius, 180)]:
    if not radius:
        continue
    steps = max(1, math.ceil(math.pi * radius / 2))
    for i in range(steps + 1):
        angle = math.radians(start + 90 * i / steps)
        nx, ny = math.cos(angle), math.sin(angle)
        perimeter.append((cx + radius * nx, cy + radius * ny, nx, ny))

profiles = []
for x, y, nx, ny in perimeter:
    adjacent = image.getpixel((math.floor(x + 4 * nx), math.floor(y + 4 * ny)))
    if two_color:
        whites = samples(x + nx, y + ny, .25, 1.75)
        blacks = samples(x + 2.5 * nx, y + 2.5 * ny, 2, 3)
        if not whites or not blacks:
            profiles.append({"pass": False, "reason": "missing ring samples"})
            continue
        white, black = max(whites, key=lum), min(blacks, key=lum)
        edge, surface = ratio(white, black), max(ratio(white, adjacent), ratio(black, adjacent))
        profiles.append({"pass": edge >= 3 and surface >= 3, "edgeContrast": edge, "surfaceContrast": surface})
    else:
        colors = samples(x + 1.5 * nx, y + 1.5 * ny, .5, 2.5)
        if not colors:
            profiles.append({"pass": False, "reason": "missing ring samples"})
            continue
        expected = data["ringColor"][:3]
        color = min(colors, key=lambda c: sum((c[i] - expected[i]) ** 2 for i in range(3)))
        surface = ratio(color, adjacent)
        profiles.append({"pass": surface >= 3, "surfaceContrast": surface})

def area(w, h, r):
    return w * h - (4 - math.pi) * r * r

print(json.dumps({"radius": radius, "perimeterProfiles": len(profiles), "passingProfiles": sum(p["pass"] for p in profiles),
                  "minimumSurfaceContrast": min((p["surfaceContrast"] for p in profiles if "surfaceContrast" in p), default=0),
                  "minimumEdgeContrast": min((p["edgeContrast"] for p in profiles if "edgeContrast" in p), default=None),
                  "geometricIndicatorArea": area(width + 6, height + 6, radius + 3) - area(width, height, radius),
                  "failures": [p for p in profiles if not p["pass"]], "pass": bool(profiles) and all(p["pass"] for p in profiles)}))
