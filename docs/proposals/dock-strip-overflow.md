# A dock strip that shows its hidden tabs

Status: accepted on 3 November 2026, to be built in the next point release.

## The problem

A shared dock's tab strip, `.win-dock-tablist`, is a flex row that takes the room beside the dock's collapse button and scrolls sideways when its tabs do not fit. At 1440 pixels with five windows docked on the right, the strip ends 4 pixels before the collapse button and no tab is cut beneath it; a tab that is selected, whether by a click, by the arrow keys or by its window being raised, is already scrolled whole into view. A report of the last tab cut under the collapse button has not been reproduced, and stays open until it is.

What is missing is any sign that tabs are hidden. The only one is a thin scrollbar in a 40-pixel strip, which some hosts show only while the pointer is over it, so a reader with a pointer cannot tell that more tabs exist or reach them except by finding that scrollbar.

## The change

A dock strip whose tabs do not all fit says so and lets the reader reach every tab without the scrollbar.

- While any tab is wholly or partly outside the strip, an overflow button stands at the strip's end, before the collapse button: a raised icon button with the More glyph, named "More tabs" and the count of hidden tabs, as the taskbar's More button is named. It is not shown while every tab fits, and the strip's room is measured with it present, so it appearing never pushes a tab under it.
- The button opens a PUDL menu listing the hidden tabs in strip order, each with its window's glyph or picture, its title and its execution state mark. Choosing one selects that tab, as pressing it would, and the strip scrolls it whole into view.
- Selecting a tab by any route keeps scrolling it whole into view, with its menu button, clear of the buttons at the strip's end; this already holds and gains a test.
- The thin scrollbar stays for those who use it. Nothing depends on it.

The same applies to every shared dock edge that shows tabs, and to each pane of a split dock, which has a strip of its own.

## Contract

The contract gains the overflow button's class, `.win-dock-more`, and its words, `data-win-text-dock-more` on the layer, defaulting to "More tabs". No host markup changes.

## Tests

A right dock with eight tabs at 1440 and 1024 pixels: the button appears, its name gives the hidden count, its menu lists exactly the hidden tabs, and choosing one selects it with its whole box and menu button inside the strip. Widening until every tab fits: the button goes. A left dock, a top dock, and a split pane. Arrowing along the tablist to a hidden tab scrolls it into view. Both themes, right to left, and forced colours. Chromium, Firefox and WebKit.
