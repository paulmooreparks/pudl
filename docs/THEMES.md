# Companion colour themes

Bevel, Gel and Glaze each have an optional colour theme with the same name. The themes are working candidates pending independent review. Each supports light and dark forms and can be combined with any skin, including Standard.

| Theme | Light appearance | Dark appearance |
| --- | --- | --- |
| Bevel | Warm desktop grey, navy selection and teal application chrome | Charcoal grey-green, pale navy-blue accents and deep teal chrome |
| Gel | Cool silver, blue-white surfaces and aqua-blue accents | Blue charcoal, silver text and clear blue accents |
| Glaze | Warm ivory, pale olive surfaces and saturated blue chrome | Deep green charcoal, ivory text and blue chrome |

Load the selected theme stylesheet after PUDL's component and skin stylesheets, then apply its name through `data-palette` on the root element. The existing `data-theme` attribute continues to select light or dark. The JavaScript theme API continues to handle light, dark and system preference only.

```html
<html data-skin="gel" data-palette="gel" data-theme="light">
<!-- In the head, after pudl.css, pudl-windows.css and the selected skin: -->
<link rel="stylesheet" href="dist/pudl-theme-gel.css">
```

The stylesheet names are `pudl-theme-bevel.css`, `pudl-theme-gel.css` and `pudl-theme-glaze.css`. Minified counterparts live in `dist/min/`. A page supporting live choice can load all three. Changing `data-palette` switches colours without requests, remounting content or changing window layout. Removing the attribute, or setting it to `standard`, restores the inherited palette. Hosts own persistence for this optional choice; the stylesheets add no storage or runtime API.

The themes set palette tokens only. Host overrides load afterwards. Shape, depth treatment, typography, target dimensions and interaction remain component or skin concerns. Category colours retain their canonical colour families with tonal adjustments for the new surfaces, and syntax colours receive corresponding contrast adjustments. Theme rules apply only to ordinary screen colours, leaving forced colours and print to PUDL.

Authored values live in `themes/`. Run `node build/palette-themes.js` to generate the stylesheets, or add `--check` to verify freshness. `node build/minify.js` generates their minified copies. The [skin preview](../samples/skins.html) provides independent Skin, Colours and Theme controls and records all three in its URL.
