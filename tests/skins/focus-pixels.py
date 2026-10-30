"""Measure rendered focus changes outside a button's border rectangle."""
import json
import sys
import math
from PIL import Image

before = Image.open(sys.argv[1]).convert("RGB")
after = Image.open(sys.argv[2]).convert("RGB")
raw_left, raw_top, raw_right, raw_bottom = map(float, sys.argv[3:7])
left, top, right, bottom = math.floor(raw_left), math.floor(raw_top), math.ceil(raw_right), math.ceil(raw_bottom)

def luminance(rgb):
    values = [v / 255 for v in rgb]
    values = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in values]
    return sum(v * w for v, w in zip(values, [0.2126, 0.7152, 0.0722]))

changed = []
for y in range(max(0, top - 5), min(before.height, bottom + 5)):
    for x in range(max(0, left - 5), min(before.width, right + 5)):
        if left <= x < right and top <= y < bottom:
            continue
        a, b = before.getpixel((x, y)), after.getpixel((x, y))
        if a != b:
            aa, bb = luminance(a), luminance(b)
            changed.append(((max(aa, bb) + 0.05) / (min(aa, bb) + 0.05), x, y, a, b))
maximum = max(changed, default=(1, None, None, None, None))
samples = []
for side, x, y, outer_x, outer_y in [("top", (left + right) // 2, top - 1, (left + right) // 2, top - 4), ("bottom", (left + right) // 2, bottom, (left + right) // 2, bottom + 3), ("left", left - 1, (top + bottom) // 2, left - 4, (top + bottom) // 2), ("right", right, (top + bottom) // 2, right + 3, (top + bottom) // 2)]:
    a, b = before.getpixel((x, y)), after.getpixel((x, y))
    adjacent = after.getpixel((outer_x, outer_y))
    aa, bb, cc = luminance(a), luminance(b), luminance(adjacent)
    samples.append({"side": side, "contrast": (max(bb, cc) + 0.05) / (min(bb, cc) + 0.05), "changeContrast": (max(aa, bb) + 0.05) / (min(aa, bb) + 0.05), "before": a, "after": b, "adjacent": adjacent})
report = {"changedPixels": len(changed), "maximumContrast": maximum[0], "maximumAt": maximum[1:], "sideSamples": samples, "minimumSideContrast": min(s["contrast"] for s in samples)}
if "--two-color" in sys.argv:
    white_expected = white_painted = black_expected = black_painted = 0
    for y in range(top - 3, bottom + 3):
        for x in range(left - 3, right + 3):
            dx = left - x if x < left else x - right + 1 if x >= right else 0
            dy = top - y if y < top else y - bottom + 1 if y >= bottom else 0
            distance = max(dx, dy)
            if not distance:
                continue
            pixel = after.getpixel((x, y))
            if distance <= 2:
                white_expected += 1
                white_painted += pixel == (255, 255, 255)
            else:
                black_expected += 1
                black_painted += pixel == (0, 0, 0)
    edges = []
    for sample, (x, y) in zip(samples, [((left + right) // 2, math.floor(raw_top - 2.5)), ((left + right) // 2, math.floor(raw_bottom + 2.5)), (math.floor(raw_left - 2.5), (top + bottom) // 2), (math.floor(raw_right + 2.5), (top + bottom) // 2)]):
        inner, outer, adjacent = sample["after"], after.getpixel((x, y)), sample["adjacent"]
        a, b, c = luminance(inner), luminance(outer), luminance(adjacent)
        edges.append({"side": sample["side"], "inner": inner, "outer": outer,
                      "betweenEdges": (max(a, b) + 0.05) / (min(a, b) + 0.05),
                      "strongerEdgeAgainstAdjacent": max((max(a, c) + 0.05) / (min(a, c) + 0.05), (max(b, c) + 0.05) / (min(b, c) + 0.05))})
    profiles = []
    def profile(side, inner_x, inner_y, outer_x, outer_y, adjacent_x, adjacent_y):
        inner, outer, adjacent = after.getpixel((inner_x, inner_y)), after.getpixel((outer_x, outer_y)), after.getpixel((adjacent_x, adjacent_y))
        a, b, c = luminance(inner), luminance(outer), luminance(adjacent)
        edge = (max(a, b) + 0.05) / (min(a, b) + 0.05)
        surface = max((max(a, c) + 0.05) / (min(a, c) + 0.05), (max(b, c) + 0.05) / (min(b, c) + 0.05))
        profiles.append({"side": side, "edgeContrast": edge, "surfaceContrast": surface, "pass": edge >= 3 and surface >= 3})
    for x in range(math.ceil(raw_left + 2), math.floor(raw_right - 2)):
        profile("top", x, top - 1, x, math.floor(raw_top - 2.5), x, top - 4)
        profile("bottom", x, bottom, x, math.floor(raw_bottom + 2.5), x, bottom + 3)
    for y in range(math.ceil(raw_top + 2), math.floor(raw_bottom - 2)):
        profile("left", left - 1, y, math.floor(raw_left - 2.5), y, left - 4, y)
        profile("right", right, y, math.floor(raw_right + 2.5), y, right + 3, y)
    integer_aligned = all(value == int(value) for value in [raw_left, raw_top, raw_right, raw_bottom])
    area_pass = white_painted == white_expected and black_painted == black_expected if integer_aligned else all(p["pass"] for p in profiles)
    report["twoColor"] = {"whiteExpected": white_expected, "whitePainted": white_painted, "blackExpected": black_expected, "blackPainted": black_painted,
                          "integerAligned": integer_aligned, "profiles": profiles, "passingProfiles": sum(p["pass"] for p in profiles),
                          "edges": edges, "pass": area_pass and bool(profiles) and all(p["pass"] for p in profiles) and all(e["betweenEdges"] >= 3 and e["strongerEdgeAgainstAdjacent"] >= 3 for e in edges)}
print(json.dumps(report))
