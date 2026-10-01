# Swipe Rush

A 30-second Canvas arcade game with semantic HTML screens and Pointer Events controls. Vite provides development and production builds; the game has no runtime dependencies.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the **Local** URL printed by Vite. It starts at http://localhost:5173 and selects the next available port if that port is busy. To request a specific port, use `npm run dev -- --port 5180`.

```sh
npm run build    # Production files in dist/
npm run preview  # Preview the production build (default port 4173)
```

Deploy the generated `dist/` directory to any static host.

## Play

Hold the primary mouse button, touch, or press a pen and drag across products. Each product earns 10 points. A continuous stroke earns another 5 points per product after the first, awarded on release. Bombs deduct 20 points, with a zero floor. Misses have no penalty. Hidden tabs pause the round.

## Campaign customization

- **Title and copy:** `index.html` (including the document title and accessible game label).
- **Colors:** CSS variables in `style.css` and product colors in `config.js`.
- **Product assets:** `drawProduct` in `art.js`. The current assets are hand-drawn Canvas vectors, with no external downloads.
- **Product effect:** set a product's `effect` to `open` in `config.js` for a top-opening package treatment; `slice` is the default.
- **Round and scoring constants:** `config.js`.

## Verification

```sh
npm test
```

Eleven automated checks cover fast segment collisions, hover rejection, single scoring per product, pointer capture/release, mouse/touch/pen event handling, pointer cancellation, combos, bomb penalties, timer completion, restart cleanup, hidden-tab pausing, coordinate conversion after resizing, and reachable launch arcs. Integration checks run the production game module in a simulated DOM/Canvas environment.

Desktop, portrait, and landscape browser screenshots were inspected. Physical touch/pen devices and complete live gesture playthroughs were not verified. The restricted build environment prevented starting a local HTTP server; the visual checks used Chrome with local-file access.
