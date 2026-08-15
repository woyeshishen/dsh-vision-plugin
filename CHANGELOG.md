# 更新日志

本项目的所有重要变更都会记录在此。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.0.4] - 2026-08-15

### 修复
- 设置页「加载模型」漏传 `provider` 字段：输入框留空时请求既不携带 `apiKey` 也不携带 `provider`，导致 DSH 无法回落到 `.credentials.yaml` 里已存的 `DSH_VISION_API_KEY`，端点返回 401。现补上 `provider: 'vision'`，与 DSH 官方「模型」设置页的行为一致。

## [1.0.3] - 2026-08-15

### 变更
- README 改为英文原版（`README.md`）+ 中文翻译（`README.zh.md`），顶部加语言切换栏。

## [1.0.2] - 2026-08-15

### 修复
- `install.ps1` 兼容 `irm ... | iex`（去掉 UTF-8 BOM、去掉 `param` 改 `$args` 解析、消息改英文），此前 BOM 与 `param` 会导致一键安装失败。

### 变更
- `files` 增加 `.gitignore`（npm 包与仓库内容对齐；`package-lock.json` 受 npm 限制不打包）。
- README 专业化，面向用户（新增 badge、特性表格、分步使用；移除开发者细节）。

## [1.0.1] - 2026-08-15

### 新增
- 一键安装脚本：`scripts/install.ps1`（Windows）+ `scripts/install.sh`（macOS / Linux），自动预写 `minimumReleaseAgeExclude`、`dsh plugin add` 安装挂载、校验 bundle、幂等清理旧手动挂载行。

### 变更
- `package.json` 的 `files` 扩展为完整目录（`lib/ src/ scripts/ docs/ cordis.patch.yml tsconfig.json AGENTS.md CONTRIBUTING.md` 等），npm 包与仓库内容一致。
- README 增加一键安装与 npm 安装方式说明。

## [1.0.0] - 2026-08-15

### 首个正式版
- `describe_image` 工具：主模型调用它把图片交给外部视觉模型、拿到纯文字描述；含 `presentCall` UI 卡片。
- 「多模态视觉」设置页：URL / API key / 模型列表（从 endpoint 拉取）。
- 静态 Cordis 插件形态：`dsh.bundle` + `cordis.patch.yml` + client-modules 工厂格式的 Client 半。
- 发布到 npm（`@woyeshishen/dsh-vision-plugin`）。
