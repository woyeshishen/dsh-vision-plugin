# AGENTS.md

本文件为在此仓库上工作的 AI agent（或人类开发者）提供指引。

## 项目是什么

DSH 的**静态 Cordis 插件**（TypeScript，tsc 编译到 `lib/`，登记进 `cordis.yml` 后随 DSH 启动自动加载）。分两端：

- `src/index.ts`（Host 半，运行于 DSH Node 进程）：注册 `describe_image` 工具。
- `src/client.ts`（Client 半，运行于浏览器）：设置页「多模态视觉」表单。

## 硬性约定（违反会导致构建失败或运行异常）

1. **TypeScript 源码**，`npm run build`（tsc）编译到 `lib/`。`npm run check` 做 `tsc --noEmit` 类型检查。
2. **导出结构**（Host 半 `src/index.ts`）：
   ```ts
   export const name = 'vision-plugin'
   export const inject = ['tools', 'llm', 'settings', 'credentials', 'fs', 'attachments']
   export function apply(ctx: Context) { ... }
   ```
   - `inject` 声明硬依赖，声明后 `ctx.xxx` 直接可用（无需 `ctx.get`）。
   - **`ctx.settings` 等注入服务的类型来自各 `@deepseek-ai/dsh-*` 包的 Context 声明合并**：在源码里用 `import type {} from '包名'` 引用对应包触发，否则 `ctx.settings` 报 `Property does not exist`。
3. **Client 半**（`src/client.ts`）：
   - `ctx.slots` 声明在 `@deepseek-ai/dsh-client-runtime/client`；`settings.section` 的 SlotMap 键声明在 `@deepseek-ai/dsh-client-ui-settings/client`——注册任何 slot 前先 `import type {}` 引用声明它的包。
   - 配置读写**走通用 api 代理**：`ctx.get('connection')` → `connection.api`（`api.settings.mutate/describe`、`api.credentials.set/describe/unset`、`api.llm.discoverModels`）。返回结构是 RPC 风格 `{ result: { ok, value?, error? } }`。
   - React 一律用 `React.createElement(...)`（本项目不引入 JSX 转换）。
4. **工具注册**（Host 半）：`ctx.tools.register(defineTool({...}))`。`defineTool` 的参数/输出用 value schema DSL：
   - `parameters` 属性映射：可选参数**省略** `required`，必填 `required: true`（写 `required: false` 会被拒）。
   - `output.schema` 用 value DSL；字符串输出直接 `{ type: 'string' }`。
5. **信令**：工具 `execute(args, exec)` 必须转发 `exec.signal`（传给 `ctx.fs.readBytes` 与 `ctx.llm.stream`）。
6. **副作用生命周期**：`ctx.tools.register`、`ctx.slots.register` 返回 disposer，经调用方 fiber 自动清理（无需手动 `ctx.effect` 包裹）。
7. **无沙箱**：静态插件运行在主进程，对象直接传给主 realm 服务，**没有动态插件的跨 realm 原型问题**（不需要 `plain()`）。

## 与动态插件（旧版）的差异

旧版是纯 JS 函数体（`harness.handle` / `harness.defineTool` / `host.call`），现改为标准 Cordis 静态插件：

| 能力 | 动态插件 | 静态插件 |
| --- | --- | --- |
| Client→Host RPC | `harness.handle` + `host.call` | 通用 `connection.api`（或 `@Remote`） |
| 工具注册 | `harness.defineTool` + `registerTool` | `defineTool` + `ctx.tools.register` |
| 服务访问 | `ctx.get(name)`（沙箱） | `inject` 声明 + `ctx.name` |
| 生命周期 | 进程局部，重启即失 | 随 DSH 启动自动加载 |

## 关键数据流

```
用户/主模型调用 describe_image(path)
  → src/index.ts execute:
      ctx.settings.get('llm-pi-ai') 读配置（provider 'vision'）
      ctx.fs.resolve + readBytes 读图
      ctx.attachments.saveImage → ImageAttachmentRef
      构造含 image block 的 user message
      ctx.llm.stream({ provider:'vision', model, messages, signal })
      → pi-ai 适配器 → 外部视觉模型 → text-delta 收集 → 返回纯文字
```

配置流（Client 半）：

```
设置页表单 → connection.api.settings.describe + credentials.set + settings.mutate
  → pi-ai 适配器按 settings 注册 'vision' 路由（dormant → live）
```

## 验证

```bash
npm run check   # tsc --noEmit 类型检查
npm run build   # 编译到 lib/
```

改动后如需运行验证：安装本包到 DSH 部署并在 `cordis.patch.yml` 登记 `- id: vision-plugin / name: '@woyeshishen/dsh-vision-plugin'`，重启 DSH；核对「设置 → 多模态视觉」与 `describe_image` 工具。
