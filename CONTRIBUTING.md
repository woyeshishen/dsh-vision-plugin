# CONTRIBUTING

感谢你愿意为 `dsh-vision-plugin` 贡献代码。请先阅读 [AGENTS.md](AGENTS.md)（开发约定），再按以下流程提交。

## 开发环境

- Node.js >= 18
- git
- 一个可运行的 DeepSeek Harness 实例（用于挂载验证）

## 本地验证

```bash
npm run check   # 或 node scripts/check.mjs：对 host.js / client.js 做语法检查
```

## 提交规范

- 分支命名：`feat/<short-name>`、`fix/<short-name>`、`docs/<short-name>`。
- Commit message 用 Conventional Commits 风格：

```
feat: 增加对 xxx 的支持
fix: 修复 settings 保存被拒的问题
docs: 补充 README 使用说明
```

- 每次改动请同步更新中英文文档（`README.md` 与 `README.en.md`）。

## 改动范围指引

| 改动 | 涉及文件 |
| --- | --- |
| 视觉工具行为/参数 | `host.js`（`harness.defineTool` 部分） |
| 设置页字段/交互 | `client.js` |
| 配置协议（endpoint、凭据） | `host.js` 的 RPC handler 与 `README*` |
| 架构说明 | `docs/architecture.md` |

## Pull Request

1. Fork 本仓库并创建分支。
2. 完成改动，跑 `npm run check`。
3. 提交并推送分支，开 PR，说明改动动机与验证方式。

## 注意事项

- 不要提交真实凭据（API key 等）。`.credentials.yaml`、`settings.yaml` 已在 `.gitignore` 中。
- 遵守 [AGENTS.md](AGENTS.md) 中的硬性代码约定（纯 JS 函数体、声明前置、value DSL、跨 realm 对象等）。
