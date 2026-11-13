# SAI.YIP — CSS Responsiveness Audit

**Files audited:**
- `css/base.css` (134 lines)
- `css/pages.css` (304 lines)
- `css/components.css` (101 lines)

**Viewport meta:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />` — present and correct.

---

## SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 8 | Fixed pixel widths/heights that overflow or break layout on mobile |
| 🟡 High | 12 | Fixed positioning, font sizes, or grid columns that degrade on small screens |
| 🟢 Medium | 14 | Fixed values with partial mobile overrides but gaps between breakpoints |
| ℹ️ Info | 5 | z-index stacking, missing breakpoints < 320px, vh vs dvh |

Total issues found: **39**

---

## 🔴 CRITICAL — Will break or overflow on mobile

### 1. Fixed width/height on `.brand-name` — `base.css:38`
```css
.brand-name { width: 231.34375px; height: 26.890625px; }
```
**Problem:** Extremely precise fixed pixel dimensions. On screens narrower than ~240px this overflows. Mobile override at line 60 only applies at `max-width: 640px` and sets to `auto`, but there is no override between 320–640px for very small phones.

**Fix:**
```css
.brand-name { width: auto; height: auto; min-width: 0; }
@media (max-width: 640px) {
  .brand-name { width: auto; height: auto; font-size: 16px; }
}
```

### 2. Fixed width/height on `#kvadBadge` — `components.css:55`
```css
#kvadBadge { width: 113.484375px; height: 35px; }
```
**Problem:** Overly precise fixed width (113.484375px). On phones narrower than ~120px this overflows the topbar row. `base.css:59` overrides at `max-width: 640px` to `width: auto; min-width: 50px`, but 50px min-width is still tight on 320px screens with other topbar buttons present.

**Fix:**
```css
#kvadBadge { width: auto; min-width: 0; padding: 4px 8px; }
@media (max-width: 420px) {
  #kvadBadge { min-width: 40px; padding: 3px 6px; font-size: .7rem; }
}
```

### 3. Fixed `min-height: 42px` on `.nav button` — `base.css:47`
```css
.nav button { min-height: 42px; }
```
**Problem:** 42px touch target is large on small screens. The `max-width: 640px` override (line 54) changes padding/font-size but **not** `min-height`. The `max-width: 420px` override (line 81) also doesn't touch `min-height`. On a 320px-wide phone with 8 nav buttons, each at 60px min-width + gaps, this overflows horizontally.

**Fix:**
```css
.nav button { min-height: 40px; }
@media (max-width: 640px) {
  .nav button { min-height: 36px; min-width: 55px; padding: 6px 8px; font-size: .85rem; }
}
@media (max-width: 420px) {
  .nav button { min-height: 34px; min-width: 48px; padding: 5px 6px; font-size: .8rem; }
}
```

### 4. Fixed `height: 60px` on `.nav` — `base.css:49`
```css
.nav { height: 60px; ... }
```
**Problem:** Fixed 60px height. Override at line 55 sets 48px at `max-width: 640px`, but no override at 420px. On small phones this wastes vertical space.

**Fix:**
```css
@media (max-width: 420px) {
  .nav { height: 44px; }
}
```

### 5. Fixed `left: 15px` on `.topbar` — `base.css:34`
```css
.topbar { position: sticky; top: 1px; z-index: 20; left: 15px; }
```
**Problem:** `left: 15px` fixed offset on a sticky element. On mobile, `base.css:56` overrides to `left: 0; right: 0` at `max-width: 640px`, but the desktop `left: 15px` creates an inconsistent sticky position that doesn't span full width on tablets between 640–1024px.

**Fix:**
```css
.topbar { position: sticky; top: 1px; z-index: 20; left: 0; right: 0; }
@media (min-width: 640px) {
  .topbar { left: auto; right: auto; } /* if centering is needed on desktop */
}
```

### 6. Fixed `width: 210px` on `.splash-bar` — `pages.css:26`
```css
.splash-bar { width: 210px; height: 8px; ... }
```
**Problem:** Fixed 210px width. On phones narrower than ~250px (including padding) this overflows the viewport. No media query override exists.

**Fix:**
```css
.splash-bar { width: 100%; max-width: 210px; height: 8px; ... }
```

### 7. Fixed `width: 150px; height: 150px` on `.donut` — `components.css:77`
```css
.donut { width: 150px; height: 150px; }
```
**Problem:** 150px square SVG on mobile takes nearly half the screen width on a 320px phone. No media query override exists.

**Fix:**
```css
.donut { width: 120px; height: 120px; }
@media (max-width: 420px) {
  .donut { width: 100px; height: 100px; }
}
.donut-num { font-size: 20px; }
@media (max-width: 420px) {
  .donut-num { font-size: 16px; }
}
```

### 8. Fixed `position: fixed; bottom: 16px` on `.buddy` — `components.css:93`
```css
.buddy { position: fixed; left: 0; bottom: 16px; z-index: 60; width: 48px; height: 48px; }
```
**Problem:** Fixed-position mascot at bottom-left with `z-index: 60`. On small screens this permanently occupies screen real estate, can overlap the footer and bottom sheet content, and there is no media query to hide, shrink, or reposition it on mobile. `z-index: 60` is higher than `.topbar` (z-index 20), so it can cover navigation on mobile.

**Fix:**
```css
.buddy { position: fixed; left: 0; bottom: 16px; z-index: 60; width: 44px; height: 44px; }
@media (max-width: 420px) {
  .buddy { width: 40px; height: 40px; bottom: 12px; z-index: 30; }
}
@media (max-width: 360px) {
  .buddy { display: none; } /* hide on very small screens to preserve space */
}
```

---

## 🟡 HIGH — Degrades noticeably on small screens

### 9. Fixed `width: 220px; height: 220px; right: -60px` on `.hero::before` — `pages.css:13`
```css
.hero::before { width: 220px; height: 220px; right: -60px; top: -70px; ... }
```
**Problem:** Decorative blob with negative `right: -60px`. `overflow: hidden` on `.hero` (line 8) clips it, but on narrow screens the blob extends far outside the hero bounds and is wasted. No mobile override.

**Fix:**
```css
.hero::before { width: 140px; height: 140px; right: -30px; top: -40px; ... }
@media (max-width: 640px) {
  .hero::before { width: 100px; height: 100px; right: -20px; top: -20px; }
}
```

### 10. Fixed `width: 180px; height: 180px; left: 30%; bottom: -90px` on `.hero::after` — `pages.css:14`
```css
.hero::after { width: 180px; height: 180px; left: 30%; bottom: -90px; ... }
```
**Problem:** Same as above — fixed-size decorative blob with absolute positioning, no mobile override.

**Fix:**
```css
.hero::after { width: 120px; height: 120px; left: 20%; bottom: -60px; ... }
@media (max-width: 640px) {
  .hero::after { width: 80px; height: 80px; left: 15%; bottom: -40px; }
}
```

### 11. Fixed `font-size: 34px` on `.splash-name` — `pages.css:24`
```css
.splash-name { font-size: 34px; ... }
```
**Problem:** 34px is very large for a splash screen on mobile. No media query override. On a 320px-wide phone this wraps or dominates the screen.

**Fix:**
```css
.splash-name { font-size: clamp(24px, 10vw, 34px); }
```

### 12. Fixed `font-size: 42px` on `.scan-off .big` — `pages.css:107`
```css
.scan-off .big { font-size: 42px; }
```
**Problem:** 42px icon/text in the scan-off state. No mobile override. Could overflow the scan-frame on small screens.

**Fix:**
```css
.scan-off .big { font-size: 32px; }
@media (max-width: 420px) {
  .scan-off .big { font-size: 28px; }
}
```

### 13. Fixed `grid-template-columns: 64px 1fr` on `.stop` — `pages.css:57`
```css
.stop { position: relative; display: grid; grid-template-columns: 64px 1fr; ... }
```
**Problem:** Fixed 64px pin column. The layout only changes at `min-width: 760px` (pages.css:119-126) to a 3-column layout. On mobile screens between 320–760px, the 64px fixed column consumes ~20% of screen width. No `max-width` override to collapse to a single column or reduce the pin width.

**Fix:**
```css
.stop { grid-template-columns: 48px 1fr; }
@media (max-width: 420px) {
  .stop { grid-template-columns: 40px 1fr; }
}
@media (min-width: 760px) {
  .stop { grid-template-columns: 1fr 72px 1fr; }
}
```

### 14. Fixed `left: 31px` on `.road::before` — `pages.css:56`
```css
.road::before { content: ""; position: absolute; left: 31px; top: 10px; bottom: 10px; width: 4px; ... }
```
**Problem:** Absolute connector line at `left: 31px`. On mobile with the 64px pin column this is centered, but if the pin width is reduced (see #13) this becomes misaligned. No `max-width` override.

**Fix:**
```css
.road::before { left: 24px; top: 10px; bottom: 10px; width: 4px; ... }
@media (max-width: 420px) {
  .road::before { left: 20px; }
}
@media (min-width: 760px) {
  .road::before { left: 50%; transform: translateX(-50%); }
}
```

### 15. Fixed `font-size: 28px` on `.intro-name` — `pages.css:142` and `base.css` area
```css
.intro-name { font-size: 28px; ... }
```
**Problem:** Fixed 28px font. Mobile overrides exist at `pages.css:287` (24px at max-width 640px) and `pages.css:300` (22px at max-width 420px), but between 420–640px on small phones (e.g., iPhone SE at 375px) 24px may still be too large for the intro section.

**Fix:**
```css
.intro-name { font-size: clamp(20px, 6vw, 28px); }
```

### 16. Fixed `min-width: 150px` on `.intro-actions button` — `pages.css:148`
```css
.intro-actions button { min-width: 150px; padding: 12px 20px; font-size: 15px; }
```
**Problem:** Fixed 150px min-width on action buttons. `pages.css:291` overrides to `width: 100%; max-width: 280px` at `max-width: 640px`, but the desktop `min-width: 150px` applies on tablets (640–1024px) where it may cause wrapping issues in the flex container.

**Fix:**
```css
.intro-actions button { min-width: 130px; padding: 12px 18px; font-size: 14px; flex: 1 1 auto; }
@media (max-width: 640px) {
  .intro-actions button { width: 100%; max-width: 280px; min-width: 0; }
}
```

### 17. Fixed `font-size: 20px` on `.intro-subtitle` — `pages.css:153`
```css
.intro-subtitle { font-size: 20px; ... }
```
**Problem:** Fixed 20px font size, no mobile override. On small screens this is large for a subtitle.

**Fix:**
```css
.intro-subtitle { font-size: clamp(16px, 4vw, 20px); }
```

### 18. Fixed `font-size: 20px` on `.intro-quota-time` — `pages.css:173`
```css
.intro-quota-time { font-size: 20px; ... }
```
**Problem:** Fixed 20px, no mobile override.

**Fix:**
```css
.intro-quota-time { font-size: clamp(16px, 4vw, 20px); }
```

### 19. Fixed `max-width: 766px` on `.login-card` — `pages.css:18`
```css
.login-card { max-width: 766px; width: auto; height: auto; ... }
```
**Problem:** Fixed max-width of 766px. `pages.css:36` sets `max-width: 480px` for the login route but only via `body[data-route="login"]` selector, not a media query. On phones narrower than 480px, the card still has 480px max-width with no side padding reduction, potentially causing tight fit.

**Fix:**
```css
.login-card { max-width: 100%; width: auto; height: auto; ... }
body[data-route="login"] #page { width: 100%; max-width: 480px; padding: 0 16px; }
```

### 20. Fixed `height: 320px` on `.game-iframe-wrap` — `pages.css:211`
```css
.game-iframe-wrap { position: relative; height: 320px; ... }
```
**Problem:** Fixed 320px height. Media queries exist at `pages.css:223` (420px at min-width 680px) and `pages.css:229` (260px at max-width 679px). However, at `max-width: 420px` there is no specific override — it falls through to 260px which may still be too tall on very small phones in portrait.

**Fix:**
```css
@media (max-width: 420px) {
  .game-iframe-wrap { height: 200px; }
}
```

### 21. Fixed `height: 320px` on `.video-player-wrap` — `pages.css:265`
```css
.video-player-wrap { position: relative; height: 320px; ... }
```
**Problem:** Same as #20. Media queries at `pages.css:271` (420px at min-width 680px) and `pages.css:275` (260px at max-width 679px). No specific override at `max-width: 420px`.

**Fix:**
```css
@media (max-width: 420px) {
  .video-player-wrap { height: 200px; }
}
```

### 22. Fixed `width: 88px; height: 88px` on `.splash-logo` — `pages.css:23`
```css
.splash-logo { width: 88px; height: 88px; ... }
```
**Problem:** Fixed 88px logo, no mobile override. On a 320px phone this takes ~27% of screen width. Acceptable but not optimal.

**Fix:**
```css
.splash-logo { width: 72px; height: 72px; }
@media (max-width: 420px) {
  .splash-logo { width: 64px; height: 64px; }
}
```

### 23. Fixed `width: 44px; height: 44px` on `.leg-icon` — `pages.css:53`
```css
.leg-icon { width: 44px; height: 44px; ... }
```
**Problem:** Fixed 44px icon in journey roadmap. No mobile override. Combined with the 64px pin column (#13), this consumes significant horizontal space on mobile.

**Fix:**
```css
.leg-icon { width: 40px; height: 40px; font-size: 20px; }
@media (max-width: 420px) {
  .leg-icon { width: 36px; height: 36px; font-size: 18px; }
}
```

### 24. Fixed `width: 44px; height: 44px` on `.pin-dot` — `pages.css:60`
```css
.pin-dot { width: 44px; height: 44px; ... }
```
**Problem:** Fixed 44px pin dot. No mobile override. Duplicated at line 71 with slightly different styles.

**Fix:**
```css
.pin-dot { width: 40px; height: 40px; font-size: 18px; }
@media (max-width: 420px) {
  .pin-dot { width: 36px; height: 36px; font-size: 16px; }
}
```

### 25. Fixed `min-height: 55vh` on `#page` — `pages.css:19`
```css
#page { min-height: 55vh; }
```
**Problem:** Uses `vh` instead of `dvh`. On mobile browsers, `vh` includes the URL bar area, so `55vh` can be taller than the visible viewport, causing unexpected scrolling or content being hidden behind browser chrome. `base.css:18` correctly uses `100dvh` for `body`, but `#page` doesn't.

**Fix:**
```css
#page { min-height: 55dvh; }
```

---

## 🟢 MEDIUM — Has partial mobile overrides but gaps remain

### 26. Fixed `width: 42px; height: 42px` on `.brand img` — `base.css:37`
```css
.brand img { width: 42px; height: 42px; ... }
```
**Problem:** Fixed 42px brand image. Override at `base.css:61` sets 32px at `max-width: 640px`. Gap: no override at `max-width: 420px` where 32px might still be slightly large next to the brand name.

**Fix:**
```css
@media (max-width: 420px) {
  .brand img { width: 28px; height: 28px; }
}
```

### 27. Fixed `width: 56px; height: 56px` on `.intro-brand img` — `pages.css:141`
```css
.intro-brand img { width: 56px; height: 56px; ... }
```
**Problem:** Fixed 56px. Overrides at `pages.css:286` (48px at max-width 640px) and `pages.css:299` (40px at max-width 420px). Reasonable coverage, but `left: auto; top: auto; position: static;` at line 286 suggests the desktop version uses absolute positioning that should be reviewed.

**Fix:**
```css
.intro-brand img { width: 56px; height: 56px; position: static; }
```

### 28. Fixed `padding: 30px 20px` on `.intro-hero` — `pages.css:136`
```css
.intro-hero { position: relative; ... padding: 30px 20px; ... }
```
**Problem:** Fixed 30px vertical / 20px horizontal padding. Overrides at `pages.css:282` (24px 16px at max-width 640px) and `pages.css:296` (20px 14px at max-width 420px). Coverage is decent, but `min-height: auto` at line 136 is invalid CSS (auto is the default).

**Fix:**
```css
.intro-hero { padding: 30px 20px; min-height: 0; }
```

### 29. Fixed `padding: 16px` on `.card` — `components.css:5`
```css
.card { padding: 16px; ... }
```
**Problem:** Fixed 16px padding on all cards. On very small screens (320px) this leaves little inner width. No media query override.

**Fix:**
```css
.card { padding: 14px; }
@media (max-width: 420px) {
  .card { padding: 12px; }
}
```

### 30. Fixed `width: 320px` max on `.grid-head .skillbar` — `components.css:45`
```css
.grid-head .skillbar { max-width: 320px; }
```
**Problem:** Fixed max-width of 320px. On a 320px phone this is edge-to-edge with no margin, could touch screen edges. No mobile override.

**Fix:**
```css
.grid-head .skillbar { max-width: 100%; width: 280px; }
@media (max-width: 420px) {
  .grid-head .skillbar { width: 100%; max-width: none; }
}
```

### 31. Fixed `grid-template-columns: 170px 1fr` on `.progress-top` — `components.css:75`
```css
@media (min-width: 640px) { .progress-top { grid-template-columns: 170px 1fr; } }
```
**Problem:** Below 640px this defaults to single column (good). But `170px` fixed column on tablets between 640–768px may be too wide relative to content. No max-width override.

**Fix:**
```css
@media (min-width: 640px) {
  .progress-top { grid-template-columns: minmax(150px, 170px) 1fr; }
}
```

### 32. Fixed `width: 56px; height: 56px` on `.cc-icon` — `components.css:34`
```css
.cc-icon { width: 38px; height: 38px; ... }
```
**Problem:** Fixed 38px icon in challenge cards. No mobile override. Combined with fixed padding on cards (#29) this consumes horizontal space.

**Fix:**
```css
.cc-icon { width: 36px; height: 36px; font-size: 18px; }
@media (max-width: 420px) {
  .cc-icon { width: 32px; height: 32px; font-size: 16px; }
}
```

### 33. Fixed `font-size: 24px` on `.donut-num` — `components.css:80`
```css
.donut-num { font-size: 24px; ... }
```
**Problem:** Fixed 24px text inside a 150px donut (#7). On smaller donuts this will overflow. Covered by the `.donut` fix above.

**Fix:** See #7.

### 34. Fixed `width: 48px; height: 48px` on `.game-modal-badge` — `pages.css:206`
```css
.game-modal-badge { width: 48px; height: 48px; ... }
```
**Problem:** Fixed 48px badge in modal header. No mobile override. Modals use `padding: 24px` (pages.css:203) which on a 320px phone leaves only ~272px width, so a 48px badge plus title is tight.

**Fix:**
```css
.game-modal-badge { width: 44px; height: 44px; font-size: 24px; }
@media (max-width: 420px) {
  .game-modal-overlay { padding: 16px; }
  .game-modal-badge { width: 40px; height: 40px; font-size: 22px; }
}
```

### 35. Fixed `width: 36px; height: 36px` on `.game-modal-close` — `pages.css:208`
```css
.game-modal-close { width: 36px; height: 36px; ... }
```
**Problem:** Fixed 36px close button. 36px is below the 44px touch target (`--sai-touch`) defined in tokens.css. On mobile this is hard to tap.

**Fix:**
```css
.game-modal-close { width: 44px; height: 44px; min-height: 44px; font-size: 18px; }
@media (max-width: 420px) {
  .game-modal-close { width: 44px; height: 44px; } /* ensure touch target */
}
```

### 36. Fixed `width: 56px; height: 56px` on `.video-play` — `pages.css:250`
```css
.video-play { width: 56px; height: 56px; ... }
```
**Problem:** Fixed 56px play overlay on video thumbnails. No mobile override. On small thumbnail cards this covers a large portion of the image.

**Fix:**
```css
.video-play { width: 48px; height: 48px; font-size: 20px; }
@media (max-width: 420px) {
  .video-play { width: 44px; height: 44px; font-size: 18px; }
}
```

### 37. Fixed `position: absolute; bottom: 54px; left: -8px; min-width: 130px` on `.buddy-bubble` — `components.css:100`
```css
.buddy-bubble { position: absolute; bottom: 54px; left: -8px; min-width: 130px; max-width: 190px; ... }
```
**Problem:** `left: -8px` can push the bubble off the left edge of the screen. `min-width: 130px` is wide for small phones. No mobile override to reposition or constrain.

**Fix:**
```css
.buddy-bubble { position: absolute; bottom: 54px; left: 50%; transform: translateX(-50%); min-width: 120px; max-width: 200px; ... }
@media (max-width: 420px) {
  .buddy-bubble { left: 8px; right: 8px; transform: none; min-width: auto; max-width: none; font-size: 12px; }
}
```

---

## ℹ️ INFO — Stacking context, breakpoints, and units

### 38. z-index stacking — Multiple files
| Element | File:Line | z-index |
|---------|-----------|---------|
| `.topbar` | base.css:34 | 20 |
| `.skip` | base.css:23 | 50 |
| `.buddy` | components.css:93 | 60 |
| `#splash` | pages.css:20 | 100 |
| `.game-modal-overlay` | pages.css:203 | 1000 |
| `.video-modal-overlay` | pages.css:259 | 1000 |

**Problem:** `.buddy` at z-index 60 sits above `.topbar` (z-index 20). On mobile, the fixed-position buddy can cover the topbar/nav. Modals at z-index 1000 correctly cover everything, but there's no dynamic z-index management. The buddy should have a lower z-index than the topbar on mobile, or be hidden.

**Fix:** Reduce buddy z-index on mobile (see #8 fix).

### 39. No media queries below 320px — All files
**Problem:** The smallest breakpoint used is `max-width: 420px`. Devices like the iPhone SE (375px wide) and some Android Go phones (320px or narrower) fall between 320–420px where several fixed values still apply. No breakpoint targets `< 320px` or `max-width: 360px`.

**Fix:** Add a `max-width: 360px` breakpoint to base.css for extreme small screens:
```css
@media (max-width: 360px) {
  .nav button { min-width: 44px; padding: 4px 6px; font-size: .75rem; }
  .brand-name { font-size: 13px; }
  .splash-name { font-size: 22px; }
  .scan-off .big { font-size: 24px; }
  .donut { width: 80px; height: 80px; }
  .buddy { display: none; }
  .buddy-bubble { font-size: 11px; padding: 6px 8px; }
}
```

---

## RECOMMENDED MEDIA QUERY BREAKPOINTS TO ADD

The CSS currently uses these breakpoints:
- `max-width: 640px` (base.css, pages.css)
- `max-width: 420px` (base.css, pages.css)
- `max-width: 679px` (base.css grid, pages.css)
- `min-width: 680px` (pages.css)
- `min-width: 720px` (pages.css scan-frame)
- `min-width: 760px` (pages.css road, hero)
- `min-width: 480px` (pages.css scan-actions)

**Suggested additions:**
- `max-width: 360px` — very small phones
- `min-width: 380px` — small phone landscape
- `(orientation: landscape) and (max-height: 500px)` already exists for scan-frame — good pattern, extend to other full-height elements

---

## QUICK FIX SUMMARY (top 8 to apply first)

| # | File:Line | Issue | Fix in one line |
|---|-----------|-------|-----------------|
| 1 | base.css:38 | `.brand-name` fixed width/height | `width: auto; height: auto;` |
| 2 | components.css:55 | `#kvadBadge` fixed 113.48px width | `width: auto; min-width: 0;` |
| 3 | base.css:47 | `.nav button` fixed 42px min-height | Reduce to 36px on mobile |
| 4 | base.css:49 | `.nav` fixed 60px height | Reduce to 44px on mobile |
| 5 | pages.css:26 | `.splash-bar` fixed 210px width | `width: 100%; max-width: 210px;` |
| 6 | components.css:77 | `.donut` fixed 150px size | `width: 120px; height: 120px;` + mobile override |
| 7 | components.css:93 | `.buddy` fixed position z-index 60 | Reduce z-index, hide on < 360px |
| 8 | components.css:100 | `.buddy-bubble` left: -8px overflow | `left: 50%; transform: translateX(-50%);` |
