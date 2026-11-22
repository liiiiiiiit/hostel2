# Homepage hero carousel

React 19 with Tailwind CSS 4 and scoped CSS in `src/components/HeroCarousel.css`.
The existing `HomeView` already renders the component, so no additional setup is required.

```tsx
<HeroCarousel language={currentLang} onNavigate={onNavigate} />
```

## Content and images

Edit `src/i18n/heroSlides.ts`. The central array contains all six service destinations,
Unsplash image URLs, crop positions, photo sources and EN/FA/RU/HY content. Use the
`copy` object for translated chip labels, badges, headlines, descriptions and CTA labels.
CTA URLs come from the existing localized router; normal clicks use client navigation,
and modified clicks can open a new tab.

The accommodation and workspace photos illustrate service categories. They are not
photographs of specific advertised listings. Garni, the Cascade city view and the café
photographs have their location and source credits stored beside the image URL.
The existing `StayPhoto` fallback preserves the layout if an external image fails.

## Playback and input

`HERO_DURATION_MS` is 5000. The active gold segment's CSS animation is the playback
clock, so hovering or holding a pointer pauses the bar and image together and resumes
at the same elapsed time. A category selection restarts its clock. Keyboard focus,
hidden browser tabs and the explicit pause button also stop rotation. Reduced-motion
mode disables rotation, image zoom and entrance animations while keeping manual
navigation available.

Swipe horizontally over the photo or copy. Direction and keyboard arrows follow RTL
for Persian. The category rail scrolls independently; selecting a hidden category only
scrolls the rail, never the page. Desktop arrows appear on hover or keyboard focus.
The layout uses minimum heights, allowing long translations and enlarged text to grow
without clipping the CTA or category controls.

## Verification

```sh
npm run lint
npm test
BROWSER_PATH=/usr/bin/chromium npm run test:hero
```

The hero browser audit uses an isolated temporary SQLite database. It checks every
slide and CTA route in all four languages at 320, 390, 820 and 1440 pixels with 125%
text, plus real touch swipes, keyboard direction, hover pause/resume, the five-second
progress clock and reduced-motion behavior. It does not modify production data.
Optional `HERO_IMAGE_FIXTURES` and `HERO_SCREENSHOTS` directories support offline image
fixtures and screenshots. `BROWSER_ARGS` can supply a JSON array of launch arguments.
