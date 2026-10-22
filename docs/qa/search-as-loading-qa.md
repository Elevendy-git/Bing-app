# Search AS loading behavior

- Removed the synthetic entered-query row previously used while loading and on
  failures. Uncached input now waits for real results without a one-row card.
- Prefix edits/backspacing retain the complete previously returned list until the
  new response arrives. Replacing input with an unrelated query hides old results.
- Debounce reduced from 200 to 80 ms. Successful results are cached for 60 seconds
  in a bounded 20-query map owned by the mounted Search screen, with no storage.
- Live endpoint check for `12`: HTTP 200, five suggestions, approximately 1.1 s.
  Browser check: initial input has no card, then five live rows appear together;
  editing to `123` retains five rows while loading; returning to `12` immediately
  reuses five live rows. No console errors observed.
- Existing AS typography/icons/logos remain unchanged. Responses with fewer than
  five results are not padded. Request failures leave no AS card; Search submission
  remains available through the input/keyboard.
- 40 tests passed: parsing/proxy, cancellation/stale replies, cache expiry and
  mount isolation, network failures, private mode, keyboard and AS rendering.
  Production build, TypeScript, token contract and whitespace checks passed.
