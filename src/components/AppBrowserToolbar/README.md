# App Browser Toolbar

Source: [Shareout SERP, 1:20518](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20518),
footer instance `1:20520`. The 52 px row contains five equally sized slots:
Back, Forward, Home, Copilot and Recent. `IABFooter` composes this row with the
surface and divider for screens and Library. Screens supply the iOS bottom safe
area and home indicator separately.

Back/Forward/Home reuse the Fluent 24 px Code Connect icons. Recent reuses the
existing `CollectionsEmptyIcon`. Copilot uses the unchanged original 22 × 22
Figma SVG exported from `I1:20520;3634:76232`; it is rendered as a theme-aware mask
at its intrinsic size. No icon was traced or reconstructed.

`recentSelected` follows [Shareout 1:20634](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20634):
the shared Collections icon switches to its filled variant with the host screen's
selected color. `backLabel` and `navigationLabel` describe the current destination;
Recent supplies “Back to search results” and returns to the originating query.

Callbacks opt into buttons for the supplied navigation flow. Without a callback,
items are passive artwork; unavailable Forward has 35% opacity. Copilot remains
passive until its flow is specified. The complete Library example is in
Navigation → IAB Footer → Overview. Colors inherit the workbench appearance.
