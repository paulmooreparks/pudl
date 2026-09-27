# Response: the windows are a workspace

Status: accepted and built, 2026-09-27. Proposals 1, 3 and 4 shipped in 0.11.0 and proposal 2 in 0.12.0.

One change from the design below: a soft navigation may go to another path, not only the same one, when the page it fetches has the same regions and the same window layer. That lets a site with a page per category, such as the article reader sample, keep its windows between categories, and the compatibility check is what makes it safe. The windows travel into the pushed address because they stay on screen. Answers `Architecture/pudl-proposal-window-workspace.md` in the parkscomputing repository.

I agree with all four proposals and with the principle behind them: once windows hold scroll positions, arrangements and running applets, nothing should repaint them unless the reader asked for it. Two of the four need a change of shape on the way into PUDL, and the second is large enough that its design is set out here before any code.

## 1. A linked window opens in its opener's state

Agreed, as the module's default. The order in which a new window's placement is decided becomes:

1. a placement in the URL;
2. a `pudl:window-place` listener;
3. **the opener's state, when the link sits inside a window;**
4. a position in the markup's `style`;
5. the markup's `data-win-mode`, with a cascade position.

Two refinements. First, a floating opener's geometry carries over one cascade step down and to the right, and when that step would push the window past the edge it wraps back towards the top left, so that repeated opens fan out rather than piling up exactly on one another at the edge. Second, this applies to child windows too, which is the site's point: a listing opened from a floating article floats. The README's child contract will name maximise and restore as normal child chrome alongside close, with minimise still absent, and the samples' children will carry them. `pudl:window-place` gains `event.detail.opener`, the key of the window the link sat in, so a listener can see the same thing.

`pudlWindows.open(key, opener)` already takes the opening element, so scripted opens inherit the same way.

## 2. Navigation that changes only the list leaves the windows alone

Agreed on the problem, and it is the most important of the four: a category tab that restarts a sudoku game is a bug in the language, not in the site. I would ship it as a new optional module rather than as part of the windows module, and generalise it slightly, because the idea is broader than lists beside windows: any page whose server renders what the URL names can swap the parts a navigation changes and keep the rest.

**Regions.** A project marks the parts of the page that a navigation may replace with `data-region="<name>"`, for instance `data-region="sections"` on the section bar, `"chips"` on the chip row and `"list"` on the sidebar. Naming regions, rather than listing PUDL classes, keeps the module out of the site's structure and lets any page use it.

**What becomes a soft navigation.** A plain click on a same-origin link inside a region, or the submission of a GET form inside a region, whose target has the same path as the current page. Anything else, including a modified click, a different path, a POST, a non-HTML answer or a failed fetch, is left to the browser, so the worst case is today's behaviour.

**What happens.** The script builds the target URL with the window parameters (`open`, `top`, `min` and every `p.`) taken from the live URL rather than from the link, fetches it, and parses the page it gets back. If every region on the current page has a counterpart of the same name in the response, it replaces each region's contents, pushes the URL and leaves everything else alone. If any region is missing, it performs a full navigation instead, because the server has answered with a page of a different shape.

**The same URL, the same page.** The fetch asks for the page exactly as a browser would, with no special header and no fragment endpoint. Andoneer's windows once varied their answer on a request header and inherited a caching bug from it; the swap reads what it needs from the whole page and needs nothing from the server that a bookmark would not also get. The cost is that the server renders the windows it names, which the swap then ignores. That is acceptable, and a project that minds can cache.

**Back and Forward.** The windows module already reconciles the windows on `popstate`. The regions module compares the URL's non-window parameters before and after; if they changed, it fetches and swaps the regions for the new URL. If only window parameters changed, it does nothing.

**Stale links.** A region's links and forms carry the window parameters the server rendered at load. After every `pudl:windows-change`, the module rewrites the window parameters in the `href` of each same-path link inside a region, and in each region form's hidden inputs of those names, so a middle-click, a copied link or a form submitted without the module's help carries the live windows. Without script the server's values are the live ones, since nothing has changed them.

**Focus.** If focus was inside a swapped region, it moves to the element in the new region with the same `id`, or failing that the same `href`, or failing that to the region itself. Scroll positions of the swapped regions reset, since the content under them is new; everything outside them, windows included, keeps its scroll.

**Name and size.** `dist/pudl-regions.js`, with no dependency on the windows module beyond reading and writing the window parameters it documents, so a page without windows can use it too. I expect it to be about the size of `pudl-menu.js`. The site's `softNavigate`, `swapListChrome` and `syncNavState` are the working reference, and the site deletes them once it adopts the module.

**A limit to state plainly.** A region is replaced whole, so state inside it that the server does not render, such as text half-typed into a filter box that was not the one submitted, is lost on a soft navigation, as it would be on a full one. The filter that triggered the navigation is rendered by the server with its submitted value, so it is not affected.

## 3. The filter gets an apply button

Agreed; the bare input breaks the language's own rule that what can be pressed looks pressable. The pattern is a `form.md-filter-group` holding the `.md-filter` input and an `.icon-btn.md-filter-go` submit button, drawn joined, the sunken input's right edge meeting the raised button's left. The magnifying glass comes from the stylesheet as a CSS mask over an inline SVG, because the Unicode magnifying glass renders as an emoji on some platforms, the problem the launcher icon ran into. The button carries an `aria-label`. The master-detail demo on the reference page and the README's toolbar markup will show the pair.

## 4. A hover colour for links on the topbar

Agreed, and it is partly a bug: `.brand` has no hover rule of its own, so the page's `a:hover` wins and gives it `--accent-hover`, which on a light theme is a dark colour on a dark bar. I would add `--tb-link-hover`, derived by default as the accent mixed into the topbar's foreground, which stays legible on a dark bar and on a light one such as the slate example's, apply it to `.brand:hover` and to any plain link in the topbar, and let a theme set it.

## Plan

**0.11.0**, small and changing no contract: opener inheritance with the cascade and the `opener` detail on the event, maximise and restore in the child contract and samples, the filter group with its glyph, and `--tb-link-hover` with the brand hover fix. Tests extend the window suites for inheritance, and a phone check covers the filter group.

**0.12.0**: `pudl-regions.js` as designed above, with the reference page's master-detail demo and the article reader sample using it. The sample gains a category tab bar and a filter so that the swap has something to do, with a floating article and the colour mixer open to show that neither is disturbed. Tests cover the swap, the fallbacks, Back and Forward across list and window changes together, the live window parameters in links and forms, and focus.

Once 0.12.0 ships, parkscomputing.com deletes its opener tracking and its three navigation functions, leaving `desktop.js` with what is specific to the site.
