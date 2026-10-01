# Swipe Rush

A 30-second Canvas arcade game with semantic HTML screens and Pointer Events controls. Vite provides development and production builds; the game has no runtime dependencies.

## Run

Requires Node.js 22.12+ (including the Wrangler deployment CLI).

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

## Publish to Cloudflare

Use `npm run deploy` to test, build, and upload the game to Cloudflare's CDN.
Wrangler prints the deployed URL after a successful upload.
See [the deployment guide](docs/deployment.md) for account setup, credentials,
custom domains, CI, verification, and rollback.
Forward [this short setup README](README-CLOUDFLARE.md) to the Cloudflare owner.

```sh
cp .env.example .env.deploy
# Fill in credentials and confirm the Worker name and URL settings in .env.deploy.
npm run deploy:check # Tests, build, and dry run; no credentials or upload needed
npm run deploy       # Publishes to the configured Cloudflare account
```

## Play

Hold the primary mouse button, touch, or press a pen and drag across products. Each product earns 10 points. A continuous stroke earns another 5 points per product after the first, awarded on release. Bombs deduct 20 points, with a zero floor. Misses have no penalty. Hidden tabs pause the round.

## Branding and products

Styled for [gamesCore_](https://thegamescore.com/), with navy surfaces, violet accents, its Recoleta wordmark font, and subtle `gc_` product marks. The brand font is self-hosted in `public/fonts/` from the brand’s public CDN.

Eight products: sneaker, cosmetic bottle, package, headphones, gamepad, cap, takeaway cup, and tote bag.

## Campaign customization

- **Title and copy:** `index.html` (including the document title and accessible game label).
- **Colors:** CSS variables in `style.css`, plus `BRAND` and product colors in `config.js`.
- **Product assets:** `drawProduct` in `art.js`. The current assets are hand-drawn Canvas vectors, with no external downloads.
- **Product effect:** set a product's `effect` to `open` in `config.js` for a top-opening package treatment; `slice` is the default.
- **Round and scoring constants:** `config.js`.

## Verification

```sh
npm test
```

Eleven automated checks cover fast segment collisions, hover rejection, single scoring per product, pointer capture/release, mouse/touch/pen event handling, pointer cancellation, combos, bomb penalties, timer completion, restart cleanup, hidden-tab pausing, coordinate conversion after resizing, and reachable launch arcs. Integration checks run the production game module in a simulated DOM/Canvas environment.

Browser checks cover real mouse capture and dragging, emulated touch swipes and cancellation, bomb penalties, completion, restart, orientation changes, unchanged card dimensions, and a full 30-second round against the unmodified game. Desktop, portrait, and landscape screenshots were inspected. Physical touch/pen hardware remains unverified.

To repeat the browser suite, run Vite and a Chrome instance with remote debugging, then pass the browser WebSocket endpoint and the Vite URL:

```sh
npm run test:browser -- ws://127.0.0.1:PORT/devtools/browser/ID http://localhost:5174/
```

The browser suite instruments a separate test tab for deterministic scoring checks and then reloads the unchanged production module for the timed playthrough. It does not add test hooks to the shipped game.
