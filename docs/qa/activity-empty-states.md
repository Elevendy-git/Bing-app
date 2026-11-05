# Activity empty states — 26 October 2026

Figma source: C2 Bing App (`vA59dRO3b38EcRK1JY8N6w`).

| Screen | Node | Illustration | Copy |
| --- | --- | --- | --- |
| Recent | 970:13652 | Existing activity artwork, original asset verified | Your activity will appear here / Start searching to build your activity |
| Tabs | 931:57662 | Updated to the supplied Card Checkmark original | Add tab to start browsing / Tap the “+” button to open new tab |
| History | 970:12842 | Existing Search Progress artwork, original asset verified | Add tab to start browsing / Your browsing and search history will appear here. / Search now |
| Bookmark | 970:12778 | Added the supplied Bookmark Toggle On original | Bookmarks appear here / Add a bookmark to easily find your favorite websites again |

The History title really says “Add tab to start browsing” in the supplied design.
It is preserved as supplied. Full-frame History context timed out; the screenshot,
instance layout and high-fidelity illustration/title/subtext child contexts were
read to verify the existing state. The existing Search now control is retained.

All original artwork is local. Recent and History assets matched the downloaded
Figma originals by SHA-256. No Figma asset URL is used at runtime.

## Adaptation and verification

- Adapted the 390 × 844 frames to the existing 402 × 874 phone model. Empty
  artwork stays 128 × 128, centered horizontally. Text fills the canvas with
  40 px side insets. Illustration/text gap is 24 px; title/body gap is 8 px.
- Preserved the supplied canvas-center offsets: −0.5 px for Recent and −3.5 px
  for Tabs, History and Bookmark. Keyboard and Footer height do not recenter them.
- Kept the previously requested absence of an App Footer on secondary pages;
  Recent retains its Footer. Tabs' New tab button remains above the bottom safe
  area. The status bar, device mask, system indicator and shared font stack are
  existing workbench components rather than changes to those systems.
- Bookmark now shows its empty state at the root and in empty folders, including
  after deleting the last saved item. Added Bookmark · Empty to Key screens.
- Browser verification covered all four states in light and dark, decoded local
  artwork, exact 128 px geometry, 20/26 headings at weight 650, 16/22 body copy,
  24/8 spacing, and Bookmark's two-line body at 322 px width.
- Verified Recent's artwork remains stationary when the keyboard opens; verified
  empty Bookmark through Profile and History's Search now → Search → Back flow.
- No browser page errors. The shared Segoe Sans/Segoe UI font fallback and native
  status/indicator adaptation predate this change; no claim of identical original
  Figma font binaries or 390 px device chrome is made.

Validation passed: 23 targeted tests across Bookmark, Tabs, History and Recent
keyboard flows; `npm run build`; `git diff --check`. The build retains its existing
large-JavaScript-chunk advisory. Browser QA script: `/tmp/activity-empty-states-qa.mjs`.
