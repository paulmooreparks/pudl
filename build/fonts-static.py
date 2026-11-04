"""Build full-coverage static TrueType faces from the committed Inter fonts.

Install build/fonts-requirements.txt first. Use --check to verify committed bytes.
All variation axes are pinned using the documented fontTools instancer API:
https://fonttools.readthedocs.io/en/latest/varLib/instancer.html
"""
import argparse
import io
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FONTS = Path(__file__).resolve().parent.parent / "dist/fonts"
FACES = [("Regular", 400, False), ("Italic", 400, True),
         ("SemiBold", 600, False), ("Bold", 700, False)]


def generate():
    for name, weight, italic in FACES:
        source = FONTS / ("InterVariable-Italic.woff2" if italic else "InterVariable.woff2")
        font = TTFont(source, recalcTimestamp=False)
        coverage = font.getBestCmap()
        limits = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
        limits["wght"] = weight
        font = instantiateVariableFont(font, limits, updateFontNames=True)
        font.flavor = None
        data = io.BytesIO()
        font.save(data)
        result = TTFont(io.BytesIO(data.getvalue()))
        assert "fvar" not in result and "gvar" not in result
        assert "glyf" in result and "loca" in result
        assert result.getBestCmap() == coverage
        assert result["OS/2"].usWeightClass == weight
        assert bool(result["OS/2"].fsSelection & 1) == italic
        yield FONTS / "ttf" / ("Inter-" + name + ".ttf"), data.getvalue()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, data in generate():
        if args.check:
            assert path.read_bytes() == data, "Stale static font: " + str(path)
        else:
            path.parent.mkdir(exist_ok=True)
            path.write_bytes(data)
        print(("Checked " if args.check else "Wrote ") + path.name + " (" + str(len(data)) + " bytes)")
