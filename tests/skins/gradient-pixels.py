"""Measure foreground contrast over rendered backgrounds beneath solid glyph pixels."""
import json
import math
import sys
from PIL import Image

normal = Image.open(sys.argv[1]).convert("RGB")
background = Image.open(sys.argv[2]).convert("RGB")
metadata = json.load(open(sys.argv[3], encoding="utf-8"))
foreground = metadata["foreground"][:3]

def luminance(rgb):
    values = [v / 255 for v in rgb]
    values = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in values]
    return sum(v * w for v, w in zip(values, [0.2126, 0.7152, 0.0722]))

ink = set()
for rect in metadata["textRects"]:
    for y in range(max(0, math.floor(rect["top"])), min(normal.height, math.ceil(rect["bottom"]))):
        for x in range(max(0, math.floor(rect["left"])), min(normal.width, math.ceil(rect["right"]))):
            painted, base = normal.getpixel((x, y)), background.getpixel((x, y))
            # Antialiased edge pixels are not full foreground samples.
            if max(abs(painted[i] - foreground[i]) for i in range(3)) <= 12 and max(abs(painted[i] - base[i]) for i in range(3)) >= 24:
                ink.add((x, y))
samples = []
fg = luminance(foreground)
for x, y in ink:
    pixel = background.getpixel((x, y))
    bg = luminance(pixel)
    samples.append(((max(fg, bg) + 0.05) / (min(fg, bg) + 0.05), x, y, pixel))
minimum = min(samples, default=(0, None, None, None))
print(json.dumps({"solidGlyphPixels": len(ink), "minimumContrast": minimum[0], "worstAt": minimum[1:], "foreground": foreground, "pass": bool(ink) and minimum[0] >= 4.5}))
