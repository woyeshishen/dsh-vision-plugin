// dsh-vision-plugin — Client bundle（client-modules 的惰性 CJS 工厂格式）
// 由 client-modules 在浏览器加载；本文件即包的客户端侧（`<id>/client` 与裸 id 同层）。
// 与 src/client.ts 逻辑一致（该 TS 文件仅作源码/类型参考，不参与 tsc 构建）。
window.__ModuleLoader__.load({
  id: '@woyeshishen/dsh-vision-plugin',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    var React = require('react')

    var PROVIDER = 'vision'
    var CRED_REF = 'DSH_VISION_API_KEY'
    var SETTINGS_NS = 'llm-pi-ai'

    var s = {
      root: { maxWidth: 720, color: 'var(--dsw-alias-label-primary)', display: 'flex', flexDirection: 'column', gap: 12 },
      title: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: '24px' },
      intro: { margin: 0, fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-secondary)' },
      field: { display: 'flex', flexDirection: 'column', gap: 6 },
      label: { fontSize: 13, color: 'var(--dsw-alias-label-secondary)' },
      input: {
        boxSizing: 'border-box', height: 36, padding: '0 12px', fontSize: 14,
        color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, outline: 'none',
      },
      row: { display: 'flex', gap: 8 },
      select: { flex: 1, width: '100%' },
      btn: {
        boxSizing: 'border-box', height: 36, padding: '0 14px', fontSize: 14, cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 18,
        background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)',
      },
      actions: { display: 'flex', gap: 8 },
      ok: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-state-success-primary)' },
      err: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' },
    }

    function readProfile(namespace) {
      var value = namespace && namespace.value
      var profile = value && value.providers ? value.providers[PROVIDER] : undefined
      var modelId = profile && profile.models && profile.models[0] ? profile.models[0].id : undefined
      if (modelId === undefined || modelId.length === 0) return null
      return { baseURL: profile.baseURL || '', modelId: modelId }
    }

    function VisionSettings(props) {
      var api = props.api
      var baseURLState = React.useState('')
      var baseURL = baseURLState[0]
      var setBaseURL = baseURLState[1]
      var apiKeyState = React.useState('')
      var apiKey = apiKeyState[0]
      var setApiKey = apiKeyState[1]
      var modelsState = React.useState([])
      var models = modelsState[0]
      var setModels = modelsState[1]
      var modelIdState = React.useState('')
      var modelId = modelIdState[0]
      var setModelId = modelIdState[1]
      var busyState = React.useState('')
      var busy = busyState[0]
      var setBusy = busyState[1]
      var noticeState = React.useState(null)
      var notice = noticeState[0]
      var setNotice = noticeState[1]
      var keyConfiguredState = React.useState(false)
      var keyConfigured = keyConfiguredState[0]
      var setKeyConfigured = keyConfiguredState[1]

      React.useEffect(function () {
        var cancelled = false
        api.settings.describe({}).then(function (resp) {
          if (cancelled || !resp.result.ok) return
          var ns = resp.result.value.namespaces.find(function (n) { return n.ns === SETTINGS_NS })
          var cfg = readProfile(ns)
          if (cfg !== null) {
            setBaseURL(cfg.baseURL)
            setModelId(cfg.modelId)
            setModels([{ id: cfg.modelId, name: cfg.modelId }])
          }
          return api.credentials.describe({ refs: [CRED_REF] }).then(function (cred) {
            if (cancelled) return
            if (cred.result.ok && cred.result.value.credentials[CRED_REF] && cred.result.value.credentials[CRED_REF].configured) {
              setKeyConfigured(true)
            }
          })
        }).catch(function () {})
        return function () { cancelled = true }
      }, [api])

      function listModels() {
        setBusy('list'); setNotice(null)
        var req = {
          settingsNs: SETTINGS_NS,
          baseURL: baseURL.trim(),
          api: 'openai-completions',
        }
        if (apiKey.trim().length > 0) req.apiKey = apiKey.trim()
        api.llm.discoverModels(req).then(function (resp) {
          if (!resp.result.ok) { setNotice({ ok: false, text: resp.result.error.message }); return }
          var list = resp.result.value.models
          setModels(list)
          if (list.length > 0 && modelId.length === 0) setModelId(list[0].id)
          setNotice({ ok: true, text: '已加载 ' + list.length + ' 个模型。' })
        }).catch(function (e) {
          setNotice({ ok: false, text: String((e && e.message) || e) })
        }).finally(function () { setBusy('') })
      }

      function save() {
        setBusy('save'); setNotice(null)
        api.settings.describe({}).then(function (describe) {
          if (!describe.result.ok) { setNotice({ ok: false, text: describe.result.error.message }); return }
          var ns = describe.result.value.namespaces.find(function (n) { return n.ns === SETTINGS_NS })
          var revision = ns ? ns.revision : undefined
          var selected = models.find(function (m) { return m.id === modelId })
          var profile = {
            displayName: selected ? selected.name || modelId : modelId,
            apiKeyEnv: CRED_REF,
            api: 'openai-completions',
            baseURL: baseURL.trim(),
            defaultInput: ['text', 'image'],
            models: [{
              id: modelId,
              name: selected ? selected.name || modelId : modelId,
              input: ['text', 'image'],
              contextWindow: 128000,
              maxTokens: 8192,
            }],
          }
          var setKey = apiKey.trim().length > 0
            ? api.credentials.set({ ref: CRED_REF, value: apiKey.trim() })
            : Promise.resolve({ result: { ok: true } })
          return setKey.then(function (stored) {
            if (!stored.result.ok) { setNotice({ ok: false, text: stored.result.error.message }); return }
            var mutateReq = {
              ns: SETTINGS_NS,
              ops: [{ op: 'set', path: ['providers', PROVIDER], value: profile }],
            }
            if (revision !== undefined) mutateReq.expectedRevision = revision
            return api.settings.mutate(mutateReq).then(function (mutated) {
              if (!mutated.result.ok) { setNotice({ ok: false, text: mutated.result.error.message }); return }
              if (apiKey.trim().length > 0) setKeyConfigured(true)
              setNotice({ ok: true, text: '已保存。主模型在需要看图时会调用 describe_image 工具。' })
            })
          })
        }).catch(function (e) {
          setNotice({ ok: false, text: String((e && e.message) || e) })
        }).finally(function () { setBusy('') })
      }

      function clear() {
        setBusy('clear'); setNotice(null)
        api.settings.describe({}).then(function (describe) {
          var ns = describe.result.ok
            ? describe.result.value.namespaces.find(function (n) { return n.ns === SETTINGS_NS })
            : undefined
          var mutateReq = { ns: SETTINGS_NS, ops: [{ op: 'unset', path: ['providers', PROVIDER] }] }
          if (ns && ns.revision !== undefined) mutateReq.expectedRevision = ns.revision
          return api.settings.mutate(mutateReq).then(function () {
            return api.credentials.unset({ ref: CRED_REF })
          })
        }).then(function () {
          setBaseURL(''); setApiKey(''); setModels([]); setModelId(''); setKeyConfigured(false)
          setNotice({ ok: true, text: '已清除配置。' })
        }).catch(function (e) {
          setNotice({ ok: false, text: String((e && e.message) || e) })
        }).finally(function () { setBusy('') })
      }

      var disabled = busy !== ''

      return React.createElement('div', { style: s.root },
        React.createElement('h3', { style: s.title }, '外部视觉模型'),
        React.createElement('p', { style: s.intro }, '配置一个支持图像输入的外部模型（OpenAI 兼容 API）。配置后，纯文本主模型可通过 describe_image 工具把图片交给它、换取文字描述。'),
        React.createElement('label', { style: s.field },
          React.createElement('span', { style: s.label }, 'URL（Base URL）'),
          React.createElement('input', {
            style: s.input, type: 'text', value: baseURL, placeholder: 'https://example.com/v1',
            disabled: disabled, onChange: function (e) { setBaseURL(e.target.value) },
          }),
        ),
        React.createElement('label', { style: s.field },
          React.createElement('span', { style: s.label }, 'API Key'),
          React.createElement('input', {
            style: s.input, type: 'password', value: apiKey, autoComplete: 'off',
            placeholder: keyConfigured ? '已配置（留空则不修改）' : 'sk-...',
            disabled: disabled, onChange: function (e) { setApiKey(e.target.value) },
          }),
        ),
        React.createElement('div', { style: s.field },
          React.createElement('span', { style: s.label }, '模型'),
          React.createElement('div', { style: s.row },
            React.createElement('select', {
              style: Object.assign({}, s.input, s.select), value: modelId,
              disabled: disabled || models.length === 0,
              onChange: function (e) { setModelId(e.target.value) },
            },
              React.createElement('option', { value: '' }, models.length === 0 ? '（先点击右侧“加载模型”）' : '请选择模型'),
              models.map(function (m) { return React.createElement('option', { key: m.id, value: m.id }, m.name || m.id) }),
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
          React.createElement('button', { style: s.btn, type: 'button', disabled: disabled, onClick: clear },
            busy === 'clear' ? '清除中…' : '清除配置'),
        ),
      )
    }

    function apply(ctx) {
      var connection = ctx.get('connection')
      var api = connection && connection.api
      if (api === undefined) return
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register({
          name: 'settings.section',
          id: 'vision',
          order: 12,
          label: '多模态视觉',
          inject: function () { return { api: api } },
        }, VisionSettings)
      })
    }

    exports.inject = ['slots', 'connection', 'remote']
    exports.apply = apply
    return module.exports
  },
})
