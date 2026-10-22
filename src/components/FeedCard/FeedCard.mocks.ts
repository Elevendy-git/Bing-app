import type { FeedCardItem } from "./FeedCard";
import {
  FEED_CARD_AD_IMAGE,
  FEED_CARD_MULTI_IMAGE,
  FEED_CARD_SINGLE_IMAGE,
  FEED_CARD_WATCH_IMAGE,
} from "./FeedCard.assets";
import msnFeedMock from "./msn-feed.mock.json";

type MockStory = "single" | "watch" | "multi" | "ad";
type MockImageAsset = "single" | "watch" | "multi" | "ad";

interface MockPublisherLogo {
  text: string;
  background: string;
  foreground: string;
}

interface MsnMockItem {
  id: string;
  story: MockStory;
  imageAsset: MockImageAsset;
  imageAlt: string;
  publisher: string;
  publisherLogo: MockPublisherLogo;
  publishedAt: string;
  elapsedTime: string;
  title: string;
}

interface MsnMockPayload {
  source: string;
  generatedAt: string;
  items: MsnMockItem[];
}

const IMAGE_ASSETS: Record<MockImageAsset, string> = {
  single: FEED_CARD_SINGLE_IMAGE,
  watch: FEED_CARD_WATCH_IMAGE,
  multi: FEED_CARD_MULTI_IMAGE,
  ad: FEED_CARD_AD_IMAGE,
};

function createPublisherLogoDataUrl(logo: MockPublisherLogo) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" rx="10" fill="${logo.background}"/><text x="10" y="10.5" fill="${logo.foreground}" font-family="Arial,sans-serif" font-size="6" font-weight="700" text-anchor="middle" dominant-baseline="middle">${logo.text}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const payload = msnFeedMock as MsnMockPayload;
const mappedItems = payload.items.map((item) => ({
  story: item.story,
  card: {
    imageSrc: IMAGE_ASSETS[item.imageAsset],
    imageAlt: item.imageAlt,
    publisher: item.publisher,
    publisherLogoSrc: createPublisherLogoDataUrl(item.publisherLogo),
    elapsedTime: item.elapsedTime,
    title: item.title,
  } satisfies FeedCardItem,
}));

function firstCard(story: Exclude<MockStory, "multi">) {
  const match = mappedItems.find((item) => item.story === story);
  if (!match) throw new Error(`Missing ${story} item in MSN feed mock`);
  return match.card;
}

/** Deterministic, local-only MSN-shaped data used by the Library previews. */
export const MSN_FEED_MOCK = {
  source: payload.source,
  generatedAt: payload.generatedAt,
  single: firstCard("single"),
  watch: firstCard("watch"),
  multi: mappedItems.filter((item) => item.story === "multi").map((item) => item.card),
  ad: firstCard("ad"),
};
