# dsh-vision-plugin

> **v1.0.0** · 静态 Cordis 插件 · Apache-2.0

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）提供**外部视觉模型 / 多模态**能力的**静态 Cordis 插件**：给纯文本主模型（如 deepseek）配一个 OpenAI 兼容的外部视觉模型，主模型通过 `describe_image` 工具把图片交给副模型、拿到**纯文字描述**，从而补齐「看图」能力。

> 核心设计：**图像只发给副模型（外部视觉模型）；主模型本质上始终只处理文字。**

## 特性

- ✍️ 注册 `describe_image` 工具：主模型需要看图时调用它，返回纯文字描述；带 UI 卡片（`read` 图标 + 文件定位）。
- ⚙️ 设置页「多模态视觉」：输入 URL / API key / 从 endpoint 拉取模型列表选择，保存即生效。
- 🔐 凭据持久化：API key 存于 `.credentials.yaml`（密文，界面不回显）；配置存于 `settings.yaml`。
- 🌐 复用 DSH 内置 `dsh-llm-pi-ai` 适配器发起请求，无需自建网络代码。
- 🔄 模型列表经 `api.llm.discoverModels`（`GET /models`）拉取。
- 📦 **静态插件**：`dsh plugin add` 安装后随 DSH 启动**自动加载**，重启不丢。

## 安装

官方 `dsh plugin` 方式，三种来源任选（推荐 git / npm，peer 依赖由 pnpm 自动解析）：

```sh
# 本地路径
dsh plugin --profile web add /abs/path/to/dsh-vision-plugin

# 从 GitHub（拉源码 + 已提交的 lib/ 构建产物）
dsh plugin --profile web add github:woyeshishen/dsh-vision-plugin

# 从 npm（发布后）
dsh plugin --profile web add @woyeshishen/dsh-vision-plugin
```

安装后，插件作为一层自动进入 `dsh.profile.bundles`；`dsh --profile web` 启动即生效。

## 配置外部视觉模型

打开 **设置 → 多模态视觉**：

| 字段 | 说明 |
| --- | --- |
| URL（Base URL） | OpenAI 兼容 endpoint，如 `https://api.example.com/v1` |
| API key | 外部模型的密钥（存凭据库，不回显） |
| 模型 | 点「加载模型」拉取列表并选择 |

点「保存」。

## 使用

在对话中让主模型看图，例如：

> 看一下 `D:\path\to\image.png`，描述里面的内容

主模型会自动调用 `describe_image`，返回外部视觉模型生成的文字描述。

## 工具参数

`describe_image`

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `path` | ✅ | 图片文件路径（绝对或相对工作区路径）；支持 png / jpg / jpeg / webp / gif |
| `prompt` | ❌ | 针对图片的具体问题；省略时默认「详细描述图片内容」 |

## 开发

```sh
npm install     # 安装 TypeScript 与依赖
npm run build   # tsc 编译 src/index.ts → lib/index.js（client 半为手写工厂，不被 tsc 覆盖）
npm run check   # tsc --noEmit 类型检查
```

### 文件结构

```
dsh-vision-plugin/
├── src/
│   ├── index.ts         Host 半：describe_image 工具（含 presentCall）
│   └── client.ts        Client 半源码（仅参考，不参与构建）
├── lib/
│   ├── index.js         Host 构建产物（tsc）
│   └── client.js        Client 运行时（手写的 client-modules 工厂格式）
├── cordis.patch.yml     bundle 层：插件行按包名引用
├── tsconfig.json        只编译 src/index.ts
├── docs/
│   └── architecture.md  架构与数据流
├── scripts/
│   └── check.mjs        语法检查
├── AGENTS.md            给 AI agent 的开发指引
├── CONTRIBUTING.md      贡献指南
├── LICENSE              Apache-2.0
└── package.json         包元数据（dsh.bundle + dsh.client + exports + files）
```

## 约束

- endpoint 需为 OpenAI 兼容的 `/chat/completions` 协议（`api: openai-completions`）。
- 外部模型需支持图像输入（工具以 `input: ["text","image"]` 声明）。
- 默认上下文窗口 128000、输出上限 8192，可在 `lib/client.js` 的 `profile.models[0]` 调整（`src/client.ts` 仅作参考，改后需同步 `lib/client.js`）。

## License

[Apache-2.0](LICENSE)
