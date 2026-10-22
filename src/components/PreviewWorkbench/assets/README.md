# iPhone 18 Pro frame

Source: [iOS and iPadOS 27, node 12887:20848](https://www.figma.com/design/MxaoGSDUvLJ58OvsXmRTLY/?node-id=12887-20848).
Read using Figma MCP on 2026-10-14.

- Component: `Color=Black`, 402 × 874 logical content bounds.
- Artwork: `12887:20871`, `iPhone 18 Pro - Black - Portrait`, 450 × 920,
  positioned at x−24/y−23 relative to the content bounds.
- `iphone-18-pro-black-portrait.png`: unmodified original transparent image,
  1350 × 2760 (@3x). Displayed at 450 × 920 before workbench scaling.
- `iphone-18-pro-screen-mask.png`: device-only alpha mask, 1206 × 2622.
  It follows the original image's enclosed screen opening, cropped from
  `(72, 69)` to `(1278, 2691)` at @3x. Original edge antialiasing is preserved.
  The camera island is filled in this layout mask; the original artwork renders
  the camera on top in Prototype. The original artwork is not edited.

The Figma component itself has cornerRadius=0, cornerSmoothing=0 and
clipsContent=false. Its rounded physical edges are part of the image, not a
screen-level radius token. The same device mask is used by PhonePreview and
Key screens (thumbnails/enlarged views); product screens remain rectangular.
Standalone Library components do not inherit a phone's corner clipping.
