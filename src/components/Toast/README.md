# Toast

Figma C3 file `jSAgWuDdxjDuK404ZVNDbb`:
[`3577:21385`](https://www.figma.com/design/jSAgWuDdxjDuK404ZVNDbb/?node-id=3577-21385)
and [`3577:21801`](https://www.figma.com/design/jSAgWuDdxjDuK404ZVNDbb/?node-id=3577-21801).
Notification node: `3577:22116`.

Reusable success notification with message, optional action and dismissal callback.
The 24 px CheckmarkCircle24Filled uses the mapped Fluent component and Figma's
`#19b17c` success color. Typography is 550 weight, 16/22, using the project's
functional font stack. Surface and foreground follow global appearance.

The component fills its container. The 358 px reference width belongs to a 390 px
canvas with 16 px side insets; it is not a fixed component width. Homepage and
Library use the current device width with 16 px side insets (370 px at 402 px).
Minimum height is 52 px, corners 16 px, and internal padding 12/16 px.
Homepage positions it 16 px above the footer and owns entrance/exit motion.

When `onDismiss` is provided it dismisses after 5 seconds; hover/focus pauses
dismissal and grants a fresh interval on leaving. Without it, the Library and
Key screens stay static. The action is passive unless `onAction` is supplied.
The component announces updates through a polite status region.
