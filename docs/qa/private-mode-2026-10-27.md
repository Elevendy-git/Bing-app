# Private mode — 27 October 2026

Source: [C2 Private mode, 970:14091](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=970-14091).
The Recent references are 970:27118 (Home entry) and 970:27787 (SERP entry).

- Private Homepage retains the existing content and uses the shared private avatar.
- Private Search retains its shared input, switcher, keyboard and suggestions.
- Recent shows the private explanation and Turn off action, hiding normal
  collections, search, New tab and the normal empty-state illustration.
- Entry from Home uses App Footer; entry from SERP/IAB uses IAB Footer. Back
  restores the same retained document and its privacy mode.
- Turn off restores the untouched normal collections, clears the Recent filter
  and focuses content without presenting the keyboard. An empty normal
  collection returns to the existing empty state.
- Private results own their header palette. Their queries, webpage visits and
  snapshots never enter normal activity. Enabling private mode in Search opened
  from Tabs or History returns to the Recent gate rather than the normal list.
- Key screens includes passive Recent private specimens for both footer types.
  The underlined Learn more copy has no supplied destination, so no L2 flow was
  added.

## Verification

- 77 tests across 11 relevant files passed, including five dedicated private
  flow tests. Production build, TypeScript/token checks and `git diff --check`
  passed.
- Chrome pointer checks covered normal search, enabling private mode, private
  Homepage, both Recent entry paths, Turn off, private SERP, opening an IAB link,
  retaining the same webpage on Back, and restoring only normal activity.
- Repeated the flow in dark appearance with reduced motion at a smaller
  workbench viewport. No page errors occurred. The scaled iframe pointer check
  used actual rendered coordinates because Playwright's iframe locator omitted
  the ancestor scale.
- Both new Key screen variants were enlarged and checked for the correct
  footer, a loaded 64 px asset, and passive actions.
- The 402 × 874 canvas keeps 24 px explanatory text insets, 64 px artwork,
  16/24 px group gaps, a 93 × 48 button, and the 52 + 34 px footer/safe area.

No animation parameters changed. Browser response fixtures isolate app flow
verification from third-party content. This verifies prototype activity
isolation, not browser-level incognito storage or security. Temporary browser
scripts and screenshots remain under `/tmp`, outside the repository.
