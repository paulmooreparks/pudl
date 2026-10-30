"""Compare field pixels while reporting native-widget pixels separately."""
import json
import math
import pathlib
import sys
from PIL import Image

directory = pathlib.Path(sys.argv[1])
destination = pathlib.Path(sys.argv[2])
if destination.exists():
    raise RuntimeError("output must be new")
record = json.loads((directory / "results.json").read_text(encoding="utf-8"))
results = []
for profile in record["results"]:
    if not profile["name"].endswith("-default-preservation"):
        continue
    name = profile["name"].removesuffix("-default-preservation")
    original = Image.open(directory / (name + "-original.png")).convert("RGB")
    candidate = Image.open(directory / (name + "-candidate.png")).convert("RGB")
    native = next(o for o in profile["observations"][0] if o["label"] == "native")
    x, y, width, height = native["bounds"]
    rectangle = [math.floor(x), math.floor(y), math.ceil(x + width), math.ceil(y + height)]
    outside, inside, maximum = 0, 0, 0
    if original.size != candidate.size:
        raise RuntimeError("image dimensions differ")
    for py in range(original.height):
        for px in range(original.width):
            a, b = original.getpixel((px, py)), candidate.getpixel((px, py))
            if a == b:
                continue
            delta = max(abs(v - w) for v, w in zip(a, b))
            if rectangle[0] <= px < rectangle[2] and rectangle[1] <= py < rectangle[3]:
                inside += 1
                maximum = max(maximum, delta)
            else:
                outside += 1
    computed_equal = profile["observations"][0] == profile["observations"][1]
    results.append({"name": name, "pass": outside == 0 and computed_equal, "pudlPixelDifferences": outside, "nativePixelDifferences": inside, "nativeMaximumChannelDelta": maximum, "nativeDiagnosticRectangle": rectangle, "computedEqual": computed_equal})
destination.write_text(json.dumps({"input": str(directory), "nativeScope": "Unwrapped browser-drawn select is diagnostic; its complete rectangle is excluded only from this PUDL-paint comparison. Original full-raster failures are retained.", "results": results}, indent=2), encoding="utf-8")
print(str(sum(r["pass"] for r in results)) + "/" + str(len(results)) + " PUDL field raster profiles pass")
sys.exit(1 if any(not r["pass"] for r in results) else 0)
