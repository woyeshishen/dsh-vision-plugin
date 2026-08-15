/**
 * dsh-vision-plugin — Client 半（浏览器）
 *
 * ⚠️ 本文件仅作源码/类型参考，**不参与 tsc 构建**（tsconfig 只 include index.ts）。
 * 运行时浏览器实际加载的是 lib/client.js（手写的 client-modules 工厂格式）。
 * 改本文件不会生效 —— 请同步修改 lib/client.js。
 *
 * 「多模态视觉」设置页：URL / API key / 模型列表（从 endpoint 拉取）。
 * 配置读写走通用 api 代理（connection.api），无需自定义 @Remote。
 *
 * 浏览器端通过包导出 `./client` 子路径加载（见 package.json exports）。
 */
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
// 触发 Context 声明合并，使 ctx.slots / ctx.remote 可用（声明在 client 子模块）
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-connection'
// 声明 settings.section slot（SlotMap 键）——在 client 子模块的 contract/slots
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

export const inject = ['slots', 'connection', 'remote']

const PROVIDER = 'vision'
const CRED_REF = 'DSH_VISION_API_KEY'
const SETTINGS_NS = 'llm-pi-ai'

// --- 宽松的 api 类型（connection.api，RPC 返回 { result } 结构）---
interface RpcOk<T> { result: { ok: true; value: T } }
interface RpcErr { result: { ok: false; error: { message: string } } }
type Rpc<T> = Promise<RpcOk<T> | RpcErr>

interface NamespaceView { ns: string; value?: unknown; revision?: number }
interface SettingsDescribeValue { writable: boolean; namespaces: NamespaceView[] }
interface CredentialsDescribeValue { credentials: Record<string, { configured?: boolean }> }

interface Api {
  settings: {
    describe: (req: unknown) => Rpc<SettingsDescribeValue>
    mutate: (req: unknown) => Rpc<Record<string, never>>
  }
  credentials: {
    set: (req: unknown) => Rpc<Record<string, never>>
    describe: (req: unknown) => Rpc<CredentialsDescribeValue>
    unset: (req: unknown) => Rpc<Record<string, never>>
  }
  llm: {
    discoverModels: (req: unknown) => Rpc<{ models: { id: string; name?: string }[] }>
  }
}

export function apply(ctx: Context) {
  const connection = ctx.get('connection') as { api?: Api } | undefined
  const api = connection?.api
  if (api === undefined) return
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'vision',
    order: 12,
    label: '多模态视觉',
    inject: () => ({ api }),
  }, VisionSettings))
}

// --- 内联样式（避免 CSS 注入机制的包依赖差异）---
const s = {
  root: { maxWidth: 720, color: 'var(--dsw-alias-label-primary)', display: 'flex', flexDirection: 'column' as const, gap: 12 },
  title: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: '24px' },
  intro: { margin: 0, fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-secondary)' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, color: 'var(--dsw-alias-label-secondary)' },
  input: {
    boxSizing: 'border-box' as const, height: 36, padding: '0 12px', fontSize: 14,
    color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)',
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, outline: 'none',
  },
  row: { display: 'flex', gap: 8 },
  select: { flex: 1, width: '100%' },
  btn: {
    boxSizing: 'border-box' as const, height: 36, padding: '0 14px', fontSize: 14, cursor: 'pointer',
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 18,
    background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)',
  },
  actions: { display: 'flex', gap: 8 },
  ok: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-state-success-primary)' },
  err: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' },
} as const

interface Profile { baseURL?: string; models?: { id?: string }[] }

function readProfile(namespace: NamespaceView | undefined): { baseURL: string; modelId: string } | null {
  const value = namespace?.value as { providers?: Record<string, Profile> } | undefined
  const profile = value?.providers?.[PROVIDER]
  const modelId = profile?.models?.[0]?.id
  if (modelId === undefined || modelId.length === 0) return null
  return { baseURL: profile?.baseURL ?? '', modelId }
}

function VisionSettings({ api }: { api: Api }) {
  const [baseURL, setBaseURL] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [models, setModels] = React.useState<{ id: string; name?: string }[]>([])
  const [modelId, setModelId] = React.useState('')
  const [busy, setBusy] = React.useState('')
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [keyConfigured, setKeyConfigured] = React.useState(false)

  React.useEffect(() => {
    void (async () => {
      try {
        const resp = await api.settings.describe({})
        if (!resp.result.ok) return
        const ns = resp.result.value.namespaces.find((n) => n.ns === SETTINGS_NS)
        const cfg = readProfile(ns)
        if (cfg !== null) {
          setBaseURL(cfg.baseURL)
          setModelId(cfg.modelId)
          setModels([{ id: cfg.modelId, name: cfg.modelId }])
        }
        const cred = await api.credentials.describe({ refs: [CRED_REF] })
        if (cred.result.ok && cred.result.value.credentials[CRED_REF]?.configured) setKeyConfigured(true)
      } catch (e) { /* 初始加载失败静默 */ }
    })()
  }, [api])

  const listModels = () => {
    setBusy('list'); setNotice(null)
    void (async () => {
      try {
        const resp = await api.llm.discoverModels({
          settingsNs: SETTINGS_NS,
          provider: PROVIDER,
          baseURL: baseURL.trim(),
          api: 'openai-completions',
          ...(apiKey.trim().length > 0 ? { apiKey: apiKey.trim() } : {}),
        })
        if (!resp.result.ok) { setNotice({ ok: false, text: resp.result.error.message }); return }
        const list = resp.result.value.models
        setModels(list)
        if (list.length > 0 && modelId.length === 0) setModelId(list[0].id)
        setNotice({ ok: true, text: '已加载 ' + list.length + ' 个模型。' })
      } catch (e) {
        setNotice({ ok: false, text: String((e as Error)?.message ?? e) })
      } finally {
        setBusy('')
      }
    })()
  }

  const save = () => {
    setBusy('save'); setNotice(null)
    void (async () => {
      try {
        const describe = await api.settings.describe({})
        if (!describe.result.ok) { setNotice({ ok: false, text: describe.result.error.message }); return }
        const ns = describe.result.value.namespaces.find((n) => n.ns === SETTINGS_NS)
        const revision = ns?.revision
        const selected = models.find((m) => m.id === modelId)
        const profile = {
          displayName: selected?.name ?? modelId,
          apiKeyEnv: CRED_REF,
          api: 'openai-completions',
          baseURL: baseURL.trim(),
          defaultInput: ['text', 'image'],
          models: [{
            id: modelId,
            name: selected?.name ?? modelId,
            input: ['text', 'image'],
            contextWindow: 128000,
            maxTokens: 8192,
          }],
        }
        if (apiKey.trim().length > 0) {
          const stored = await api.credentials.set({ ref: CRED_REF, value: apiKey.trim() })
          if (!stored.result.ok) { setNotice({ ok: false, text: stored.result.error.message }); return }
        }
        const mutated = await api.settings.mutate({
          ns: SETTINGS_NS,
          ops: [{ op: 'set', path: ['providers', PROVIDER], value: profile }],
          ...(revision === undefined ? {} : { expectedRevision: revision }),
        })
        if (!mutated.result.ok) { setNotice({ ok: false, text: mutated.result.error.message }); return }
        if (apiKey.trim().length > 0) setKeyConfigured(true)
        setNotice({ ok: true, text: '已保存。主模型在需要看图时会调用 describe_image 工具。' })
      } catch (e) {
        setNotice({ ok: false, text: String((e as Error)?.message ?? e) })
      } finally {
        setBusy('')
      }
    })()
  }

  const clear = () => {
    setBusy('clear'); setNotice(null)
    void (async () => {
      try {
        const describe = await api.settings.describe({})
        if (describe.result.ok) {
          const ns = describe.result.value.namespaces.find((n) => n.ns === SETTINGS_NS)
          await api.settings.mutate({
            ns: SETTINGS_NS,
            ops: [{ op: 'unset', path: ['providers', PROVIDER] }],
            ...(ns?.revision === undefined ? {} : { expectedRevision: ns.revision }),
          })
        }
        await api.credentials.unset({ ref: CRED_REF })
        setBaseURL(''); setApiKey(''); setModels([]); setModelId(''); setKeyConfigured(false)
        setNotice({ ok: true, text: '已清除配置。' })
      } catch (e) {
        setNotice({ ok: false, text: String((e as Error)?.message ?? e) })
      } finally {
        setBusy('')
      }
    })()
  }

  const disabled = busy !== ''

  return React.createElement('div', { style: s.root },
    React.createElement('h3', { style: s.title }, '外部视觉模型'),
    React.createElement('p', { style: s.intro }, '配置一个支持图像输入的外部模型（OpenAI 兼容 API）。配置后，纯文本主模型可通过 describe_image 工具把图片交给它、换取文字描述。'),
    React.createElement('label', { style: s.field },
      React.createElement('span', { style: s.label }, 'URL（Base URL）'),
      React.createElement('input', {
        style: s.input, type: 'text', value: baseURL, placeholder: 'https://example.com/v1',
        disabled, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBaseURL(e.target.value),
      }),
    ),
    React.createElement('label', { style: s.field },
      React.createElement('span', { style: s.label }, 'API Key'),
      React.createElement('input', {
        style: s.input, type: 'password', value: apiKey, autoComplete: 'off',
        placeholder: keyConfigured ? '已配置（留空则不修改）' : 'sk-...',
        disabled, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value),
      }),
    ),
    React.createElement('div', { style: s.field },
      React.createElement('span', { style: s.label }, '模型'),
      React.createElement('div', { style: s.row },
        React.createElement('select', {
          style: { ...s.input, ...s.select }, value: modelId,
          disabled: disabled || models.length === 0,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setModelId(e.target.value),
        },
          React.createElement('option', { value: '' }, models.length === 0 ? '（先点击右侧“加载模型”）' : '请选择模型'),
          models.map((m) => React.createElement('option', { key: m.id, value: m.id }, m.name ?? m.id)),
        ),
        React.createElement('button', {
          style: s.btn, type: 'button', disabled: disabled || baseURL.trim().length === 0,
          onClick: listModels,
        }, busy === 'list' ? '加载中…' : '加载模型'),
      ),
    ),
    notice ? React.createElement('p', { style: notice.ok ? s.ok : s.err }, notice.text) : null,
    React.createElement('div', { style: s.actions },
      React.createElement('button', {
        style: s.btn, type: 'button', disabled: disabled || baseURL.trim().length === 0 || modelId.length === 0,
        onClick: save,
      }, busy === 'save' ? '保存中…' : '保存'),
      React.createElement('button', { style: s.btn, type: 'button', disabled, onClick: clear },
        busy === 'clear' ? '清除中…' : '清除配置'),
    ),
  )
}
