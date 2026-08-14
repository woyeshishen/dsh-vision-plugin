/**
 * dsh-vision-plugin — Host 半（静态 Cordis 插件）
 *
 * 注册 describe_image 工具：主模型需要看图时调用它，工具把图片交给外部
 * 视觉模型（经 DSH 内置 pi-ai 适配器），返回纯文字描述。
 *
 * 装载：cordis.yml 中登记本包（见 README「安装」）。启动时由 DSH 自动加载。
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "vision-plugin";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map