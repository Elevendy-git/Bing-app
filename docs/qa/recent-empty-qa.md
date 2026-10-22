# Recent empty state

Source: C2 `970:13652`, 390 × 844. Implemented on the existing 402 × 874 mobile
canvas, with device-owned corner clipping and the shared 62 px status / 34 px
bottom safe areas.

- Original Figma illustration downloaded intact to `src/screens/Recent/assets/empty-recent.png`
  (2048 × 2048 RGBA PNG, 3,460,042 bytes). Browser confirms it loads at 128 × 128,
  x=137, y=333; centered with the text across the full canvas.
- Title x=40, y=485, 322 × 26, weight 650; body x=40, y=519, 322 × 22.
  Illustration/text gap 24 px; title/body gap 8 px. Exact Figma copy retained.
- Existing `AppSearchBox`: x=16, y=62, 370 × 48; no additional empty-page inset.
- Existing `NewTabButton`: x=326, y=712, 56 × 56, 20 px from the content edge
  and footer. Shared `ScreenFooter`, Copilot artwork and iOS chrome remain in place.
- Content scrollHeight/clientHeight both 670: no unintended empty-page scrolling.
- Light and Dark visually reviewed in Key screens → Recent → Recent · Empty.
  Dark follows the workbench theme; no separate dark illustration was supplied.
- New tab opens Search with the keyboard and blank input. Back restores the
  same empty page and focus to New tab. Home/Recent navigation retains empty data.
- Empty detection checks all four collections. Populated and partial states retain
  the existing overview; browser-origin footer callbacks remain available.
- 31 tests passed across Recent, prototype navigation, Tabs, History, Bookmark
  and SERP flows. Production build, TypeScript and token contract passed.
- No browser console errors observed. Existing Vite chunk-size and test-runner
  deprecation / jsdom scrollTo warnings are outside this screen change.

The prototype's existing search submission flow does not yet persist new browsing
activity into Recent. This pre-existing data behavior was not changed by the empty
screen implementation.
