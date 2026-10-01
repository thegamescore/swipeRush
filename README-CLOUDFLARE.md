# Cloudflare setup for Swipe Rush

Please set up hosting for our static browser game:

1. In **Workers & Pages**, create a Worker named **`swipe-rush`**.
2. Enable its **workers.dev** URL. If we are using our own hostname, add it under
   **Settings → Domains & Routes → Add → Custom Domain**.
3. Create an **API token** with **Workers Editor** access scoped to this Worker.
4. Send us the values below, plus the public URL. Share the token securely.

```dotenv
CLOUDFLARE_ACCOUNT_ID=<Cloudflare account ID>
CLOUDFLARE_API_TOKEN=<deployment API token>
CLOUDFLARE_WORKER_NAME=swipe-rush
CLOUDFLARE_WORKERS_DEV=true
CLOUDFLARE_PREVIEW_URLS=false
```

If you choose another Worker name, change `CLOUDFLARE_WORKER_NAME` in the block
above. For a site available only at the Custom Domain, set
`CLOUDFLARE_WORKERS_DEV=false` after the domain is connected. Keep preview URLs
`false` unless per-version public links are wanted. Use a dedicated hostname,
such as `swipe.example.com`, in an active zone in the same account.

The deployer copies `.env.example` to `.env.deploy` and fills in these values.
There is no need to read or edit application code or `wrangler.json`.
Custom Domains remain managed separately in the Cloudflare dashboard.

Creating the Worker requires product-level Workers Admin access. Once created,
the deployment token can use Workers Editor access scoped to that Worker.
Connecting a Custom Domain also requires Workers Routes Write on its zone;
the owner handles that setup separately from ordinary deployments.

We will build and upload the game using `npm run deploy`. You do not need to
connect a Git repository or configure a build, database, or storage bucket.

[Cloudflare's token permissions guide](https://developers.cloudflare.com/workers/authorization/workers/)
