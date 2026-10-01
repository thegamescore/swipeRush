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

All deployment settings are in `.env.deploy` (copy `.env.example`). No source
code or Wrangler configuration edits are needed when the account or Worker name
changes. Set `CLOUDFLARE_WORKER_NAME` to the exact name created by the owner.

`CLOUDFLARE_WORKERS_DEV=true` keeps the stable workers.dev URL enabled;
`CLOUDFLARE_PREVIEW_URLS=false` disables per-version preview URLs. For a site
accessible only through the production domain, set `CLOUDFLARE_WORKERS_DEV=false`
after the owner connects that domain. Boolean values must be `true` or `false`.

Custom Domains stay under the owner's control in the dashboard. Deployments omit
`routes` and do not configure that connection. Use a dedicated hostname such as
`swipe.example.com`; the game must be served at the hostname root.

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
CLOUDFLARE_WORKER_NAME=swipe-rush
CLOUDFLARE_WORKERS_DEV=true
CLOUDFLARE_PREVIEW_URLS=false
```

| Variable                  | Purpose                                              | Secret? |
| ------------------------- | ---------------------------------------------------- | ------- |
| `CLOUDFLARE_ACCOUNT_ID`   | Selects the destination account                      | No      |
| `CLOUDFLARE_API_TOKEN`    | Authorizes deployment to the Worker                  | Yes     |
| `CLOUDFLARE_WORKER_NAME`  | Existing Worker name; defaults to `swipe-rush`       | No      |
| `CLOUDFLARE_WORKERS_DEV`  | Enable stable workers.dev URL; defaults to `true`    | No      |
| `CLOUDFLARE_PREVIEW_URLS` | Enable per-version preview URLs; defaults to `false` | No      |

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
`wrangler deploy --dry-run`. It loads `.env.deploy` to check the same settings as publishing, but does not
require credentials or publish anything.
It validates local packaging, not account permissions or DNS.

`deploy` validates credentials, runs tests, rebuilds `dist/`, then uploads using
the pinned local Wrangler version. A failed step stops the deployment. Each
successful deployment replaces the live version of `CLOUDFLARE_WORKER_NAME`.
The script generates an ignored `.wrangler/deploy-settings.json` from the base
Wrangler configuration and environment settings; it contains no credentials.

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
environment (store the token as a secret). Set `CLOUDFLARE_WORKER_NAME`,
`CLOUDFLARE_WORKERS_DEV`, and `CLOUDFLARE_PREVIEW_URLS` there if their defaults
do not match your setup, then run:

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
