/** Shared transport contract; this file is safe to import in the browser or Node. */
export const LIVE_BROWSER_PATH = "/api/live-browser";
export const LIVE_BROWSER_FRAME_MAGIC = 0x42465331; // ASCII "BFS1"
export const LIVE_BROWSER_FRAME_HEADER_BYTES = 12;

export type LiveBrowserClientMessage =
  | { type: "start"; query: string; width: number; height: number }
  | { type: "touch"; phase: "start" | "move" | "end" | "cancel"; x: number; y: number }
  | { type: "wheel"; x: number; y: number; deltaX: number; deltaY: number }
  | { type: "key"; key: string }
  | { type: "text"; value: string }
  | { type: "ack"; id: number }
  | { type: "pause"; paused: boolean }
  | { type: "end" }
  | { type: "resize"; width: number; height: number }
  | { type: "find"; query: string; index: number; requestId: number }
  | { type: "find-clear" };

export type LiveBrowserErrorCode = "busy" | "invalid-message" | "rate-limit" | "unavailable"
  | "expired" | "bandwidth-limit" | "inactive";

export type LiveBrowserServerMessage =
  | { type: "status"; state: "starting" | "loading" | "ready" }
  | { type: "ready"; width: number; height: number; sourceUrl: string; title: string; faviconUrl: string; fetchedAt: string }
  | { type: "error"; code: LiveBrowserErrorCode; message: string; retryable: boolean }
  | { type: "focus"; editable: boolean }
  | { type: "navigate"; url: string }
  | { type: "find-result"; query: string; total: number; index: number; requestId: number };

/**
 * Each binary WebSocket message is one JPEG frame prefixed with:
 * uint32BE magic (BFS1), uint32BE frame ID, uint16BE width, uint16BE height.
 * Decode/render the JPEG bytes after offset 12, then send {type:"ack",id}.
 * Coordinates are CSS pixels in this original viewport, regardless of CSS scale.
 * Streaming starts after the JSON "ready" message and document validation.
 * Search text never appears in the WebSocket URL.
 */
