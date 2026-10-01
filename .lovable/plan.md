# Improve mobile page speed without redesigning the site

## Performance work

### Homepage hero
- Generate AVIF and WebP hero variants at 640, 1024, and 1600 pixels wide from the existing artwork.
- Keep the same crop, height, typography, and overall appearance.
- Render the hero with a responsive `<picture>`/`<img>` using `srcset` and `sizes`, intrinsic dimensions, `fetchPriority="high"`, and eager loading.
- Preload the responsive AVIF/WebP hero in the document head so mobile browsers request the 640px asset immediately.
- Keep the 640px version below 150 KB.

### Other images
- Convert local page/template imagery to WebP while preserving visual quality and existing aspect ratios.
- Add stable width and height attributes to image elements to prevent layout shifts.
- Add lazy loading and asynchronous decoding to below-the-fold images; keep above-the-fold logos and the hero eager.
- Preserve dynamic memorial/user images and improve their browser loading attributes; do not rewrite or expose private media URLs.

### Fonts and blocking requests
- Replace the render-blocking Google Fonts stylesheet with locally bundled Playfair Display files.
- Load only the 400, 600, and 700 weights already used, with `font-display: swap`.
- Remove the now-unneeded Google Fonts preconnect and stylesheet tags.

### JavaScript
- Keep the homepage route eager and convert every other page route to `React.lazy` with a lightweight `Suspense` fallback.
- Lazy-load the cookie preferences interface and homepage sections/modal that are not needed for the first viewport.
- Preserve all current routes, locale prefixes, redirects, and behavior.
- Remove dependencies only when source inspection confirms they are unused; otherwise retain them to avoid regressions.

### Accessibility
- Strengthen the existing hero image overlay without changing its visual direction so white text meets WCAG AA contrast.
- Check the homepage’s remaining muted and overlay text combinations for AA contrast.

## Validation
- Compare mobile Lighthouse/PageSpeed-relevant metrics before and after on the local production output where available.
- Verify the browser selects the 640px hero at a mobile viewport and does not request the original PNG.
- Verify the hero is preloaded, remains the LCP candidate, and has no lazy-loading delay.
- Check desktop and mobile screenshots for visual parity and layout stability.
- Visit representative public, legal, authentication, memorial, and dashboard routes to confirm lazy route loading works.
- Confirm the final build is error-free.

## Assumptions
- “All other images” means repository-managed images and browser attributes for dynamic user images; existing remote uploads will not be recompressed or replaced.
- The visual design, content, section order, and interactions remain unchanged.
