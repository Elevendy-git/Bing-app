# Bing App Components

An independent Bing App component workspace. It borrows the reusable project conventions from
`x3-design/one-copilot-start-template`—co-located stories and tests, CSS Modules, semantic
`--gnrc-*` tokens, Consumer taxonomy, and token validation—without importing or merging that
repository's application code.

## Current components

- `Consumer/Bing Search Box`
  - Figma Light: `C2 Bing App — MAI Style Alignment`, node `775:47824`
  - Figma Dark: `C2 Bing App — MAI Style Alignment`, node `775:44984`
  - Exact root size: `358 × 64 px`
  - Implemented state: default/rest only, with Light and Dark appearance tokens
- `Consumer/Feed Card`
  - Figma component set: `C3 Bing App — MAI Style Alignment`, node `3572:5631`
  - Exact root width: `342 px`
  - Variants: Single card, Watch, Multi-cards, Ads card, and Loading
- `Consumer/App Footer`
  - Figma layout: `C2 Bing App — MAI Style Alignment`, node `849:24365`
  - Exact root size: `390 × 52 px`
  - Home and Collections are interactive; Copilot is a fixed, non-interactive visual

## Commands

```bash
npm install
npm run storybook
npm run typecheck
npm test
npm run build
npm run build-storybook
```

## Team workflow

1. Pull the latest `main` branch and create a component branch:

   ```bash
   git switch main
   git pull
   git switch -c feature/component-name
   ```

2. Keep each component, story, styles, test, and assets together under
   `src/components/ComponentName/`.
3. Include the exact Figma node in the Storybook documentation.
4. Before opening a pull request, run:

   ```bash
   npm run typecheck
   npm test
   npm run build-storybook
   ```

5. Push the branch and open a pull request. GitHub Actions verifies every pull request.

Changes merged to `main` are automatically built and deployed through GitHub Pages. In the
repository settings, choose **Settings → Pages → Build and deployment → GitHub Actions** once
after creating the repository.
