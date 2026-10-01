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
```

We will build and upload the game using `npm run deploy`. You do not need to
connect a Git repository or configure a build, database, or storage bucket.

[Cloudflare's token permissions guide](https://developers.cloudflare.com/workers/authorization/workers/)
