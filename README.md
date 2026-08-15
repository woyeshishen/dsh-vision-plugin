# dsh-vision-plugin

[![npm version](https://img.shields.io/npm/v/@woyeshishen/dsh-vision-plugin)](https://www.npmjs.com/package/@woyeshishen/dsh-vision-plugin)
[![license](https://img.shields.io/npm/l/@woyeshishen/dsh-vision-plugin)](LICENSE)

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）补齐**看图能力**：接入一个 OpenAI 兼容的外部视觉模型后，纯文本主模型（如 deepseek）即可通过 `describe_image` 工具把图片交给它、拿到纯文字描述，从而理解截图、照片、图表、OCR、界面等内容。

> 设计原则：**图片只发给副模型（外部视觉模型），主模型始终只处理文字。**

## 特性

| | |
| --- | --- |
| 🖼️ **看图** | 主模型调用 `describe_image`，返回纯文字描述 |
| ⚙️ **图形化配置** | 在设置页填 URL / API key / 模型，无需手改配置文件 |
| 🔒 **凭据安全** | API key 加密存储于凭据库，界面永不回显 |
| 📦 **一次安装，长期有效** | 随 DSH 启动自动加载，重启不丢 |

## 安装

### 一键安装（推荐）

**Windows（PowerShell）**

```powershell
irm https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.ps1 | iex
```

**macOS / Linux**

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.sh)
```

### dsh plugin 命令安装

**从 npm**

```sh
dsh plugin --profile web add @woyeshishen/dsh-vision-plugin
```

**从 GitHub**

```sh
dsh plugin --profile web add github:woyeshishen/dsh-vision-plugin
```

安装完成后，插件会自动挂载到 profile，重启 DSH（或热重载）即生效。

## 使用

### 第一步：配置外部视觉模型

打开 **设置 → 多模态视觉**：

| 字段 | 说明 |
| --- | --- |
| URL（Base URL） | OpenAI 兼容接口地址，如 `https://api.example.com/v1` |
| API key | 外部模型的密钥（加密存储，不回显） |
| 模型 | 点「加载模型」从接口拉取列表并选择 |

点「保存」。

### 第二步：让主模型看图

在对话中直接说，例如：

> 看一下 `D:\path\to\image.png`，描述里面的内容

主模型会自动调用 `describe_image`，把图片发给外部视觉模型，拿到文字描述后继续推理。

## 工具

### `describe_image`

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `path` | ✅ | 图片文件路径；支持 png / jpg / jpeg / webp / gif |
| `prompt` | ❌ | 对图片的具体问题；缺省为「详细描述图片内容」 |

## 要求

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- 一个 OpenAI 兼容（`/chat/completions`）、支持图像输入的外部视觉模型

## License

[Apache-2.0](LICENSE)
