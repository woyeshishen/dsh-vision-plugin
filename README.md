# dsh-vision-plugin

[![npm version](https://img.shields.io/npm/v/@woyeshishen/dsh-vision-plugin)](https://www.npmjs.com/package/@woyeshishen/dsh-vision-plugin)
[![license](https://img.shields.io/npm/l/@woyeshishen/dsh-vision-plugin)](LICENSE)

[中文](README.zh.md) | English

Adds **image understanding** to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH): wire up an OpenAI-compatible external vision model, and a text-only main model (e.g. deepseek) can call the `describe_image` tool to hand an image to it and get a **plain-text description** — understanding screenshots, photos, charts, OCR, UIs, and more.

> Design: **images go only to the secondary model (external vision model); the main model always deals with text.**

## Features

| | |
| --- | --- |
| 🖼️ **Image understanding** | The main model calls `describe_image` and gets a plain-text description |
| ⚙️ **GUI configuration** | Fill in URL / API key / model on a settings page — no config files to edit |
| 🔒 **Secure credentials** | API key stored in the credential store, never echoed |
| 📦 **Install once, keep working** | Auto-loads at DSH startup, survives restarts |

## Install

### One-liner (recommended)

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.ps1 | iex
```

**macOS / Linux**

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.sh)
```

### dsh plugin command

**From npm**

```sh
dsh plugin --profile web add @woyeshishen/dsh-vision-plugin
```

**From GitHub**

```sh
dsh plugin --profile web add github:woyeshishen/dsh-vision-plugin
```

After install, the plugin auto-mounts into the profile; restart DSH (or hot-reload) to activate.

## Usage

### Step 1: Configure the external vision model

Open **Settings → Multimodal Vision**:

| Field | Description |
| --- | --- |
| URL (Base URL) | OpenAI-compatible endpoint, e.g. `https://api.example.com/v1` |
| API key | Secret for the external model (stored encrypted, never echoed) |
| Model | Click "Load models" to fetch and pick from the endpoint |

Click **Save**.

### Step 2: Ask the main model to look at an image

In a conversation, say:

> Take a look at `D:\path\to\image.png` and describe what's in it.

The main model calls `describe_image`, sends the image to the external vision model, and continues reasoning from the returned description.

## Tool

### `describe_image`

| Parameter | Required | Description |
| --- | --- | --- |
| `path` | ✅ | Image file path; supports png / jpg / jpeg / webp / gif |
| `prompt` | ❌ | Specific question about the image; defaults to "describe the image in detail" |

## Requirements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- An OpenAI-compatible (`/chat/completions`), image-capable external vision model

## License

[Apache-2.0](LICENSE)
