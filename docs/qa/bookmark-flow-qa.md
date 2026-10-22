# Bookmark flow QA

Figma: `yClrtwNrFJhE7W5waPRmkv`, nodes `1:20779`, `1:20783`, `1:20788`, `1:20664`, `103:19815`.
The user confirmed that the destructive item in `1:20788` is **Delete**, not Clear all history.

## Delivered

- Recent → Bookmark View → full list → Travel to Paris folder → back, retaining both parent scroll positions.
- Page menu: Feedback. Item menu: Share / Delete, anchored to the selected row and flipped above rows near the footer.
- Delete removes only the selected saved entry; Recent's preview shares the same state. Folder deletion updates its count. History, Copilot history and Tabs remain independent.
- Shared AppHeader, AppList/AppListCard, MenuList, ScreenFooter, iOS status bar and home indicator; existing iOS motion defaults and reduced-motion support.
- Four Bookmark key screens; Bookmark and Bookmark item menu variants in Library's existing Type control.
- Share and Feedback remain passive pending their supplied flows. Article / Best movies have no supplied contents and remain passive. The node named “Bookmark-empty” at `103:19815` is implemented as the populated Travel to Paris folder shown in its screenshot.
- Demo folder-count text is preserved from Figma. The supplied Travel count (4) differs from its supplied visible rows (five sites plus Article); these remain design fixtures, not backend counts.

## Validation

- Browser canvas: 402 × 874; status bar 62; app header 56; list starts at y=128; 20 px side insets produce a 362 px card.
- Rows: 58 px content + 8 px divider slot between entries; card padding 4 px. All list cards, including folders, omit the last row's divider and its slot.
- Page flyout: 238 × 56, top 112, right 12. Spotify flyout: 238 × 96, top ≈375, right 32. Bottom-row flyout remained above the footer.
- Figma Share SVG downloaded locally, native 24 × 24 mask. New Yorker source PNG downloaded locally, 400 × 400 source rendered in a 32 × 32 slot. Reused Medium and Spotify assets loaded successfully; Spotify SVG retains its native 33 × 33 size inside the 32 px slot. Fluent Folder/Globe/Chevron and trailing More icons reuse the mapped library components.
- Browser checked the root/folder screens, both menus, global dark appearance, actual single deletion, Recent synchronization and Library type switching. No browser console errors.
- Bookmark flow tests pass: navigation/focus/scroll restoration, menu cancellation, passive key screens, root deletion and Recent synchronization, folder deletion and independent duplicate URLs.
- SERP flow tests pass, including Bookmark/folder round-trip retaining Recent's browser footer.
- Existing History, Recent, prototype, Tabs and workbench regression suites passed during this change.
- `npm run build` and `git diff --check` pass. Existing large-JS-chunk build advisory remains.
