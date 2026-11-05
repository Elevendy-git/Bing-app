# Voice Search

Figma C3 light flow `3035:26507`, dark flow `3408:10065`. Adapted from
393 × 852 to the workbench's 402 × 874 iPhone 18 Pro canvas. Device clipping
belongs to the workbench shell. Key screens expose Listening, Input, Try again,
Offline and Speech language; all remain passive and follow global appearance.

The Homepage, empty Search field and SERP microphone open a full-screen Voice
Search modal. `useSpeechRecognition` owns the real browser recognizer and is
also shared by keyboard dictation. It starts only in the user's activation
stack. Connecting precedes the browser's real listening event, interim text
updates in place, and a successful recognition end submits final text once.
Home creates a new tab; SERP reuses the active tab. Private searches never enter
normal activity. Cancel preserves the underlying page, document, draft and
scroll position.

The globe opens `VoiceLanguageSheet`. Search, selection and Done are functional;
the 12 displayed language choices come from the supplied Figma panel. Default
English requests `en-US`; the general English row requests `en`. The browser's
speech service determines actual locale support. Opening the sheet cancels the
old session; Done starts a new session in the selected locale. Escape first
dismisses an active search keyboard, then completes the picker. No unrequested
sheet detents or drag gestures are added.

Recognition requires a supporting browser, microphone access and usually a
network connection. Unsupported, permission, microphone, no-speech, offline and
connection errors are explicit; no transcript is fabricated. Backgrounding or
unmounting cancels capture, and late callbacks cannot submit a query. Returning
to the foreground requires an explicit retry. While recognition is listening,
`useVoiceAudioMeter` independently analyses local microphone audio and supplies
12 band levels to `VoiceWaveform`. The same bars spring from their original
8 px dots to at most 24 px and settle in silence; they persist across the
listening-to-transcription layout change. Metering failure leaves them static
without affecting recognition. No audio is stored, uploaded or played by the
visual analyser. Covers/exits freeze the drawn pose and stop its separate stream.
Leaving the workbench Prototype view cancels capture rather than recording in
a retained hidden preview. Reduce Motion skips metering and keeps static dots;
Key screens preserve their supplied static states. Web code does not claim to
reproduce native iOS haptics or exact Siri waveform parameters.

Light background PNG, dark blob SVG, offline illustration and retry icon are
local Figma assets. The dark page gradient uses the resolved paint stops from
`3408:11487` because its raster export resolves light-mode fallback colors.
The language sheet was inspected through the read-only Plugin API after
`get_design_context` timed out on its outer frame.

Motion sources and prototype parameters are documented in `docs/motion.md`.
