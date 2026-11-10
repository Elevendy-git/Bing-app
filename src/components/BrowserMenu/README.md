# Browser Menu

`BrowserMenu` reuses `MenuList layout="sheet"`, including the Feed Menu material,
handle, row sizing and bottom safe area. Its separate Cancel footer uses the same
surface and typography. The host owns the backdrop, presentation and focus restoration.

`variant="serp"` supplies Refresh, Copy link, Open in default browser, Share,
Search settings, Feedback and Find on page. `variant="webpage"` omits Search
settings. Both include Cancel. Shared Share, Settings and Feedback use the existing
Figma `MenuIcon` assets; the remaining icons use Fluent.

`onAction` receives a `BrowserMenuAction`; it does not automatically dismiss the
sheet. `onDismiss` handles Cancel and Escape. `autoFocus` focuses the first enabled
menu action, including Cancel when only dismissal is supplied. Without callbacks,
the corresponding controls are passive. No loading or navigation behavior is
implemented by the component.

Library → Overlays → Menu exposes Search results and Webpage in the existing
Type configurator. Both are passive sheet specimens. Motion and browser actions
belong to the consuming screen; no extra appearance control is added here.
