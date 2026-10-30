# Proposal: skins

This proposal adds a layer to PUDL called a skin, which changes the shape of the interface the way a theme changes its colours. Its implementation is underway; it does not describe a released feature yet.

Implementation has been authorised, starting with the foundations and Bevel. The [implementation contract](../SKINS.md) defines the first increment and its validation boundary. The wider appearance options below describe the intended design space; the first increment keeps fonts, type and spacing scales, focus placement and behavior, chrome order and hit geometry unchanged while proving the surface-treatment mechanism. Generated skin stylesheets will come from validated structured definitions.

## Review direction

The agreed direction is to draw inspiration from earlier interfaces while retaining PUDL's interaction and accessibility rules. Historical pixel matching is not an acceptance criterion. Bevel, Glaze and Gel should be recognisable through their surface treatments, corners, colours and textures without copying historical target sizes or hiding action glyphs.

Every skin must conform to PUDL standards. This applies to the initial skins and all future skins. Historical resemblance is subordinate to conformance, and the skinning mechanism must enforce that boundary. There are no faithful variants or exception markers.

Before changing shipped styles, capture a standard-skin baseline from identified source hashes, browser versions and fonts. Preserve computed styles and geometry for representative components and states, together with rendered screenshots. Compare both absent `data-skin` and explicit `data-skin="standard"` against that baseline. Expected values must not be derived solely from the new tokens.

The verification matrix keeps component categories invariant while checking the visual treatment specified for each skin. A raised control need not have both a gradient and a shadow if its approved bevel expresses the same category. Contrast, focus visibility, minimum hit targets, clipping, overlap, zoom and reflow retain independent assertions. Bevel is a candidate for conformance, not a skin already proved conformant.

The inventory must include `radius-pill`, pseudo-elements, generated controls, script-set geometry and taskbar stacks. Intentional circles, joined seams, docked flush edges and resize hit areas require separate treatment from decorative corners. Verification owns the independent component inventory and tests; the architect owns the token contract, source and specification.

Before the token sweep, the contract must settle palette and host-theme precedence in both forms, unavailable persisted skin fallback, the type-scale boundary and understandable keyboard order when window controls change sides. These are required design decisions rather than implementation discretion.

## Why a skin is needed

A theme today may set the palette and the three faces, and nothing else. Chapter 3 forbids it to change the scales, which include the radii, and forbids it to set a derived token, which is where every raised, sunken and recessed surface gets its fill, border and shadow. Those rules keep a theme from breaking the grammar, and they work, but they also mean that the look of an interface is fixed apart from its colours. A theme can make PUDL silver and navy, but it cannot give it square corners and a two-tone bevel.

PUDL's grammar is that raised means pressable, sunken means input and flat means display. The desktop interfaces of the mid-1990s and early 2000s are where that grammar was worked out, and their looks are still recognised by the people who used them. A raised button with a light top-left edge and a dark bottom-right edge says "press me" as plainly as PUDL's gradient does; it only draws it differently. A skin changes how raised, sunken, recessed and lifted are drawn, and never what they mean or where they apply. That is the line between a skin and a fork.

## What a skin is

A skin is a named set of values for the **shape tokens**, a new kind of token beside the palette, the scales and the derived tokens. An application loads a skin's stylesheet after `pudl.css` and selects it with `data-skin` on the root element, as it selects a theme with `data-theme`, so a reader can switch skins at run time and the choice is kept as the theme's is. A skin sets its own palette for both the light and the dark form, since a shape and its colours are designed together, and a theme may still be laid over it.

Today's look becomes the **standard** skin, and it is also the appearance with no skin at all. Its values are the shape tokens' defaults, built into `pudl.css` as today's values are, so an application that loads no skin and sets no attribute looks exactly as it does now and needs no new file. It is still a skin like the others: it has a name, `data-skin="standard"` selects it explicitly, a skin picker lists it beside the rest so a reader who chose another can come back, and it is the baseline every other skin is tested against.

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

## PUDL standards come first

Every skin must follow PUDL's standards. A skin may pay homage to a classic interface through its colours, corners, bevels, gloss and textures, but must adapt any historical treatment that conflicts with PUDL's meaning, accessibility or interaction rules. Pixel-perfect reproduction is not a goal. These requirements apply equally to Bevel, Glaze, Gel and every skin added later.

The skinning mechanism must enforce these requirements through a constrained token contract and validation. Skins may supply only the documented appearance values and surface treatments. PUDL retains control of component categories, status and category semantics, visible action glyphs, focus behavior, keyboard interaction and minimum hit targets. A skin cannot opt out of those rules or supply component overrides that bypass them.

The mechanism must reject unsupported tokens and values outside their permitted domains before admitting a skin. Each supported surface treatment must also pass rendered conformance checks across the component inventory, states and both forms, including contrast, focus, forced colours and reduced motion. Token validation alone cannot establish rendered contrast or freedom from clipping. The exact schema, constraints and validation path must be specified before implementation; arbitrary CSS overrides cannot be treated as a validated skin.

There is one conformant version of each skin. No selection flag, exception whitelist or alternate variant may disable the requirements. If a historical detail cannot meet them, the skin uses a PUDL-compatible treatment instead.

## The skins proposed

The names are descriptive words, and no skin uses, imitates or alludes to the name of a product, a company or a trademark in its name, its files, its documentation or its tokens.

**Bevel**, after the desktop of the mid-1990s. Corners are square. Raised controls are flat silver with a 2px bevel, white and light grey on the top and start edges, dark grey and black on the bottom and end edges, and the bevel inverts while pressed. Fields are white wells with the bevel inverted. The active title bar is a horizontal gradient from navy to a lighter blue with white bold text, and an inactive one is the same in greys. Window buttons are small square bevelled buttons at the end edge, with the close button set apart from the other two. Focus is a dotted rectangle inside the control. Menus and dialogs have a 1px hard shadow and no blur. The page is a flat teal. The type is a small bitmap-style face. Bevel must pass the full conformance matrix, including boundary contrast and focus visibility, before it is accepted.

**Glaze**, after the desktop of the early 2000s, which kept the same grammar and softened it. Corners are slightly rounded. Buttons are light, with a soft vertical gradient and a coloured edge that appears under the pointer and on the default button. The title bar is a deep blue with a vertical gloss and rounded top corners, and its buttons are rounded squares with visible glyphs. The close button follows PUDL's destructive-action treatment. The type is a readable humanist sans within PUDL's type rules.

**Gel**, after the desktop of the early 2000s from the other side, with glossy buttons and pinstriped windows. Corners are generously rounded and push buttons are capsules. A raised control is a glossy gel: a light top half and a deeper bottom half with a highlight across it, white for an ordinary button and blue for the default one, which pulses slowly. Fields are white with a thin inset edge. Windows have a pinstripe texture and a light, softly graded title bar, and their buttons stand at the start edge. Menus are white and slightly translucent. The type is a humanist sans.

Gel's window buttons are neutral gel circles with visible action glyphs. The close button follows PUDL's destructive-action treatment. Textures, translucency and gloss must preserve the required contrast against the actual rendered background.

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

1. **Specification.** Chapter 3 gains the shape tokens and the rules above, and chapter 10 gains the skin validation and conformance requirements. The scales stay fixed for themes; only a skin may set the radii.
2. **Tokenising.** Every component that draws a raised, sunken, recessed or lifted surface today, or a corner, a border width or a window button, must read the shape tokens. The stylesheets use the radius tokens about 77 times, the raised fills, borders, shadows and pressed states about 190 times, and literal radii or round corners 48 times, across `pudl.css` and `pudl-windows.css`. This is the largest part of the work. It is done as one sweep, behind one test that measures every component's corners, borders, fills and contrast under each skin and in both forms, so that a component missed by the sweep fails the test instead of being found later.
3. **The standard skin.** Today's look is expressed as the standard skin's values, and it must render exactly as PUDL does now. The existing screenshots and geometry tests are the check.
4. **Bevel**, first, as the test of the layer, since it changes the most shapes with the least decoration.
5. **Gel** follows Bevel at the user's request, then **Glaze**, each subject to the same conformance requirements.

Each step is a release of its own. I expect the specification and the tokenising, with Bevel, to take two or three releases, and Glaze and Gel one each after that.

## Decisions

These were open questions when the proposal was written, and are settled as follows.

- **Each skin is a file of its own**, `pudl-skin-<name>.css`, loaded after `pudl.css`. The standard skin needs no file. An application loads the files of the skins it offers, so `pudl.css` stays the size it is for the many applications that offer none, and each skin is cached on its own. A reader switching to a skin the application already loaded downloads nothing.
- **Every skin has a dark form.** PUDL requires both forms of every palette, and a skin is no exception. The looks these skins draw on had no dark mode, so each skin designs one in its own spirit, keeping its shapes and moving its colours, and both forms pass the same contrast tests.
- **Gel's pinstripes are drawn with CSS gradients**, with no image. A gradient is a token a theme can recolour, it follows the dark form, it costs no download, and forced colours remove it as they remove every other background. An image would look slightly closer to the original and would lose all four.
- **A skin may change heights and sizes, and the tests read them from the tokens.** Glaze's taller title bar and Gel's capsule buttons are set through the shape tokens, including the docked title bar's height, which is already a token. Any test that assumes a literal height today is changed to read the token, as part of the tokenising sweep, so that the same tests hold for every skin.
