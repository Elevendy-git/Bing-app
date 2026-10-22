import type { ReactNode } from "react";

export type PreviewAppearance = "system" | "light" | "dark";
export type PreviewView = "prototype" | "keyscreens" | "library";

export const PREVIEW_VIEWS = [
  { value: "prototype", label: "Prototype" },
  { value: "keyscreens", label: "Key screens" },
  { value: "library", label: "Library" },
] as const;

export const PREVIEW_APPEARANCES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export interface PreviewItem {
  id: string;
  title: string;
  content: ReactNode;
  /** Use the full grid width and let content fill the available preview width. */
  fullWidth?: boolean;
  /** Library examples with side controls must wrap artwork in PreviewConfigurator. */
  hasControls?: boolean;
  /** Explicitly allow interaction on the artwork (Footer, Multi-cards, Switcher overview). */
  interactive?: boolean;
  /** Searchable states included inside a combined preview. */
  keywords?: readonly string[];
}

export interface PreviewScreen extends PreviewItem {
  /** Related screens share a collapsible gallery section, in registration order. */
  group?: string;
}

export interface PreviewComponentGroup {
  id: string;
  title: string;
  category: PreviewLibraryCategory;
  /** Display this item in an Overview above the remaining item grid. */
  overviewItemId?: string;
  items: readonly PreviewItem[];
}

export const PREVIEW_LIBRARY_CATEGORIES = [
  { id: "navigation", label: "Navigation" },
  { id: "inputs", label: "Inputs" },
  { id: "content", label: "Content" },
  { id: "overlays", label: "Overlays" },
  { id: "os-native", label: "OS Native" },
] as const;

export type PreviewLibraryCategory = typeof PREVIEW_LIBRARY_CATEGORIES[number]["id"];

export type PreviewLibrarySelection =
  | { kind: "all" }
  | { kind: "category"; id: PreviewLibraryCategory }
  | { kind: "group"; id: string };
