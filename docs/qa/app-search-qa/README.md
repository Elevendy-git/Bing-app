# App Search Box verification — 2026-10-14

Sources: C2 file `vA59dRO3b38EcRK1JY8N6w`, Search page `402:18101` and
Recent page `1117:73172`. All three states from each component set were checked
against the MCP code and reference render.

| Check | Search page | Recent page |
| --- | --- | --- |
| Library size | 358 × 56 | 358 × 48 |
| Padding | 12 px | 6 px vertical / 10 px horizontal |
| Text | 16 / 24, weight 400 | 14 / 20, weight 450 |
| Leading slot | 36 × 36, x=12, y=10 | 36 × 36, x=10, y=6 |
| Input clear slot | 36 × 36, x=310, y=10 | 36 × 36, x=312, y=6 |
| Icon size | 24 × 24 | 24 × 24 |
| Focus/Input cursor | 1 × 21, static | 1 × 21, static |

Search Zero Input and Focus retain camera and microphone in 44 × 36 slots.
Input replaces them with Dismiss Circle; Recent adds Dismiss Circle only in
Input. Text and cursor placement, placeholder colors, black input text, 5% black
fill and circular shape were checked in Light. Dark inherits existing Consumer
colors and keeps text, cursor and icons visible; no separate Dark Figma node was
provided. Font rendering uses the existing Segoe Sans fallback stack.

Code Connect icons reuse Fluent ChevronLeft24Regular, Camera24Regular,
SlideSearch24Regular and DismissCircle24Filled. Local `copilot-mic.svg` is
838 bytes with intrinsic 24 × 24 geometry; `caret.svg` is 286 bytes at 1 × 21.
Both Figma cursor exports have identical SHA-256 hashes and share one local
file. Browser masks resolve these assets locally at their intrinsic sizes.

Side state selectors switch each preview independently through all three
states. Artwork is inert and has no input/button/tab stops or click state
changes. The desktop preview uses the existing right panel; narrow layout uses
the existing stacked configurator. Homepage remains the existing BingSearchBox.

Recent composes the component at x=16, y=62, 361 × 48 on the 393 × 852 canvas.
At scrollTop 0 and 454 (the end), the fixed scroll boundary is y=118 and the gap
below search remains 8 px. The page keeps its passive search behavior.

Validation: 79 tests across 15 files passed. Production build, TypeScript,
token contract (118 tokens / 28 CSS files) and whitespace checks passed.
