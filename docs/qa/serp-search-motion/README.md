# SERP ↔ Search self-check

Checked on 2026-10-22 in the running workbench, iPhone 18 Pro (402 × 874).

- The measured SERP field is 332 × 48; Search is 370 × 56, at x=16/y=62.
- Field height/trailing space and keyboard translation share the 420 ms
  navigation timeline. `motion-samples.json` records live entry/exit samples;
  the normalized field and keyboard progress agree in both directions.
- Rapid entry → Back → entry keeps the field moving from its current value,
  restores editing focus, and leaves the keyboard open.
- Checked Homepage submission and SERP editing/return. The result field uses
  `cursor: text` and retains the query. Dark mode uses the matching source theme;
  restored the workbench to System afterward.
- Regression coverage checks zoom-normalized geometry, preserved result document
  on cancel, new documents for submissions including repeated queries, activity,
  existing Homepage/Recent navigation and loading/error/retry behavior.
- 77 tests passed across 13 relevant files. Production build and token checks passed.
  Reduced-motion branches use the existing instant preset; no OS preference was changed.

`serp.png` and `search.png` are full workbench captures. `search-boxes.png`
places their header crops side by side for inspection; it is not an animation.
Apple references and the distinction between native guidance and prototype
timings are recorded in [motion.md](../../motion.md#serp--search).
