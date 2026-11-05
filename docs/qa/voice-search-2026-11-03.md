# Voice Search QA — 3 November 2026

Design sources: C3 `3035:26507` and `3408:10065`; language panel `3221:8366`.
Phone canvas: 402 × 874. Global light/dark appearance; no per-screen theme control.

## Automated checks

- Voice Search baseline: 77 test files, 551 tests passed, including real recognizer lifecycle mocks,
  single submission, duplicate/late callback isolation, microphone ownership,
  cancellation, no-speech and permission errors, hidden-page cancellation,
  Home new-tab / SERP tab reuse, Search restoration and private activity isolation.
- Language selection/filtering, shared keyboard editing, Escape priority,
  focus restoration and hidden keyboard exclusion from Tab order passed.
- Passive Key screens never start recognition. Existing keyboard dictation
  regression checks passed after sharing the recognition hook.
- Token contract, TypeScript, production build and `git diff --check` passed.
- Speaking feedback checks cover real analyser levels, the noise gate, silence,
  stream cleanup, late permission results and AudioContext interruptions.
  Waveform checks cover retained bars through transcription, freezing while
  covered, resuming an interrupted settling with the same target, passive
  specimens and Reduce Motion. Root checks cover language-sheet exit races,
  leaving Prototype, ignored late recognition and focus preservation.
- After adding speaking feedback, the complete run covered 80 files: 585 tests
  passed and one existing feed freshness test hit a fixture race. It read its
  saved observer before the observer effect had attached. The test now waits
  for that observer; no feed product code changed. The new audio, waveform and
  active-preview cases all passed in that complete run. The corrected feed
  freshness file then passed all 7 cases separately.

## Browser checks

Checked the running workbench at `http://localhost:5174/` through its phone
prototype and passive enlarged Key screens:

- Light Listening, dark Input, light Offline and language layout matched the
  supplied artwork and spacing after adapting width and safe area.
- Corrected a dark asset-export fallback by reading the actual Figma gradient
  paints; removed the unused light-mode SVG, which contained an empty group.
- Home microphone opens Voice above the retained page. Closing releases the
  underlying page after the vertical exit. No console warnings/errors observed.
- Globe cancels the pending recognizer and opens language selection. Searching
  `Deu` filters to Deutsch and shows the shared keyboard; Escape dismisses it
  and restores sheet focus. Selecting Deutsch and Done restores Voice and globe
  focus after the sheet exit.
- Checked sound-driven feedback on the actual Voice Search component in a
  temporary phone harness labeled “QA · Controlled audio input”. Known levels
  grew the existing 12 dots smoothly from 8 to at most 24 px; Silence settled
  them back to 8 px. Listening and transcription retain the same bars, both
  appearances preserve the layout, and the background remains static.
  No console warnings/errors observed. The harness and temporary tab were
  removed after verification; captured preview frames use simulated levels,
  not a recording of the user's microphone.

Microphone permission was not granted during agent QA. Real audio capture and
service availability depend on the user's browser, permission and network;
recognition outcomes and real analyser lifecycle were verified with mocks.
Actual microphone amplitude responsiveness and concurrent browser recognition
compatibility were not tested with an authorized live recording. The visual
analyser is local, independent of recognition processing and optional; no
native haptics or exact Siri waveform parameters are claimed.
