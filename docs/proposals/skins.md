# Proposal: skins

This proposal adds a layer to PUDL called a skin, which changes the shape of the interface the way a theme changes its colours. It is a proposal only; nothing in PUDL or its specification changes until it is accepted.

## Why a skin is needed

A theme today may set the palette and the three faces, and nothing else. Chapter 3 forbids it to change the scales, which include the radii, and forbids it to set a derived token, which is where every raised, sunken and recessed surface gets its fill, border and shadow. Those rules keep a theme from breaking the grammar, and they work, but they also mean that the look of an interface is fixed apart from its colours. A theme can make PUDL silver and navy, but it cannot give it square corners and a two-tone bevel.

PUDL's grammar is that raised means pressable, sunken means input and flat means display. The desktop interfaces of the mid-1990s and early 2000s are where that grammar was worked out, and their looks are still recognised by the people who used them. A raised button with a light top-left edge and a dark bottom-right edge says "press me" as plainly as PUDL's gradient does; it only draws it differently. A skin changes how raised, sunken, recessed and lifted are drawn, and never what they mean or where they apply. That is the line between a skin and a fork.

## What a skin is

A skin is a named set of values for the **shape tokens**, a new kind of token beside the palette, the scales and the derived tokens. An application loads a skin's stylesheet after `pudl.css` and selects it with `data-skin` on the root element, as it selects a theme with `data-theme`, so a reader can switch skins at run time and the choice is kept as the theme's is. A skin sets its own palette for both the light and the dark form, since a shape and its colours are designed together, and a theme may still be laid over it. An application that loads no skin looks exactly as it does today, because the default skin is today's PUDL.

A skin changes nothing about markup, scripts, keyboard behaviour, focus order, the URL, applets, commands or what an agent sees. An agent driving a skinned application reads the same roles, names and states, and needs to know nothing about the skin.

## What a skin may set

These become shape tokens, each with today's value as its default.

| Area | Tokens | What changes |
|---|---|---|
| Corners | `radius`, `radius-sm`, `radius-xs`, and whether a small round control such as a dismiss button stays round | Square corners for one skin, larger ones for another |
| Raised surfaces | the fill (gradient, flat or gloss), the border width, and a two-colour bevel: a light colour for the top and start edges and a dark colour for the bottom and end edges | Gradient and soft shadow today; a 2px bevel or a glossy gel elsewhere |
| Pressed state | the same set for a raised control while it is pressed | An inverted bevel, or a darker gel |
| Sunken surfaces | the field's border width and its bevel, inverted from the raised one | A 2px inset well instead of a hairline and inner shadow |
| Recessed bands | the fill and the edge of a tab bar, a switch's track and the like | |
| Lifted surfaces | the card, menu and dialog shadow, and whether a menu is translucent | A hard 1px drop shadow, or none |
| Window chrome | the title bar's fill for active and inactive windows, its height, the window buttons' shape, size and spacing, the side they stand on, and the glyph set they use | A gradient title bar; buttons at the start edge |
| Focus | the focus indicator's shape: today's ring, or a dotted rectangle inside the control | |
| Type | the three faces and the base size of the interface text | A small bitmap-style face, or a humanist one |
| Texture | an optional background pattern for the page and for window bodies | Pinstripes |

The buttons' side is a separate setting from the page's direction. A skin that puts the window buttons at the start edge in a left-to-right page puts them at the end edge in a right-to-left one, as everything else mirrors.

## What a skin may not change

Every rule that protects a reader stays binding on a skin, and the conformance tests run against every skin as they run against the default.

- Raised, sunken, recessed, lifted and flat stay distinct from one another, and each still means what chapter 2 says.
- Text reaches 4.5:1 and the bounds of a control and a focus indicator reach 3:1, in both forms.
- Status keeps its glyph and colour together, and the status colours mean status only.
- The category colours keep their rules.
- Focus is always visible, and forced-colours mode draws as it does today, since the system's colours replace the skin's.
- Targets keep their minimum size, so a skin with small controls pads their targets.
- Reduced motion turns off a skin's motion, such as a pulsing default button.

## Faithful and strict versions

Some of the looks this proposal is for broke rules PUDL keeps. The best known is the trio of close, minimise and zoom buttons drawn as red, yellow and green circles, which carry their meaning by colour at rest and show their glyphs only under the pointer. PUDL reserves those colours for status and never lets colour alone carry meaning.

A skin may therefore come in two versions. The **strict** version keeps every rule of the specification and is conformant. The **faithful** version reproduces the original where it broke a rule, lists each rule it breaks in its documentation, and marks itself with `data-skin-faithful` on the root so that a test, a reviewer or an agent can tell. A faithful skin is never the default, and it may break only appearance rules: contrast, focus, target size, keyboard behaviour and forced colours stay binding even then, because a costume should not lock anyone out.

## The skins proposed

The names are descriptive words, and no skin uses, imitates or alludes to the name of a product, a company or a trademark in its name, its files, its documentation or its tokens.

**Bevel**, after the desktop of the mid-1990s. Corners are square. Raised controls are flat silver with a 2px bevel, white and light grey on the top and start edges, dark grey and black on the bottom and end edges, and the bevel inverts while pressed. Fields are white wells with the bevel inverted. The active title bar is a horizontal gradient from navy to a lighter blue with white bold text, and an inactive one is the same in greys. Window buttons are small square bevelled buttons at the end edge, with the close button set apart from the other two. Focus is a dotted rectangle inside the control. Menus and dialogs have a 1px hard shadow and no blur. The page is a flat teal. The type is a small bitmap-style face. Bevel needs no faithful version, since everything in it is already conformant once its colours are checked.

**Glaze**, after the desktop of the early 2000s, which kept the same grammar and softened it. Corners are slightly rounded. Buttons are light, with a soft vertical gradient and a coloured edge that appears under the pointer and on the default button. The title bar is a deep blue with a vertical gloss and rounded top corners, and its buttons are rounded squares, the close button red. That red close button is the one place Glaze leans on a status colour, so its strict version draws the close button in the title bar's blue with a white glyph and turns it red only under the pointer, as a destructive control's hover state is allowed to; its faithful version keeps it red at rest. The type is a humanist sans at the original's small size.

**Gel**, after the desktop of the early 2000s from the other side, with glossy buttons and pinstriped windows. Corners are generously rounded and push buttons are capsules. A raised control is a glossy gel: a light top half and a deeper bottom half with a highlight across it, white for an ordinary button and blue for the default one, which pulses slowly. Fields are white with a thin inset edge. Windows have a pinstripe texture and a light, softly graded title bar, and their buttons stand at the start edge. Menus are white and slightly translucent. The type is a humanist sans.

- **Gel, faithful**: the window buttons are red, yellow and green gel circles, whose glyphs appear only under the pointer, and it marks itself `data-skin-faithful`.
- **Gel, strict**: the window buttons are grey gel circles that always show their glyphs, the close button turning red only under the pointer. Everything else is the same as the faithful version.

## Fonts

A skin ships only fonts under an open licence that allows them to be bundled and redistributed, preferably the SIL Open Font License, and only fonts whose family names are not trademarks of the companies whose interfaces inspired the skin. Where no such face exists, the skin uses the nearest open face, even if it is less faithful, and says so.

These are the candidates, each to be checked before it is used. The licence must be read in the font's own distribution and not taken from a listing site, and its family name must pass the rule above.

| Skin | Candidate | Note |
|---|---|---|
| Bevel | A reconstruction of the period's bitmap system face, published under the SIL Open Font License | Its family name alludes to a product, so PUDL would bundle it under a neutral name, as the OFL allows for a modified version, after checking that it declares no reserved font name |
| Bevel | Liberation Sans (OFL), as a fallback at larger sizes | |
| Glaze | DejaVu Sans, under the Bitstream Vera licence, a humanist face close in feel | The Wine project's metric-compatible replacement for the period's face shares that face's trademarked family name, so it is ruled out |
| Gel | Source Sans 3 (OFL), a humanist sans | No open face is metric-compatible with the original; this is the nearest feel |

## How it would be built

1. **Specification.** Chapter 3 gains the shape tokens and the rules above, and chapter 10 gains the faithful marking. The scales stay fixed for themes; only a skin may set the radii.
2. **Tokenising.** Every component that draws a raised, sunken, recessed or lifted surface today, or a corner, a border width or a window button, must read the shape tokens. The stylesheets use the radius tokens about 77 times, the raised fills, borders, shadows and pressed states about 190 times, and literal radii or round corners 48 times, across `pudl.css` and `pudl-windows.css`. This is the largest part of the work. It is done as one sweep, behind one test that measures every component's corners, borders, fills and contrast under each skin and in both forms, so that a component missed by the sweep fails the test instead of being found later.
3. **The default skin.** Today's look is expressed as the default skin's values, and the default skin must render exactly as PUDL does now. The existing screenshots and geometry tests are the check.
4. **Bevel**, first, as the test of the layer, since it changes the most shapes with the least decoration.
5. **Glaze**, then **Gel**, both versions.

Each step is a release of its own. I expect the specification and the tokenising, with Bevel, to take two or three releases, and Glaze and Gel one each after that.

## Questions to settle

- Whether a skin's stylesheet is one file per skin, which keeps the default stylesheet small, or one file holding every skin, which lets a reader switch without a second download.
- Whether a skin's dark form is required. The looks this proposal draws on had no dark mode, but PUDL requires both forms, so each skin would design one in its own spirit.
- Whether the texture of the Gel skin, the pinstripes, is drawn by CSS gradients alone, which keeps it a token, or by an image, which looks closer to the original.
- Whether Glaze's slightly larger title bar and Gel's capsule buttons change any layout that tests assume, such as the docked title bar's height.
