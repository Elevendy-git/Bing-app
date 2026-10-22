import { AppFooter, AppHeader, AppList, BingSearchBox, FeedCard, GlanceCard, GlanceCardGroup, Switcher, TabsCard } from "./components";
import { MSN_FEED_MOCK } from "./components/FeedCard/FeedCard.mocks";
import type { PreviewComponentGroup } from "./components/PreviewWorkbench";
import { IOSStatusBarOverview, IOSKeyboardOverview, IOSHomeIndicatorOverview } from "./components/IOSNative/IOSNative.examples";
import { SportsGlanceStates } from "./components/GlanceCard/GlanceCard.examples";
import { AvatarVariants } from "./components/Avatar/Avatar.examples";
import { LIST_VARIANTS, ListCardConfigurator } from "./components/AppList/AppList.examples";
import { TabsCardOverview } from "./components/TabsCard/TabsCard.examples";
import { AppSearchBoxExample, IABSearchBoxExample } from "./components/AppSearchBox/AppSearchBox.examples";
import { SwitcherOverview, SWITCHER_VARIANTS } from "./components/Switcher/Switcher.examples";
import { IABFooterOverview } from "./components/IABFooter/IABFooter.examples";
import { MenuListOverview } from "./components/MenuList/MenuList.examples";
import { FeedMenuOverview } from "./components/FeedMenu/FeedMenu.examples";
import { ToastOverview } from "./components/Toast/Toast.examples";

// Category order is defined in previewTypes; registration order controls items within each category.
export const previewComponentGroups: readonly PreviewComponentGroup[] = [
  {
    id: "header", title: "Header", category: "navigation",
    items: [{ id: "default", title: "Default", content: <AppHeader /> }],
  },
  {
    id: "footer", title: "Footer", category: "navigation",
    items: [
      { id: "app-footer", title: "App Footer", keywords: ["Default"], interactive: true, content: <AppFooter /> },
      { id: "iab-footer", title: "IAB Footer", interactive: true,
        keywords: ["In-app browser", "Browser toolbar", "SERP", "Recent", "Selected", "Default"],
        content: <IABFooterOverview /> },
    ],
  },
  {
    id: "search-box", title: "Bing Search Box", category: "inputs",
    items: [
      { id: "default", title: "Homepage", content: <BingSearchBox /> },
      { id: "search-page", title: "Search page", fullWidth: true, hasControls: true,
        keywords: ["Zero Input", "Focus", "Input", "Ask anything"], content: <AppSearchBoxExample variant="search" /> },
      { id: "recent-page", title: "Recent page", fullWidth: true, hasControls: true,
        keywords: ["Zero Input", "Focus", "Input", "Activity", "Tabs", "Bookmarks"], content: <AppSearchBoxExample variant="recent" /> },
      { id: "serp", title: "Search results", fullWidth: true, hasControls: true,
        keywords: ["SERP", "IAB", "Bing web", "Loading", "Loaded", "Progress"], content: <IABSearchBoxExample /> },
    ],
  },
  {
    id: "switcher", title: "Switcher", category: "inputs",
    overviewItemId: "overview",
    items: [
      { id: "overview", title: "Switcher", fullWidth: true, interactive: true,
        keywords: ["Overview", "Switch", "Toggle", "Off", "On", "Rest", "Pressed", "Disabled"], content: <SwitcherOverview /> },
      ...SWITCHER_VARIANTS.map(({ id, title, selected, state }) => ({
        id, title, keywords: ["Switch", "Toggle"], content: <Switcher selected={selected} state={state} />,
      })),
    ],
  },
  {
    id: "avatar", title: "Avatar", category: "content",
    items: [
      { id: "default", title: "Default · 40 px", keywords: ["Not signed in", "Initials", "Image", "Private mode"], fullWidth: true, content: <AvatarVariants /> },
      { id: "large", title: "Large · 64 px", keywords: ["Not signed in", "Initials", "Image"], fullWidth: true, content: <AvatarVariants size="large" /> },
    ],
  },
  {
    id: "list", title: "List", category: "content",
    overviewItemId: "card",
    items: [
      {
        id: "card", title: "List Card", fullWidth: true, hasControls: true,
        keywords: ["Overview", "Single list", "Multi list", ...LIST_VARIANTS.map(([title]) => title)],
        content: <ListCardConfigurator />,
      },
      ...([...LIST_VARIANTS, ["Section header", "section-header"]] as const).map(([title, id]) => ({
        id, title,
        content: <AppList variant={id} showDivider={false} />,
      })),
    ],
  },
  {
    id: "glance-card", title: "Glance Card", category: "content",
    overviewItemId: "group",
    items: [
      { id: "group", title: "Card group", keywords: ["Overview"], content: <GlanceCardGroup /> },
      { id: "rewards", title: "Rewards", content: <GlanceCard variant="rewards" /> },
      { id: "create", title: "Create with AI", content: <GlanceCard variant="create" /> },
      { id: "money", title: "Money", content: <GlanceCard variant="money" /> },
      { id: "settings", title: "Settings", content: <GlanceCard variant="settings" /> },
      { id: "sports", title: "Sports", keywords: ["Cold start", "Upcoming", "Live", "Final"], fullWidth: true, content: <SportsGlanceStates /> },
    ],
  },
  {
    id: "feed-card", title: "Feed Card", category: "content",
    items: [
      { id: "single", title: "Single card", content: <FeedCard variant="single" {...MSN_FEED_MOCK.single} /> },
      { id: "watch", title: "Watch", content: <FeedCard variant="watch" {...MSN_FEED_MOCK.watch} /> },
      { id: "multi", title: "Multi-cards", interactive: true, content: <FeedCard variant="multi" slides={MSN_FEED_MOCK.multi} /> },
      { id: "ad", title: "Ads card", content: <FeedCard variant="ad" {...MSN_FEED_MOCK.ad} /> },
      { id: "loading", title: "Loading", content: <FeedCard variant="loading" /> },
    ],
  },
  {
    id: "tabs", title: "Tabs Card", category: "content",
    overviewItemId: "overview",
    items: [
      { id: "overview", title: "Tabs card", fullWidth: true, hasControls: true, keywords: ["Overview", "Browser", "Rest", "Selected", "Select", "Close"], content: <TabsCardOverview /> },
      { id: "rest", title: "Rest", content: <TabsCard /> },
      { id: "selected", title: "Selected", content: <TabsCard selected /> },
    ],
  },
  {
    id: "menu", title: "Menu", category: "overlays", overviewItemId: "overview",
    items: [{ id: "overview", title: "Menu", fullWidth: true, hasControls: true,
      keywords: ["Dialog", "Flyout", "Tabs", "History", "Tab settings", "Feedback", "Close all tabs", "Clear all history", "Delete"],
      content: <MenuListOverview /> }],
  },
  {
    id: "feed-menu", title: "Feed Menu", category: "overlays", overviewItemId: "overview",
    items: [{ id: "overview", title: "Bottom sheet", fullWidth: true, hasControls: true,
      keywords: ["Feed", "Follow", "Unfollow", "Publisher", "Topic"], content: <FeedMenuOverview /> }],
  },
  {
    id: "toast", title: "Toast", category: "overlays", overviewItemId: "overview",
    items: [{ id: "overview", title: "Toast", fullWidth: true, hasControls: true,
      keywords: ["Notification", "Followed", "Unfollowed", "Undo", "Success"], content: <ToastOverview /> }],
  },
  {
    id: "ios-status-bar", title: "iOS Status Bar", category: "os-native",
    overviewItemId: "overview",
    items: [{ id: "overview", title: "Status Bar", fullWidth: true, hasControls: true,
      keywords: ["iOS 27", "Apple", "Status", "Time", "Battery", "Live Activity", "Light", "Dark"], content: <IOSStatusBarOverview /> }],
  },
  {
    id: "ios-keyboard", title: "iOS Keyboard", category: "os-native",
    overviewItemId: "overview",
    items: [{ id: "overview", title: "Keyboard", fullWidth: true, hasControls: true,
      keywords: ["iOS 27", "Apple", "Uppercase", "Lowercase", "Numbers", "Symbols", "Search", "Done", "Light", "Dark"], content: <IOSKeyboardOverview /> }],
  },
  {
    id: "ios-home-indicator", title: "iOS Home Indicator", category: "os-native",
    overviewItemId: "overview",
    items: [{ id: "overview", title: "Home Indicator", fullWidth: true, hasControls: true,
      keywords: ["iOS 27", "Apple", "Safe area", "Bottom", "Light", "Dark"], content: <IOSHomeIndicatorOverview /> }],
  },
];
