import { createContext, useContext } from "react";

const PreviewActivityContext = createContext(true);

/** A retained prototype can pause capture while another workbench view is shown. */
export const PreviewActivityProvider = PreviewActivityContext.Provider;

/** Standalone screens and expanded Key screens are active by default. */
export function usePreviewActivity(): boolean {
  return useContext(PreviewActivityContext);
}
