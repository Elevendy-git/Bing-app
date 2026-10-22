# Profile

Figma C3 `jSAgWuDdxjDuK404ZVNDbb`: initials `3467:9216`, photo `3587:13894`, signed out `3825:20937`.

- `Profile` composes the shared Avatar, AppHeader, AppList, AppListCard, and IOSStatusBar components.
- Pass `account={null}` for signed out. With an account, use its photo when available, otherwise the first Unicode character of its trimmed name, then email. A failed photo falls back to that initial.
- Prototype defaults use the design's sample account and Rewards numbers; no authentication service is connected.
- Homepage's avatar opens Profile with the existing navigation motion. Returning preserves Homepage and its scroll position. Key screens includes all three presets.
- History and Bookmarks open the existing screens, sharing their data and supported actions with Recent. Back returns to the original Profile entry and scroll position, including after a bookmark folder or Search from empty History.
- Notification, account, Rewards, Downloads, and Preferences destinations are visual only until their flows are provided. No app footer or home indicator is added to this screen.
- The 393 × 852 design adapts to the workbench's 402 × 874 device with 20 px content insets and fill-width cards. Screens have no intrinsic corner clipping. Appearance follows the workbench.

## Assets

`assets/` contains the original Figma photo, background ellipse, and three Rewards SVGs. The gift-card illustration is a 2× PNG export of the complete artwork subtree `3825:21332`, including its original image fills, highlights, shadows, and glow. It renders at its original 130 × 122 logical size. The full-screen reference captures are QA references only.
