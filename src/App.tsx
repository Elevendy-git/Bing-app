import { PreviewWorkbench } from "@/components/PreviewWorkbench";
import { BingAppPrototype } from "./screens/BingAppPrototype";
import { Search } from "./screens/Search";
import { SERP } from "./screens/SERP";
import { Recent } from "./screens/Recent";
import { Tabs } from "./screens/Tabs";
import { History } from "./screens/History";
import { Bookmark } from "./screens/Bookmark";
import { PROFILE_ACCOUNTS } from "./screens/Profile";
import { Homepage } from "./screens/Homepage";
import { previewComponentGroups } from "./previewCatalog";

export function App() {
  return (
    <PreviewWorkbench
      title="Homepage"
      componentGroups={previewComponentGroups}
      screens={[
        { id: "homepage", title: "Homepage", group: "Home", content: <BingAppPrototype /> },
        { id: "homepage-scrolled", title: "Homepage · Scrolled", group: "Home", content: <BingAppPrototype initialHomeState="scrolled" /> },
        { id: "homepage-private", title: "Homepage · InPrivate", group: "Home", content: <BingAppPrototype initialPrivateMode /> },
        { id: "feed-menu", title: "Feed · Menu", group: "Home", content: <Homepage initialState="scrolled" initialFeedOverlay="menu" /> },
        { id: "feed-followed", title: "Feed · Followed", group: "Home", content: <Homepage initialState="scrolled" initialFeedOverlay="followed-toast" /> },
        { id: "feed-unfollowed", title: "Feed · Unfollowed", group: "Home", content: <Homepage initialState="scrolled" initialFeedOverlay="unfollowed-toast" /> },
        { id: "feed-following-menu", title: "Feed · Following menu", group: "Home", content: <Homepage initialState="scrolled" initialFeedOverlay="following-menu" /> },
        { id: "profile-photo", title: "Profile · Photo", group: "Profile", content: <BingAppPrototype initialPage="profile" /> },
        { id: "profile-initials", title: "Profile · Initials", group: "Profile", content: <BingAppPrototype initialPage="profile" account={PROFILE_ACCOUNTS.initials} /> },
        { id: "profile-signed-out", title: "Profile · Signed out", group: "Profile", content: <BingAppPrototype initialPage="profile" account={null} /> },
        { id: "recent", title: "Recent", group: "Recent", content: <BingAppPrototype initialPage="recent" /> },
        { id: "recent-from-serp", title: "Recent · From SERP", group: "Recent", content: <Recent footerVariant="browser" /> },
        { id: "recent-empty", title: "Recent · Empty", group: "Recent", content: <BingAppPrototype initialPage="recent" initialRecentState="empty" /> },
        { id: "tabs", title: "Tabs", group: "Tabs", content: <Tabs /> },
        { id: "tabs-menu", title: "Tabs · Menu", group: "Tabs", content: <Tabs initialMenuOpen /> },
        { id: "tabs-empty", title: "Tabs · Empty", group: "Tabs", content: <Tabs tabs={[]} /> },
        { id: "history", title: "History", group: "History", content: <History /> },
        { id: "history-item-menu", title: "History · Delete", group: "History", content: <History initialMenu="item" /> },
        { id: "history-menu", title: "History · Menu", group: "History", content: <History initialMenu="page" /> },
        { id: "history-empty", title: "History · Empty", group: "History", content: <History entries={[]} /> },
        { id: "bookmark", title: "Bookmark", group: "Bookmark", content: <Bookmark /> },
        { id: "bookmark-menu", title: "Bookmark · Menu", group: "Bookmark", content: <Bookmark initialMenu="page" /> },
        { id: "bookmark-item-menu", title: "Bookmark · Item menu", group: "Bookmark", content: <Bookmark initialMenu="item" /> },
        { id: "bookmark-folder", title: "Bookmark · Travel to Paris", group: "Bookmark", content: <Bookmark initialFolderId="travel" /> },
        { id: "search-zero-input", title: "Search · Zero input", group: "Search", content: <Search /> },
        { id: "search-keyboard", title: "Search · Keyboard", group: "Search", content: <Search initialState="keyboard" /> },
        { id: "search-input", title: "Search · Input", group: "Search", content: <Search initialState="input" /> },
        { id: "search-private", title: "Search · InPrivate", group: "Search", content: <Search initialPrivateMode /> },
        { id: "search-private-keyboard", title: "Search · InPrivate · Keyboard", group: "Search", content: <Search initialPrivateMode initialState="keyboard" /> },
        { id: "search-private-input", title: "Search · InPrivate · Input", group: "Search", content: <Search initialPrivateMode initialState="input" /> },
        { id: "serp-weather", title: "SERP · Weather", group: "Search results", content: <SERP /> },
      ]}
    >
      <BingAppPrototype timeSource="system" initialRecentState="empty" feedSource="msn" discoverySource="live" />
    </PreviewWorkbench>
  );
}
