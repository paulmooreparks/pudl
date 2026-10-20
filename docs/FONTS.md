# Inter subsets

PUDL 0.44.0 addresses [issue #11](https://github.com/paulmooreparks/pudl/issues/11) by declaring upright and italic Inter faces for Latin, extended Latin, Vietnamese, Greek, extended Greek, Cyrillic, extended Cyrillic, and the remaining supported characters. Browsers request only subsets needed by the page. All U+2190-21FF arrows supported by Inter belong to Latin, including the footnote return arrow.

## Adoption

Copy `pudl.css` and the complete `dist/fonts/` directory together. Loading the new stylesheet without the new font files causes failed requests and fallback text. In 0.44.0 the family name, font tokens, weight range, and optical-size behavior were unchanged; 0.70.0 narrows the default set, as described below. The SIL Open Font License remains beside the fonts.

The original `InterVariable.woff2` and `InterVariable-Italic.woff2` remain available for existing direct references and as build inputs. PUDL's default faces no longer request them. Remove any preload of those files when adopting subsets. Hosts that choose to preload may use the following path, adjusted to their asset location:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="pudl/fonts/Inter-latin.woff2">
```

Preloading is optional. A page that overrides the Inter family or does not render Latin may waste that download.

| Style | Whole font | Full Latin subset | Lean Latin subset |
|---|---:|---:|---:|
| Upright | 352,240 bytes | 162,188 bytes | 71,284 bytes |
| Italic | 387,976 bytes | 179,156 bytes | 75,824 bytes |

## Lean and full sets (0.70.0)

Since 0.70.0 the script subsets come in two sets cut along the same ranges. `pudl.css` declares the lean set as "Inter", in the files `Inter-<script>.woff2` and `Inter-Italic-<script>.woff2`. It keeps the weight axis from 400 to 900 and pins the optical-size axis at 14, its default and the optical size of PUDL's body text. The README allows a theme weights from 400 to 700, but the axis stops at 900 because the font has a master there; stopping at 700, which is not one, made the [instancer](https://fonttools.readthedocs.io/en/latest/varLib/instancer.html) re-express the weights between, which moved some advances by a font unit and points by up to 1.1 units, and keeping 900 costs about 4 KB in Latin. It keeps only the OpenType features a browser applies by itself, tabular and proportional numerals, and the numeric, positional and case forms CSS asks for by name through `font-variant-numeric`, `font-variant-position` and `font-variant-caps`. The generator lists them in `LEAN_FEATURES`. Character variants, stylistic sets, discretionary ligatures and the other alternates are left out, and those three cuts together remove about 55% of each file. Every character the whole font covers is still covered, combining marks included.

Headings are the visible difference. The whole font tightens its spacing and details as text grows past 14 pixels, and the lean set draws every size as text. At every weight each glyph keeps the whole font's advance, so text takes the same width. Pinning the optical size re-expresses some of the font's stored changes, which are whole font units, so a point of an outline can move by a fraction of a unit, 0.27 at most.

`pudl-fonts-full.css` declares the full set, in `Inter-Full-<script>.woff2` and `Inter-Full-Italic-<script>.woff2`, as the separate family "Inter Full", and sets the `--font` token to it. These files are byte for byte the subsets PUDL shipped from 0.44.0 to 0.69.3. A distinct family keeps the two sets independent: a page loading the full stylesheet never mentions "Inter" in a font list, so the browser never requests the lean files, and nothing depends on which of two faces with the same descriptors wins.

`pudl-fonts-system.css` sets `--font` to the platform's interface faces alone, so no Inter file is requested at all.

The total installed font directory grows because script subsets share glyphs and the original files are retained. The saving applies to a visitor's downloads. A page using many scripts can download more than one whole font would have required.

## Rebuilding

The build uses the documented [fontTools subsetter](https://fonttools.readthedocs.io/en/latest/subset/index.html). Python is a maintainer dependency only; consuming PUDL still requires no build.

```sh
python -m pip install -r build/fonts-requirements.txt
python build/fonts.py
python build/fonts.py --check
```

The script uses the whole files in `dist/fonts/` as inputs and writes thirty-two WOFF2 files, sixteen for each set, plus the marked font-face block in `pudl.css` and the whole of `pudl-fonts-full.css`. It retains glyph names, hinting and name records in both sets, and every layout feature and both variable axes in the full set. For the lean set it subsets first and then limits the axes with the instancer. It preserves the source glyph bounds and disables timestamp recalculation and the optional HarfBuzz repacker so the pinned toolchain produces consistent bytes. Commit the generated assets with any input or generator change.

Each script range is intersected with the source font's character map. A computed remainder covers everything outside those ranges. Every subset also retains all combining marks supported by the source font. This follows the [CSS cluster-matching rules](https://www.w3.org/TR/css-fonts-4/#cluster-matching), which prefer one face for a base character and its marks. Without that addition, the ranges proposed in the issue changed the metrics of decomposed accented text in Chromium and WebKit. The extra coverage accounts for the larger Latin subset compared with the issue's estimate. Shared characters may appear in several subsets; Latin is declared last so ordinary punctuation uses the common subset. Glyphs required by shaping rules are retained even when they have no directly addressable Unicode character.

The font files also retain basic Latin letters as internal hinting context, with basic Greek and Cyrillic retained in their respective extended subsets. These extra characters stay outside the subset's advertised CSS range unless they already belong there. FreeType documents that its [auto-hinter derives alignment zones from representative characters](https://freetype.org/ttfautohint/doc/ttfautohint.html#blue-zones). Removing that context changed bold extended-Latin widths by one pixel in Linux Chromium, even though the design-space advances were unchanged. Retaining it restores the tested metrics without loading additional files.

## Verification

The generator checks serialized character maps, complete coverage, variable-axis bounds (the original's for the full set, 400 to 900 with no optical-size axis for the lean one), glyph-name table format, and the union of retained OpenType feature tags against each original font, limited to `LEAN_FEATURES` for the lean set. For every lean subset it also instances the file and the whole font at weights 400, 600 and 700 and requires every glyph's advance to be equal and every point of its outline to be within half a font unit. `--check` also rebuilds and compares every generated byte without modifying files. CI runs this check with pinned fontTools and Brotli versions.

`tests/fonts.test.js` checks actual browser requests for every subset and both styles. It verifies that an English page with a footnote arrow requests only Latin, that italics load on demand, and that representative mixed-script and decomposed accented text matches the whole font's layout metrics at body and heading sizes with tabular numerals, to 0.02 pixels. Both sets are compared at weights 400 and 700, the lean one with the whole font at the optical size of text and the full one with optical sizing on. Weight 600 is left to the generator's check because Linux Chromium, which fits outlines to pixels, draws some Greek and Cyrillic text at weight 600 a pixel narrower from any subset than from the whole font, the unchanged full set included. The test also checks that `pudl-fonts-full.css` requests only full subsets and that `pudl-fonts-system.css` requests no font. The release review compares the reference page in both themes.
