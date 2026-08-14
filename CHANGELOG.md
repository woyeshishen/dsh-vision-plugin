# 更新日志

本项目的所有重要变更都会记录在此。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

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
