# Proposal: separating the language from its web implementation

Status: accepted, 2026-09-30. Paul took all three recommendations, recorded at the end.

PUDL is meant to be a design language, and this repository was meant to be one implementation of it. In practice the two have grown into one thing. The README states a rule of the language and then, in the same paragraph, names the CSS class that carries it out. `docs/CONTRACT.md` calls itself the list of everything a project may rely on, but everything in it is a class, a data attribute, a script function or a query parameter, so it is really the web implementation's interface. One version number covers both, which means a new button style and a new rule about what a button is look like the same kind of change.

That was harmless while PUDL had one implementation and one adopter. It stops being harmless the moment a second platform wants PUDL, because there is no document that says what the second platform has to do. This proposal separates the two, says where each part of the current repository belongs, and sets an order for the platforms after the web.

## Where the line falls

The test is simple: a statement belongs to the language if it would still be true in a desktop application or a terminal, and to the web implementation if it only makes sense in a browser.

### The language

- **The grammar.** Raised means pressable, sunken means input, flat means display. Colour is never the only signal. State is marked by what it means, so assistive technology and the eye are told the same thing. A visible context has at most one primary action. These are the rules a reader learns once and applies everywhere, and they are the reason PUDL exists.
- **Tokens as roles, with the derivations written as formulas.** The palette is a set of roles (`bg`, `surface`, `surface-alt`, `text`, `text-muted`, `border`, `accent`, `on-accent`, `warn`, `danger`, `positive`) and a lighting model (`light`, `shade`, `lit`, `depth`). Everything else is computed from them, and the spec states each computation as arithmetic on colours: the raised top is `light` mixed into `surface-alt` at `lit` percent, in sRGB. Written that way, a WPF theme and a CSS theme given the same palette produce the same colours, and nobody has to copy a hex value by hand.
- **Scales.** The type scale, the spacing grid and the radii, in logical units (the CSS pixel, the WPF device-independent pixel, the Android dp and the Apple point are all the same idea).
- **The syntax colours**, with the contrast each must reach on each surface.
- **Components**, each defined by its purpose, its anatomy, its states, how it responds to pointer, touch and keyboard, and its accessibility semantics. The semantics are stated as roles and properties that each platform maps to its own accessibility interface: ARIA on the web, UI Automation on Windows, NSAccessibility on macOS, AT-SPI on Linux. The spec says a tab list has one tab stop and the arrow keys move within it; it does not say `role="tablist"`.
- **Glyphs**, as path data on a 16-unit grid, which every platform can draw.
- **Behavioural invariants**, stated so they can be tested: text contrast of 4.5:1, a visible focus indicator, target sizes, a high-contrast mode that keeps every state visible, no motion for a reader who asked for none.
- **What must be restorable.** A window arrangement, the record in view, a filter in force: the spec says these are part of the state a reader can return to and share. How a platform does it is the platform's business.

### The web implementation

- `dist/`: `pudl.css`, the scripts, the fonts.
- The class names, data attributes, events and functions, which is to say all of `docs/CONTRACT.md`.
- The address grammar for windows (`open`, `top`, `min`, `p.<key>`), regions and applets. It is the web's answer to the spec's requirement that arrangements be restorable. "URL is king" is an architectural principle for web applications, recorded in the Architectural Principles, not a rule of the design language.
- `reference.html`, the samples and the Playwright suite.

### The awkward cases

A few things sit on the line, and writing the spec will force a decision on each. Floating windows assume a pointer and a large screen, so the spec has to say what a window becomes on a phone, which the web implementation already answers (one pane at a time, windows as the detail) without the answer being written down as a rule. Hover-only affordances do not exist on touch screens, so any component that relies on hover has to have a way that does not. Tooltips are a web convention that native platforms handle differently. None of these is a reason to delay; they are the part of the work that makes the spec worth having.

## Where the spec lives

**Recommended: a separate repository, `pudl-spec`, created now.** It holds the specification, the canonical token file and the conformance checklists, and it has its own version. This repository stays `pudl` and becomes, explicitly, the web implementation. Its README opens by saying so and linking the spec, and each release says which spec version it conforms to.

The reasons:

- Adopters load PUDL from `cdn.jsdelivr.net/gh/paulmooreparks/pudl@vX/dist/…`. Keeping this repository's name and layout keeps every one of those addresses working, for parkscomputing.com and pudl.bytecode.news and anyone after them.
- Every other implementation will be a repository and a package of its own anyway: a NuGet package for Avalonia, a Go module for a terminal library, a Swift package. The spec being one more repository beside them is the natural shape, and it keeps the spec from being quietly owned by the web.
- A separate repository makes the separation structural rather than a matter of discipline. A change to the language is a change to `pudl-spec`, reviewed as such, and the web implementation follows it in a release of its own.

**The alternative: a `spec/` folder in this repository, with its own version.** It is cheaper today, since there is one repository to work in and one set of links. But the separation then rests on remembering not to mention CSS in `spec/`, the version numbers of language and implementation sit side by side where they are easy to confuse, and the folder has to be moved out the moment a second implementation exists, which breaks every link into it. I would only choose this if the second platform is years away.

**What I would not do** is rename this repository to `pudl-web`. GitHub redirects a renamed repository, but whether jsDelivr follows those redirects for new tags is not something I can find documented, and PUDL does not rely on undocumented behaviour. If the name ever needs to change, it should be done with a deliberate migration of adopters' addresses, not as a side effect of this proposal.

## One source for the tokens

The palette, the scales and the glyphs move into a single token file in the W3C Design Tokens Community Group format, kept in `pudl-spec`. Each implementation generates its own form from it: the custom properties at the top of `pudl.css`, a XAML resource dictionary, Swift and Kotlin theme types, Go constants. The derived tokens are generated too, from the formulas, so a theme that sets the palette gets the same derived colours on every platform.

This matters more than it seems. Today a theme is a stylesheet of CSS custom properties, which only the web can read. With one token file, a project's theme is written once and applies to its website, its desktop tool and its terminal utility alike, which is most of what a design language is for.

The web implementation keeps its hand-written `pudl.css` for everything except the token block, which a small build step produces from the token file. That is the only build step PUDL would have, and a project that copies `dist/` never sees it.

## Conformance

A platform conforms to a version of the spec when it passes that version's checklist. The checklist is written per component, as observable behaviour: this component is raised, it has one tab stop, the arrow keys move within it, its selected state is exposed to assistive technology as selected, its text reaches 4.5:1 in both themes, it shows focus in high-contrast mode. The web implementation's Playwright and axe suites are its evidence of conformance, and each other platform brings its own.

## Versions

The spec and each implementation are versioned separately. The spec's version changes when the language changes: a new component, a new rule, a changed token role. An implementation's version changes when its interface changes, and each release states the spec version it implements. The web implementation's 1.0 would implement spec 1.0, but after that they move independently: a CSS bug fix is a web release and leaves the spec alone, and a new component appears in the spec first and in each implementation when that implementation adds it.

## Platforms after the web

In the order I would do them, and why:

1. **Avalonia, in C#.** One XAML implementation runs on Windows, macOS and Linux. It is .NET, where you have twenty-six years, and its styling system handles elevation, state and theming directly. It is the most platforms for the least work, and it is the implementation most likely to find the spec's gaps, because desktop conventions differ from the web's in exactly the places the spec is vaguest.
2. **A terminal implementation in Go**, on Bubble Tea and Lip Gloss, for Tela's command-line tools. It is the hardest test of the language: without shadows, elevation has to be carried by box-drawing, shading and inverse video, and if the grammar survives a terminal it will survive anything. Ratatui (Rust) or Terminal.Gui (.NET) are alternatives if Tela is not the first user.
3. **Server helpers for the web**, in Go and ASP.NET, that parse the window address grammar and render the markup, as the road to 1.0 already proposes. These belong to the web implementation rather than being a new platform, but they are the next most useful work for the sites that exist.
4. **Mobile, when an application needs it.** Flutter (Dart) gives one implementation for iOS and Android and draws its own controls, which suits PUDL's raised and sunken surfaces. SwiftUI and Jetpack Compose (Kotlin) are the native pair: twice the work, but closer to each platform's own feel.
5. **Others worth knowing about.** WinUI 3, for Windows-only native applications. Qt with QML (C++), for embedded devices. GTK, which is part of PUDL's lineage. A Figma library generated from the token file, so that designers work in the same language the implementations do.

## First steps

1. Create `pudl-spec` with a README and the chapter outline below, each chapter a stub.
2. Write the token file from the current `pudl.css`, and generate the web token block from it, checking that the generated block matches today's byte for byte.
3. Write the grammar and tokens chapters first, since everything else depends on them, then one component, the button, end to end, as the model for the rest.
4. Change this repository's README to say it is the web implementation of PUDL, and link the spec.
5. Move the rules out of this README into the spec as their chapters are written, leaving the README to explain how the web implementation carries them out.

### A first outline of the spec

1. Introduction: what PUDL is, who it is for, conformance and versions.
2. The grammar: elevation, colour and state, the primary action.
3. Tokens: the palette roles, the lighting model and the derivation formulas, the syntax colours, the scales, theming.
4. Typography.
5. Glyphs.
6. Accessibility: roles and properties, focus, contrast, high contrast, reduced motion, languages and direction, print.
7. Restorable state: what a reader must be able to return to and share.
8. Components, one section each: buttons and toggles, fields and form states, segmented controls, badges and chips, cards, key/value tables, data tables and grids, trees, path bars, tabs (section, panel and document), menus and launchers, dialogs, notices and toasts, empty and loading states, tooltips, pagination, master-detail layouts, windows, code blocks and editor surfaces, drop targets.
9. Applets: the host contract, independent of any platform.
10. Conformance checklists.

## Decisions

Paul decided all three on 2026-09-30, each as recommended.

1. The spec lives in a separate repository, `pudl-spec`, created now. This repository keeps its name and becomes the web implementation.
2. The first platform after the web is Avalonia.
3. The web implementation's 1.0 waits for spec 1.0. Writing the spec settles questions that would otherwise be frozen into the web's interface first, such as what a window becomes on a phone and what replaces a hover-only affordance on touch, and settling them after a 1.0 would put the change on adopters.
