# dsh-vision-plugin

> **v1.0.0** · Static Cordis plugin · Apache-2.0

A **static Cordis plugin** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) that adds **external vision / multimodal** capability: pair a text-only main model (e.g. deepseek) with an OpenAI-compatible external vision model. The main model calls the `describe_image` tool, which hands the image to the vision model and returns a **plain-text description** — closing the "see images" gap.

> Core design: **images go only to the secondary model (external vision model); the main model always deals with text.**

## Features

- ✍️ Registers the `describe_image` tool — returns a plain-text description, with a UI card (`read` icon + file location).
- ⚙️ Settings page "Multimodal Vision": enter URL / API key / pick a model from the endpoint's model list, save to apply.
- 🔐 Credentials persisted: API key is stored in `.credentials.yaml` (never echoed); config lives in `settings.yaml`.
- 🌐 Reuses DSH's built-in `dsh-llm-pi-ai` adapter for requests — no hand-written networking code.
- 🔄 Model list fetched via `api.llm.discoverModels` (`GET /models`).
- 📦 **Static plugin**: installed via `dsh plugin add`, auto-loads at DSH startup, survives restarts.

## Install

### npm install (recommended, published)

```sh
dsh plugin --profile web add @woyeshishen/dsh-vision-plugin
```

Pulled from the npm registry; peer deps auto-resolve via pnpm. Auto-mounts on install, `dsh --profile web` loads it at startup.

### One-liner

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.ps1 | iex
```

```sh
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.sh)
```

The script: pre-writes `minimumReleaseAgeExclude` (allows <24h releases) → `dsh plugin add` installs and auto-mounts → verifies bundle registration → idempotently removes any old manual mount row. Options: `-Version <v>` pin a version, `-Restart` restart after install, `-DryRun` print only.

### Other sources

```sh
# local path
dsh plugin --profile web add /abs/path/to/dsh-vision-plugin

# from GitHub (pulls source + the committed lib/ build output)
dsh plugin --profile web add github:woyeshishen/dsh-vision-plugin
```

After install, the plugin joins `dsh.profile.bundles` automatically; `dsh --profile web` loads it at startup.

## Configure the external vision model

Open **Settings → Multimodal Vision**:

| Field | Description |
| --- | --- |
| URL (Base URL) | OpenAI-compatible endpoint, e.g. `https://api.example.com/v1` |
| API key | Secret for the external model (stored in the credential store, never echoed) |
| Model | Click "Load models" to fetch the list, then pick one |

Click **Save**.

## Use

Ask the main model to look at an image, for example:

> Take a look at `D:\path\to\image.png` and describe what's in it.

The main model calls `describe_image` and receives a text description from the external vision model.

## Tool parameters

`describe_image`

| Parameter | Required | Description |
| --- | --- | --- |
| `path` | ✅ | Image file path (absolute or workspace-relative); supports png / jpg / jpeg / webp / gif |
| `prompt` | ❌ | Specific question about the image; defaults to "describe the image in detail" |

## Development

```sh
npm install     # install TypeScript and dependencies
npm run build   # tsc compiles src/index.ts → lib/index.js (client half is hand-written, not compiled)
npm run check   # tsc --noEmit type check
```

### File layout

```
dsh-vision-plugin/
├── src/
│   ├── index.ts         Host half: describe_image tool (with presentCall)
│   └── client.ts        Client half source (reference only, not built)
├── lib/
│   ├── index.js         Host build output (tsc)
│   └── client.js        Client runtime (hand-written client-modules factory)
├── cordis.patch.yml     bundle layer: plugin row by package name
├── tsconfig.json        compiles only src/index.ts
├── docs/
│   └── architecture.md  Architecture and data flow
├── scripts/
│   └── check.mjs        Syntax check
├── AGENTS.md            Development guide for AI agents
├── CONTRIBUTING.md      Contribution guide
├── LICENSE              Apache-2.0
└── package.json         Package metadata (dsh.bundle + dsh.client + exports + files)
```

## Constraints

- The endpoint must speak the OpenAI-compatible `/chat/completions` protocol (`api: openai-completions`).
- The external model must accept image input (declared as `input: ["text","image"]`).
- Default context window is 128000 and max output is 8192; adjust `profile.models[0]` in `lib/client.js` (`src/client.ts` is reference-only — keep `lib/client.js` in sync).

## License

[Apache-2.0](LICENSE)
