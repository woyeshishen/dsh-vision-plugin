import { defineTool } from '@deepseek-ai/dsh-tools';
export const name = 'vision-plugin';
export const inject = ['tools', 'llm', 'settings', 'credentials', 'fs', 'attachments'];
const PROVIDER = 'vision';
const SETTINGS_NS = 'llm-pi-ai';
function basename(p) {
    const parts = p.split(/[\\/]/);
    return parts[parts.length - 1] || '';
}
function detectMediaType(p) {
    const lower = p.toLowerCase();
    if (lower.endsWith('.png'))
        return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg'))
        return 'image/jpeg';
    if (lower.endsWith('.webp'))
        return 'image/webp';
    if (lower.endsWith('.gif'))
        return 'image/gif';
    throw new Error('不支持的图片格式，仅支持 png/jpg/jpeg/webp/gif');
}
export function apply(ctx) {
    ctx.tools.register(defineTool({
        name: 'describe_image',
        description: '用外部视觉模型描述一张图片，返回纯文字描述。当需要理解图片内容（截图、照片、图表、OCR、界面等）时调用，传入图片文件的路径。',
        parameters: {
            path: { type: 'string', description: '图片文件的路径（绝对路径或相对工作区路径）。', required: true },
            prompt: { type: 'string', description: '针对图片的具体问题或要求；省略时默认详细描述图片内容。' },
        },
        output: {
            schema: { type: 'string', description: '视觉模型生成的文字描述。' },
            render: (_args, value) => [{ type: 'text', text: String(value ?? '') }],
        },
        execute: async (args, exec) => {
            const { settings, fs, attachments, llm } = ctx;
            const doc = settings.get(SETTINGS_NS);
            const profile = doc?.providers?.[PROVIDER];
            const modelId = profile?.models?.[0]?.id;
            const baseURL = profile?.baseURL;
            if (profile === undefined || modelId === undefined || modelId.length === 0 || baseURL === undefined || baseURL.length === 0) {
                throw new Error('尚未配置外部视觉模型。请先在「设置 → 多模态视觉」里填入 API key、URL 并选择模型。');
            }
            if (args.path.length === 0)
                throw new Error('缺少图片路径参数 path。');
            const mediaType = detectMediaType(args.path);
            const target = await fs.resolve(args.path);
            const maxBytes = attachments.imageLimits?.maxImageBytes ?? 20 * 1024 * 1024;
            const bytes = await fs.readBytes(target, exec.signal, maxBytes);
            const ref = await attachments.saveImage({ data: bytes, mediaType, name: basename(args.path) });
            const prompt = args.prompt !== undefined && args.prompt.trim().length > 0 ? args.prompt.trim() : '请详细描述这张图片的内容。';
            // one-shot 视觉请求不带 MessageId：pi-ai 适配器只读 role/content/source，不读 id
            const message = {
                role: 'user',
                content: [
                    { type: 'image', attachment: ref },
                    { type: 'text', text: prompt },
                ],
                source: { kind: 'user' },
            };
            const stream = llm.stream({
                provider: PROVIDER,
                model: modelId,
                messages: [message],
                signal: exec.signal,
            });
            let text = '';
            for await (const chunk of stream) {
                if (chunk.type === 'text-delta')
                    text += chunk.text;
                else if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) {
                    throw new Error('视觉模型调用失败：' + (chunk.reason.failure.message || chunk.reason.kind));
                }
            }
            if (text.trim().length === 0)
                throw new Error('视觉模型未返回任何文字。');
            return text;
        },
        presentCall: (args) => ({
            card: 'generic',
            title: '描述图片',
            kind: 'read',
            locations: [{ path: args.path }],
        }),
    }));
}
//# sourceMappingURL=index.js.map