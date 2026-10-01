import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
  console.error("Usage: npm run deploy or npm run deploy:check");
  process.exit(1);
}
const check = args[0] === "--check";

try {
  loadEnvFile(".env.deploy");
} catch (error) {
  if (error.code !== "ENOENT") {
    console.error("Cannot read .env.deploy. Check its permissions and format.");
    process.exit(1);
  }
}

if (!check) {
  const missing = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"].filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length) {
    console.error(
      `Missing ${missing.join(", ")}. Copy .env.example to .env.deploy and fill it in, or set CI environment variables.`,
    );
    process.exit(1);
  }
  if (!/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID)) {
    console.error(
      "CLOUDFLARE_ACCOUNT_ID must be the 32-character hexadecimal account ID.",
    );
    process.exit(1);
  }
}

const baseConfig = JSON.parse(
  readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"),
);
const workerName = process.env.CLOUDFLARE_WORKER_NAME ?? baseConfig.name;
if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workerName)) {
  console.error(
    "CLOUDFLARE_WORKER_NAME must be 1–63 lowercase letters, digits, or hyphens, with no leading or trailing hyphen.",
  );
  process.exit(1);
}
function booleanSetting(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  console.error(`${name} must be true or false.`);
  process.exit(1);
}
const config = {
  ...baseConfig,
  name: workerName,
  workers_dev: booleanSetting("CLOUDFLARE_WORKERS_DEV", baseConfig.workers_dev),
  preview_urls: booleanSetting(
    "CLOUDFLARE_PREVIEW_URLS",
    baseConfig.preview_urls,
  ),
  assets: {
    ...baseConfig.assets,
    directory: fileURLToPath(new URL("../dist/", import.meta.url)),
  },
};
// Generated configuration contains no credentials and never manages domain routes.
delete config.$schema;
const configPath = fileURLToPath(
  new URL("../.wrangler/deploy-settings.json", import.meta.url),
);
mkdirSync(new URL("../.wrangler/", import.meta.url), { recursive: true });
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
console.log(
  `Worker: ${workerName}; workers.dev: ${config.workers_dev}; preview URLs: ${config.preview_urls}`,
);

function run(command, commandArgs, env = process.env) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    env,
  });
  if (result.error)
    console.error(`Could not start ${command}: ${result.error.message}`);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

// Do not pass deployment credentials to tests or the frontend build.
const buildEnv = { ...process.env };
delete buildEnv.CLOUDFLARE_ACCOUNT_ID;
delete buildEnv.CLOUDFLARE_API_TOKEN;
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error(
    "Run this script through npm run deploy or npm run deploy:check.",
  );
  process.exit(1);
}
run(process.execPath, [npmCli, "test"], buildEnv);
run(process.execPath, [npmCli, "run", "build"], buildEnv);
run(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
    ),
    "deploy",
    "--config",
    configPath,
    ...(check ? ["--dry-run"] : []),
  ],
  {
    ...(check ? buildEnv : process.env),
    WRANGLER_SEND_METRICS: "false",
    WRANGLER_LOG_PATH: fileURLToPath(
      new URL("../.wrangler/logs/", import.meta.url),
    ),
  },
);
