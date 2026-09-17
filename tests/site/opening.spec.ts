import { expect, test } from "@playwright/test";
import { reduceMotion } from "../fixtures/motion";

/**
 * 首页开场动画（Opening Cinema）—— 组件见 src/components/organisms/OpeningCinema.astro。
 *
 * 站点已在内容仓 `config/opening-animation.yaml` 打开 `enable: true`。
 * 若把那个开关关掉，本文件除「非首页不渲染」外的用例都会失败 —— 这是预期行为。
 */

const CINEMA_ID = "opening-cinema";
const CINEMA = `#${CINEMA_ID}`;
/** 会话内只播一次的标记键，与 src/utils/opening-animation.ts 的 OPENING_SEEN_KEY 一致。 */
const SEEN_KEY = "shirone-opening-played.v1";
/** 一次性「强制播放」标记键，与 OPENING_FORCE_KEY 一致；播完必须已被清掉。 */
const FORCE_KEY = "shirone-opening-force.v1";
/** 整段动画时长（配置默认 4120ms）之外的等待余量。 */
const PLAY_THROUGH = 12_000;

/** 动画只允许加载站内资源：任何外部请求都视为破坏了「离线可用」的约定。 */
function isExternal(url: string): boolean {
	return !(
		/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url) ||
		url.startsWith("data:") ||
		url.startsWith("blob:")
	);
}

test.describe("开场动画 · SSR 直出", () => {
	test("服务端渲染出遮罩，并带 noscript 兜底隐藏", async ({ request }) => {
		const html = await (await request.get("/")).text();
		expect(html).toContain(`id="${CINEMA_ID}"`);
		// 彩色揭示层：没有它就只有灰阶、没有径向扩散。
		expect(html).toContain("opening-cinema__image--reveal");
		// 站点名逐字落下，字符由 SSR 输出而非脚本生成，避免首帧空窗。
		expect(html).toContain("opening-cinema__char");
		// 无 JS 时遮罩不会自行退场，必须由 noscript 隐藏，否则页面被永久遮挡。
		expect(html).toContain(`#${CINEMA_ID}{display:none}`);
	});

	test("非首页不渲染遮罩", async ({ request }) => {
		const html = await (await request.get("/about/")).text();
		expect(html).not.toContain(`id="${CINEMA_ID}"`);
	});
});

test.describe("开场动画 · 播放与退场", () => {
	test("播完自动撤下遮罩、解锁滚动，且全程零外部请求", async ({ page }) => {
		const external: string[] = [];
		page.on("request", (request) => {
			if (isExternal(request.url())) external.push(request.url());
		});

		await page.goto("/", { waitUntil: "commit" });
		await expect(page.locator(CINEMA)).toBeAttached();
		await expect
			.poll(() =>
				page.evaluate(() => document.documentElement.style.overflow),
			)
			.toBe("hidden");

		await expect(page.locator(CINEMA)).toHaveCount(0, {
			timeout: PLAY_THROUGH,
		});
		await expect
			.poll(() => page.evaluate(() => document.documentElement.style.overflow))
			.not.toBe("hidden");
		expect(external).toEqual([]);
	});

	test("同一标签页再次加载不再重播", async ({ page }) => {
		await page.goto("/", { waitUntil: "commit" });
		// 标记在动画「完整播完」时才写入，所以这里直接等标记。
		// 不能拿元素消失当判据：dev 下 Vite 重载会让元素短暂消失，会误判。
		await expect
			.poll(
				() => page.evaluate((key) => sessionStorage.getItem(key), SEEN_KEY),
				{ timeout: PLAY_THROUGH },
			)
			.toBe("1");

		await page.reload({ waitUntil: "load" });
		// 给脚本留出执行时间：元素若会被渲染，这段时间足够它出现。
		await page.waitForTimeout(800);
		await expect(page.locator(CINEMA)).toHaveCount(0);
	});

	test("动画中途被整页重载打断，下一次加载会重播", async ({ page }) => {
		/** 动画是否真正起步：彩色揭示层离开 0%（脚本未执行时 CSS 默认就停在 0%）。 */
		const started = () =>
			page.evaluate(() => {
				const reveal = document.querySelector(".opening-cinema__image--reveal");
				const clip = reveal ? getComputedStyle(reveal).clipPath : "";
				return clip !== "" && !clip.startsWith("circle(0%");
			});

		await page.goto("/", { waitUntil: "commit" });
		await expect.poll(started, { timeout: PLAY_THROUGH }).toBe(true);

		// 关键断言：动画进行中不得写入「已播过」标记。若在启动那一刻就写入，中途整页重载
		// 会让该标签页整轮会话都被误判为已播 —— dev 冷启动时 Vite 重新预构建依赖会强制
		// 刷新 2~3 次，正好踩中这一点。
		expect(
			await page.evaluate((key) => sessionStorage.getItem(key), SEEN_KEY),
		).toBeNull();

		await page.reload({ waitUntil: "commit" });
		// 重载后应当重新开演，而不是因标记已落地而直接消失。
		await expect.poll(started, { timeout: PLAY_THROUGH }).toBe(true);
	});
});

test.describe("开场动画 · 重播入口", () => {
	test("显示设置面板能重播开场动画", async ({ page }) => {
		await page.setViewportSize({ width: 1600, height: 1000 });

		// 先让首页把动画播完，标记落盘。
		await page.goto("/", { waitUntil: "commit" });
		await expect
			.poll(
				() => page.evaluate((key) => sessionStorage.getItem(key), SEEN_KEY),
				{ timeout: PLAY_THROUGH },
			)
			.toBe("1");

		// 换到非首页：遮罩不参与 SSR，所以此处根本没有可播的东西。
		await page.goto("/about/", { waitUntil: "load" });
		await expect(page.locator(CINEMA)).toHaveCount(0);

		await page.locator("#display-settings-switch").click();
		const replay = page
			.locator("#display-setting")
			.getByText("重播开场动画");
		await replay.waitFor({ state: "visible", timeout: 10_000 });

		await Promise.all([
			page.waitForURL((target) => new URL(target).pathname === "/", {
				timeout: 15_000,
			}),
			replay.click(),
		]);

		// 刚回到首页：标记必须已被清空 —— 否则说明重播被旧标记挡住了。
		expect(
			await page.evaluate((key) => sessionStorage.getItem(key), SEEN_KEY),
		).toBeNull();
		await expect(page.locator(CINEMA)).toBeAttached();
		// 完整播完之后标记才重新落盘，证明这一轮真的跑完了而不是被撤掉。
		await expect
			.poll(
				() => page.evaluate((key) => sessionStorage.getItem(key), SEEN_KEY),
				{ timeout: PLAY_THROUGH },
			)
			.toBe("1");
	});
});

test.describe("开场动画 · 响应式与降级", () => {
	test("移动端取用竖版图，标题块居中且字号与横幅同量级", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/", { waitUntil: "commit" });
		await expect(page.locator(CINEMA)).toBeAttached();

		// 等样式表真正生效再量：默认 16px 说明还没应用（`commit` 只保证导航已提交）。
		await page.waitForFunction(
			() => {
				const title = document.querySelector<HTMLElement>(
					".opening-cinema__title",
				);
				return !!title && Number.parseFloat(getComputedStyle(title).fontSize) > 20;
			},
			null,
			{ timeout: 10_000, polling: 30 },
		);

		const measured = await page.evaluate((id) => {
			const root = document.getElementById(id);
			const title = root?.querySelector<HTMLElement>(".opening-cinema__title");
			const greeting = root?.querySelector<HTMLElement>(
				".opening-cinema__greeting",
			);
			if (!root || !title || !greeting) return null;
			const titleBox = title.getBoundingClientRect();
			const greetingBox = greeting.getBoundingClientRect();
			return {
				image: getComputedStyle(root).getPropertyValue("--oc-img"),
				titleTopVar: getComputedStyle(root)
					.getPropertyValue("--oc-title-top")
					.trim(),
				titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
				greetingSize: Number.parseFloat(getComputedStyle(greeting).fontSize),
				blockCenter: (titleBox.top + greetingBox.bottom) / 2,
				viewportCenter: window.innerHeight / 2,
			};
		}, CINEMA_ID);

		expect(measured?.image).toContain("mobile");
		// 2026-09-17：原先为躲开竖图中间那条黄/粉白交界，标题被上移到 21%；
		// 站主要求「别怕遮住图片内容，放中间」→ 改回居中（改用 flex 居中，不再是魔法变量）。
		expect(measured?.titleTopVar).toBe("");
		// 字号向首页横幅看齐（移动端横幅 h1 = 38.5px），原先是 19px / 12.5px。
		expect(measured?.titleSize ?? 0).toBeGreaterThanOrEqual(36);
		expect(measured?.greetingSize ?? 0).toBeGreaterThanOrEqual(13);
		// 标题 + 问候语作为**一个整体**居中：中心与视口中线误差 < 12px
		expect(
			Math.abs((measured?.blockCenter ?? 0) - (measured?.viewportCenter ?? 0)),
		).toBeLessThan(12);
	});

	test("标题与问候语压在图片层之上（不被遮罩内部的图片吃掉）", async ({ page }) => {
		await page.goto("/", { waitUntil: "commit" });
		await expect(page.locator(CINEMA)).toBeAttached();

		// 等问候语真的开始打字：宽度为 0 时命中测试无从谈起。
		await page.waitForFunction(
			() => {
				const el = document.querySelector<HTMLElement>(".opening-cinema__type");
				return !!el && el.offsetWidth > 40;
			},
			null,
			{ timeout: PLAY_THROUGH, polling: 50 },
		);

		const hits = await page.evaluate(() => {
			const topAt = (selector: string) => {
				const el = document.querySelector<HTMLElement>(selector);
				if (!el) return "missing";
				const box = el.getBoundingClientRect();
				const top = document.elementFromPoint(
					box.x + box.width / 2,
					box.y + box.height / 2,
				);
				if (!top) return "nothing";
				return el === top || el.contains(top)
					? "on-top"
					: `covered-by:${top.className}`;
			};
			return {
				title: topAt(".opening-cinema__title"),
				greeting: topAt(".opening-cinema__greeting"),
			};
		});

		// 标题块是普通流内元素，而图片三层是绝对定位 —— 不显式 z-index 就会被盖住，
		// 且症状极隐蔽：DOM 在、尺寸正常、颜色正常，屏幕上却什么都看不到（2026-09-17 踩过）。
		expect(hits.title).toBe("on-top");
		expect(hits.greeting).toBe("on-top");
	});

	test("打开「减少动态效果」时直接不出现", async ({ page }) => {
		await reduceMotion(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		// 元素不存在也算 hidden —— CSS 层隐藏与脚本移除都满足这条约定。
		await expect(page.locator(CINEMA)).toBeHidden();
	});

	test("「减少动态效果」打开时，重播入口仍强行播一遍", async ({ page }) => {
		await page.setViewportSize({ width: 1600, height: 1000 });
		await reduceMotion(page);

		// 降级态下首页本来不播，所以从非首页进设置面板点重播。
		await page.goto("/about/", { waitUntil: "load" });
		await page.locator("#display-settings-switch").click();
		const replay = page.locator("#display-setting").getByText("重播开场动画");
		await replay.waitFor({ state: "visible", timeout: 10_000 });

		await Promise.all([
			page.waitForURL((target) => new URL(target).pathname === "/", {
				timeout: 15_000,
			}),
			replay.click(),
		]);

		// 关键断言：遮罩得**真的显示**出来。降级规则若没被越过，这里会停在 display:none。
		await expect(page.locator(CINEMA)).toBeVisible();
		// 而且是「完整播完」而不是被撤掉 —— 只有跑完全程才会落标记。
		await expect
			.poll(
				() => page.evaluate((key) => sessionStorage.getItem(key), SEEN_KEY),
				{ timeout: PLAY_THROUGH },
			)
			.toBe("1");
		// 一次性：播完必须已清，否则此后每次加载都会绕过降级开关。
		expect(
			await page.evaluate((key) => sessionStorage.getItem(key), FORCE_KEY),
		).toBeNull();
	});
});

/** 时段分档：本地小时 → 问候语开头（与 zh_CN 语言包一致）。 */
const GREETING_SLOTS: Array<[number, string]> = [
	[2, "夜深了"],
	[8, "早上好"],
	[12, "中午好"],
	[15, "下午好"],
	[20, "晚上好"],
	[23, "夜深了"],
];

test.describe("开场动画 · 文案分档与无脚本兜底", () => {
	for (const [hour, word] of GREETING_SLOTS) {
		test(`本地 ${hour} 点显示「${word}」`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width: 1280, height: 900 },
			});
			// 只钉住 getHours：访客本地时钟是选文案的唯一输入。
			await context.addInitScript((pinned) => {
				Date.prototype.getHours = () => pinned;
			}, hour);
			const page = await context.newPage();
			await page.goto("/", { waitUntil: "load" });
			await expect(page.locator(".opening-cinema__type")).toContainText(word, {
				timeout: 5_000,
			});
			await context.close();
		});
	}

	test("禁用 JavaScript 时遮罩不遮挡页面", async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto("/", { waitUntil: "load" });
		// noscript 里的样式必须生效，否则无 JS 的访客会被永久挡在门外。
		await expect(page.locator(CINEMA)).toBeHidden();
		await expect(page.locator("#swup-container")).toBeVisible();
		await context.close();
	});
});
