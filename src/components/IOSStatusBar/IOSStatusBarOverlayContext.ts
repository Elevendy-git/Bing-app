import { createContext } from "react";

/** Each phone frame owns its layer; multiple previews never share a global portal. */
export const IOSStatusBarOverlayContext = createContext<HTMLElement | null>(null);
