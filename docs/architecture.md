# 架构说明

本文说明 `dsh-vision-plugin`（静态 Cordis 插件）的模块分工与数据流。目标读者：二次开发者、维护者。

## 形态

**静态插件**：TypeScript 源码（`src/`）经 `tsc` 编译到 `lib/`，登记进部署配置 `cordis.yml` 后，随 DSH 启动**自动加载**（无需手动 `cordis_run`，重启不丢）。

```
浏览器 (Client)                    DSH Node 进程 (Host)                   外部
┌──────────────────┐  connection.api ┌────────────────────────────┐  HTTPS  ┌──────────────┐
│ 设置页「多模态视觉」│ ───────────────► │ describe_image 工具          │  ──────► │ 视觉模型     │
│ (src/client.ts)   │   (RPC 代理)     │ (src/index.ts)             │  stream  │ (OpenAI 兼容)│
└──────────────────┘                 └────────────────────────────┘         └──────────────┘
```

## 两端职责

### `src/index.ts`（Host 半）

导出 `{ name, inject, apply }`，随 DSH 启动加载：

- `inject = ['tools', 'llm', 'settings', 'credentials', 'fs', 'attachments']`（硬依赖，`ctx.xxx` 直接可用）。
- `apply(ctx)`：`ctx.tools.register(defineTool({ ... }))` 注册 `describe_image`。
- `describe_image.execute`：读配置（`ctx.settings`）→ 读图（`ctx.fs`）→ 落盘（`ctx.attachments`）→ 调外部模型（`ctx.llm.stream`）→ 返回纯文字。

### `src/client.ts`（Client 半）

导出 `{ inject, apply }`，浏览器经包导出 `./client` 子路径加载：

- `inject = ['slots', 'connection', 'remote']`。
- `apply(ctx)`：`ctx.slots.inject('settings.section', () => ctx.slots.register({...}, VisionSettings))`。
- 组件用 `connection.api`（通用 api 代理）读写配置，无需自定义 `@Remote`。

## 与 DSH 内置能力的集成

| DSH 能力 | 用途 |
| --- | --- |
| `dsh-llm-pi-ai` 适配器 | 休眠的多提供商适配器；写入 `llm-pi-ai` settings 后自动注册 `vision` 路由并处理外部请求（含图像多模态、凭据解析）。插件自身**不**写任何网络代码。 |
| `ctx.credentials` / `api.credentials` | API key 持久化与解析（`DSH_VISION_API_KEY`）。 |
| `ctx.settings` / `api.settings` | provider profile 持久化到 `settings.yaml`。 |
| `ctx.attachments` | 图片字节落盘为 `ImageAttachmentRef`，供 pi-ai 适配器读取。 |
| `ctx.fs` | 读取图片文件字节（`resolve` + `readBytes`）。 |
| `api.llm.discoverModels` | 从 endpoint 的 `GET /models` 拉取模型列表（pi-ai 内部实现）。 |
| `connection.api` | Client→Host 通用 RPC 代理（host-apiproxy 提供），返回 `{ result: { ok, value?, error? } }`。 |

## 类型与装载要点

1. **Context 声明合并**：`ctx.settings` / `ctx.fs` 等注入服务的类型来自各 `@deepseek-ai/dsh-*` 包的 `declare module '@deepseek-ai/cordis'` 增强。必须在源码里 `import type {} from '包名'` 引用对应包触发，否则 TS 报 `Property does not exist`。
2. **SlotMap 键**：`settings.section` 的合法 slot 名由 `@deepseek-ai/dsh-client-ui-settings/client` 声明；`ctx.slots` 由 `@deepseek-ai/dsh-client-runtime/client` 声明。注册前 `import type {}` 引用。
3. **构建**：`npm run build`（tsc）→ `lib/`；`package.json` 的 `main`/`exports` 指向 `lib/index.js`（Host）与 `./client`（`lib/client.js`）；`dsh.client.inject` 声明浏览器运行时注入的包。
4. **装载**：安装本包后，在 `cordis.patch.yml` 追加 `- id: vision-plugin / name: '@woyeshishen/dsh-vision-plugin'`，重启 DSH。
5. **无沙箱**：静态插件在主进程运行，无动态插件的跨 realm 原型问题（不需要 `plain()`）。
6. **信令**：工具 `execute` 把 `exec.signal` 透传给 `ctx.fs.readBytes` 与 `ctx.llm.stream`。

## 数据流（一次看图）

```
用户：看 D:\img.png
  → 主模型（deepseek）决定调用 describe_image
  → src/index.ts execute({ path, prompt })
      → ctx.settings.get('llm-pi-ai') 解析 provider 'vision' 的 model/baseURL
      → ctx.fs.resolve + readBytes(path)
      → ctx.attachments.saveImage({ data, mediaType })  → ref
      → message = { role:'user', content:[image, text], source:{kind:'user'} }
      → ctx.llm.stream({ provider:'vision', model, messages, signal })
          → pi-ai 适配器（按 settings 解析凭据/模型）
          → 外部视觉模型（OpenAI 兼容 /chat/completions）
          → text-delta 收集为字符串
      → 返回纯文字
  → 主模型收到文字描述，继续文本推理
```

## 配置写入（Client 半设置页）

```
api.settings.describe({})                 # 读 llm-pi-ai namespace（含 revision）
api.credentials.set({ ref: 'DSH_VISION_API_KEY', value })   # 存 key
api.settings.mutate({ ns:'llm-pi-ai', ops:[{op:'set', path:['providers','vision'], value:profile}] })
api.llm.discoverModels({ settingsNs:'llm-pi-ai', baseURL, api:'openai-completions', apiKey })  # 拉模型
api.credentials.unset({ ref })            # 清除 key
api.settings.mutate({ ..., ops:[{op:'unset', ...}] })        # 移除 provider
```

## 默认配置（`src/client.ts` 中可调）

- provider route：`vision`
- credential ref：`DSH_VISION_API_KEY`
- 协议：`openai-completions`
- 模型默认：`contextWindow: 128000`，`maxTokens: 8192`，`input: ["text","image"]`
