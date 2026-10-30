"""Compare captures using an explicit, bounded live-page raster noise rule."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops

parser = argparse.ArgumentParser()
parser.add_argument("expected", type=Path)
parser.add_argument("actual", type=Path)
parser.add_argument("--live-noise", action="store_true")
args = parser.parse_args()
failures = []
noise = []
count = 0
for expected in args.expected.rglob("*.png"):
    relative = expected.relative_to(args.expected)
    actual = args.actual / relative
    count += 1
    if not actual.exists():
        failures.append({"file": str(relative), "reason": "missing image"})
        continue
    if expected.read_bytes() == actual.read_bytes():
        continue
    left = Image.open(expected).convert("RGB")
    right = Image.open(actual).convert("RGB")
    if left.size != right.size:
        failures.append({"file": str(relative), "reason": "image dimensions changed"})
        continue
    difference = ImageChops.difference(left, right)
    bounds = difference.getbbox()
    if bounds is None:
        continue
    raw = difference.crop(bounds).tobytes()
    pixels = list(zip(raw[0::3], raw[1::3], raw[2::3]))
    changed = sum(any(pixel) for pixel in pixels)
    maximum = max(raw)
    # Live fixtures showed 3 to 15 differing antialias pixels, with maximum
    # channel differences of 5 to 10, despite identical computed geometry.
    # The allowance cannot hide a moved edge or a changed area of paint.
    allowed = args.live_noise and "-live" in str(expected.parent) and changed <= 100 and maximum <= 12
    record = {"file": str(relative), "pixels": changed, "maxChannelDifference": maximum, "bounds": bounds}
    (noise if allowed else failures).append(record)
print(json.dumps({"images": count, "boundedLiveNoise": noise, "failures": failures}, indent=2))
raise SystemExit(1 if failures else 0)
