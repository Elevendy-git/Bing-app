/** Figma iOS 27 kit: component 12887:20848 and original artwork 12887:20871. */
export const PREVIEW_DEVICE = {
  name: "iPhone 18 Pro",
  screenWidth: 402,
  screenHeight: 874,
  shellWidth: 450,
  shellHeight: 920,
  shellSrc: new URL("./assets/iphone-18-pro-black-portrait.png", import.meta.url).href,
  screenMaskSrc: new URL("./assets/iphone-18-pro-screen-mask.png", import.meta.url).href,
} as const;

/** Device clipping belongs to preview containers, never to product screens. */
export const PREVIEW_SCREEN_MASK_STYLE = {
  maskImage: `url("${PREVIEW_DEVICE.screenMaskSrc}")`,
  maskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskImage: `url("${PREVIEW_DEVICE.screenMaskSrc}")`,
  WebkitMaskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
} as const;
