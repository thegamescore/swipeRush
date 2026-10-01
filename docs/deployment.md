# Cloudflare deployment

Swipe Rush is a static Vite application. Wrangler uploads `dist/` to Cloudflare
Workers Static Assets, which serves the game, fonts, JavaScript, and CSS through
Cloudflare's network. No backend, database, bucket, or runtime secrets are needed.

## Request from the Cloudflare owner

Forward this request:

> Please create a Worker named `swipe-rush` in the intended Cloudflare account.
> Enable its `workers.dev` URL, or attach our agreed production hostname under
> Settings → Domains & Routes → Add → Custom Domain.
> Please provide the account ID and an API token with Workers Editor access
> scoped to this existing Worker. Share the token securely.
> These will be used as `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

Creating a Worker requires product-level Workers Admin access. Having the owner
create it first lets subsequent deployments use per-Worker Editor access.
Custom Domain changes additionally require Workers Routes Write on the affected
zone; the owner handles those separately. The domain must be in an active
Cloudflare zone in the same account. Ordinary deployments do not need to change
the domain connection.

The checked-in `wrangler.jsonc` enables the stable `workers.dev` URL and disables
per-version preview URLs. It omits `routes` so the deployment does not configure
Custom Domains. The owner can attach a Custom Domain separately. If the site
must only be accessible on that domain, set `workers_dev` to `false` after the
domain is ready; the normal setup keeps it enabled so Wrangler prints a link.

If the owner chooses a different Worker name, update `name` in `wrangler.jsonc`
before deploying. Use a dedicated hostname such as `swipe.example.com`; this
build assumes it is served at the hostname root, not under a subdirectory.

## Local setup

Use Node.js 22.12+ as specified in `package.json` (Wrangler requires Node 22+).

```sh
npm ci
cp .env.example .env.deploy
```

Edit `.env.deploy`:

```dotenv
CLOUDFLARE_ACCOUNT_ID=your_32_character_account_id
CLOUDFLARE_API_TOKEN=your_deployment_token
```

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Selects the destination account | No |
| `CLOUDFLARE_API_TOKEN` | Authorizes deployment to the Worker | Yes |

The deployment script loads `.env.deploy`; existing shell/CI variables take
precedence. `.env.example` is only a template. Local environment files and
Wrangler output are ignored by Git. Never put the token in `public/`, Wrangler
`vars`, or a `VITE_*` variable, which would expose it to browser code.

## Check and publish

```sh
npm run deploy:check
npm run deploy
```

`deploy:check` runs the game tests, builds production assets, and runs
`wrangler deploy --dry-run`. It does not load `.env.deploy` or publish anything.
It validates local packaging, not account permissions or DNS.

`deploy` validates credentials, runs tests, rebuilds `dist/`, then uploads using
the pinned local Wrangler version. A failed step stops the deployment. Each
successful deployment replaces the live version of `swipe-rush`.

**The link appears in the terminal when deployment finishes successfully.** With
`workers.dev` enabled, it looks like
`https://swipe-rush.<account-subdomain>.workers.dev`. If the owner attached a
Custom Domain, use that hostname. The account subdomain is assigned/configured
in Cloudflare, not inferred from the account ID. At least one public hostname
must be enabled; an upload alone does not guarantee public routing.

Open the resulting HTTPS URL and check loading, fonts, sound, touch/mouse input,
round completion, and restart. Confirm the browser network panel shows no failed
assets. For a new Custom Domain, allow DNS and certificate activation to finish.

## Caching

Vite copies `public/_headers` into `dist/`. Hashed `/assets/*` files receive a
one-year immutable browser cache. HTML and unversioned fonts require
revalidation, allowing changes to appear without waiting for a long browser
cache expiry. Keep unversioned files out of `/assets/`.

## CI

Provide `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` through the CI
environment (store the token as a secret), then run:

```sh
npm ci
npm run deploy
```

No `.env.deploy` file or interactive Wrangler login is needed in CI. Configure
the pipeline to publish only the intended production branch and serialize
deployments so an older build cannot finish after a newer one.

## Rollback and troubleshooting

In Cloudflare, open Workers & Pages → `swipe-rush` → Deployments and roll back to
the previous known-good version. This requires an earlier deployment; the owner's
initial placeholder is not a working game release. Alternatively, check out a
known-good commit, run `npm ci`, and deploy it again.

- Missing credentials: fill `.env.deploy` or export both variables in the shell.
- Authentication/permission error: check token expiry, account ID, and Editor
  access to the exact Worker. A missing Worker must first be created by the owner.
- Upload succeeds but URL fails: ask the owner to check enabled domains, DNS,
  and certificate status in Domains & Routes.
- Local checks pass but deployment fails: dry runs cannot verify remote access.

## References

- [Static Assets setup](https://developers.cloudflare.com/workers/static-assets/get-started/)
- [Workers permissions](https://developers.cloudflare.com/workers/authorization/workers/)
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
