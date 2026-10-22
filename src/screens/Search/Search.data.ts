import { TRENDING_THUMBNAIL, YML_FAVICON } from "../../components/AppList/AppList.assets";

const asset = (name: string) => new URL(`./assets/${name}`, import.meta.url).href;

export const QUICK_FEATURES = [
  { label: "Video Creator", icon: asset("video-creator.svg") },
  { label: "AI Writer", icon: asset("ai-writer.svg") },
  { label: "Translator", icon: asset("translator.svg") },
] as const;

export interface SearchHistoryItem { id: string; query: string }

// Figma history fixtures, including repeated visits; these are not account history.
export const RECENT_SEARCHES: readonly SearchHistoryItem[] = [
  "The Daily Mirror", "What‘s entertainment", "Facebook", "McDonald",
  "Facebook", "The Daily Mirror", "What‘s entertainment", "McDonald",
].map((query, index) => ({ id: `history-${index + 1}`, query }));

export const RECOMMENDATIONS = [
  { title: "World Athletics Launches Biennial Event", image: asset("athletics.png") },
  { title: "Coolorado To offer In-person Voting...", image: YML_FAVICON },
  { title: "Justin Jefferson, Vikings Contract long ...", image: asset("jefferson.png") },
] as const;

export const TRENDING_SEARCHES = [
  { title: "Sharks at Capitals", image: TRENDING_THUMBNAIL },
  { title: "Ballon d’Or 2023", image: asset("ballon-dor.png") },
  { title: "Lilie James Sydney", image: asset("lilie-james.png") },
  { title: "Matthew Perry", image: asset("matthew-perry.png") },
  { title: "James Wan on Amber Heard’s role", image: asset("james-wan.png") },
  { title: "Sharks at Capitals", image: TRENDING_THUMBNAIL },
] as const;
