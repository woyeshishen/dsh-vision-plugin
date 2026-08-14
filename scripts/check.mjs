#!/usr/bin/env node
// 对 src/ 下的 TypeScript 做语法检查（等价于 npm run check 的 tsc --noEmit）。
// 用法：node scripts/check.mjs
import { spawnSync } from 'node:child_process'

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsc', '-p', 'tsconfig.json', '--noEmit'],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
