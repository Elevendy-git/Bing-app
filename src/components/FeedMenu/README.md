# Feed menu

Figma C3 file `jSAgWuDdxjDuK404ZVNDbb`, nodes
[`3587:10791`](https://www.figma.com/design/jSAgWuDdxjDuK404ZVNDbb/?node-id=3587-10791)
and [`3587:11176`](https://www.figma.com/design/jSAgWuDdxjDuK404ZVNDbb/?node-id=3587-11176).

Reuses MenuList's material, typography and row rendering through its sheet layout.
The sheet has seven 48 px rows, a 20 px handle area, 4 px list top padding and
the shared 34 px bottom safe area: 394 px total. Corners are 34 px at the top and
58 px at the bottom; the screen host adds the scrim and 6 px outside insets.

`target` supplies the publisher/topic name and identity. `followed` selects
Follow/Unfollow plus the matching original icons. Only `onToggleFollow` is
wired; other rows remain passive until their flows are specified.
Library displays one overview with Type and State controls and global appearance.

Original assets exported by the Figma MCP on 2026-10-22:

| Local file | Source screen | Figma asset URL |
| --- | --- | --- |
| ../MenuList/assets/share.svg | 3587:10791 | https://www.figma.com/api/mcp/asset/fc96bae3-1c98-42ae-b57c-6eec92315984.svg |
| assets/like.svg | 3587:10791 | https://www.figma.com/api/mcp/asset/b91a540d-dc0e-4d05-ad26-284cbda7e24d.svg |
| assets/dislike.svg | 3587:10791 | https://www.figma.com/api/mcp/asset/a706cfb5-26a8-4ccc-83bd-e3a802c90963.svg |
| assets/follow.svg | 3587:10791 | https://www.figma.com/api/mcp/asset/cecc8fc6-e3db-4d7b-a3f0-679374494f81.svg |
| assets/block.svg | 3587:10791 | https://www.figma.com/api/mcp/asset/772bfa15-456f-4d6f-91dc-1df5018639fd.svg |
| assets/preferences.svg | 3587:10791 | https://www.figma.com/api/mcp/asset/0fbaa73d-0b10-4c7f-af12-ea297ac36bed.svg |
| ../MenuList/assets/feedback.svg | 3587:10791 | https://www.figma.com/api/mcp/asset/aa663541-2e82-4f85-88e8-2a5b830e8de8.svg |
| assets/unfollow.svg | 3587:11176 | https://www.figma.com/api/mcp/asset/896c12c1-51e9-44da-a7bb-313992ec90df.svg |
| assets/preferences-following.svg | 3587:11176 | https://www.figma.com/api/mcp/asset/36e14681-6c4e-4745-bae3-0bee10ce48dc.svg |

Share and Feedback are byte-identical to the existing MenuList assets and are
reused. Every icon occupies its original 24 × 24 view box; CSS masks inherit
the shared foreground color for light/dark appearance. Temporary asset URLs
are provenance only and are not requested by the app at runtime.
