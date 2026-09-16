/**
 * 动效测试助手：模拟站点显示设置里的「减少动态效果」。
 *
 * 2026-09-16 起全站动效**只看这个开关**（html.motion-reduced + localStorage.mc-motion），
 * 不再读系统 prefers-reduced-motion —— 所以测试里不能再用
 * page.emulateMedia({ reducedMotion: "reduce" }) 模拟了（那个现在完全无效）。
 * 想验证真实系统偏好下的行为，得用 newContext({ reducedMotion: null }) 关掉 Playwright 的模拟。
 *
 * 实现要点：本地存储必须在页面脚本之前写入 —— Layout 的内联启动脚本据此
 * 给 <html> 加 .motion-reduced，首屏就已经是降级态，不用等 Svelte 挂载。
 */
import type { Page } from "@playwright/test";

async function applyMotion(page: Page, reduced: boolean): Promise<void> {
	const value = reduced ? "reduced" : "full";
	await page.addInitScript((v) => {
		try {
			localStorage.setItem("mc-motion", v);
		} catch {
			/* about:blank 等不透明源，忽略 */
		}
	}, value);
	// 页面已在场时（先加载再切开关）同步 DOM，不需要重新导航。
	try {
		await page.evaluate((v) => {
			document.documentElement.classList.toggle("motion-reduced", v === "reduced");
			try {
				localStorage.setItem("mc-motion", v);
			} catch {
				/* 忽略 */
			}
		}, value);
	} catch {
		/* 页面尚未就绪：addInitScript 已覆盖 */
	}
}

/** 打开「减少动态效果」。 */
export async function reduceMotion(page: Page): Promise<void> {
	await applyMotion(page, true);
}

/** 关掉「减少动态效果」（动效全开）。 */
export async function allowMotion(page: Page): Promise<void> {
	await applyMotion(page, false);
}
