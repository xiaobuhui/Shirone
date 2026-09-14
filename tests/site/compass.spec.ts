import { expect, test } from "@playwright/test";

/**
 * 站点罗盘页功能锁定（pages/compass.astro -> organisms/CompassSection -> molecules/CompassTile，client:only）。
 * 筛选与站内 friends/moments/anime 同一交互语言：
 * 分组 filter chips 单选（再点取消恢复全部）切换时走站内同款 LoadingIndicator 三段过渡
 * （loading → 淡出 → stagger 揭幕）；搜索即时过滤（每键收放，不闪加载器，与 MomentSection 分工一致），
 * 状态同步 URL（?group= / ?q=），刷新/分享/回退保留。
 * 分组标题与瓷砖均用站内既有语言（SectionTitle + card-bg 竖向卡），不引入额外装置。
 *
 * 数据来自 src/data/compass.ts（用户数据：11 组 / 88 条，内容仓 data/compass.ts 为源）。
 * 断言与内容仓 `data/compass.ts` 保持一致 —— 改数据后必须同步本文件。
 * 图标三态覆盖：本地图片（icon 为 "/images/compass/*.png"）、矢量（Iconify 名）、
 * 首字母兜底（全量数据里仅「常用工具 > Squoosh」一条，无 icon 也未配图片）。
 * 注意：用户数据里 88 条**全部**带 note，因此不再断言「无 note 时副行回退域名」。
 */

const SHELVES: { key: string; name: string; count: number }[] = [
	{ key: "dev", name: "项目管理", count: 5 },
	{ key: "ai", name: "AI助手", count: 8 },
	{ key: "ai-tools", name: "常用AI工具", count: 8 },
	{ key: "design", name: "设计", count: 9 },
	{ key: "tools", name: "常用工具", count: 8 },
	{ key: "learn", name: "学习知识库", count: 16 },
	{ key: "note", name: "笔记相关", count: 3 },
	{ key: "frontend", name: "前端资源库", count: 17 },
	{ key: "skill", name: "常用Skills", count: 6 },
	{ key: "mcp", name: "常用mcp", count: 5 },
	{ key: "reads", name: "阅读", count: 3 },
];

const ENTRY_COUNT = 88;
/** 除「笔记相关」外的其余分组 key，供筛选后断言「其余分组不渲染」 */
const OTHER_KEYS = SHELVES.filter((s) => s.key !== "note").map((s) => s.key);

test.describe("站点罗盘页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/compass/");
		await expect(page.locator(".compass-tile")).toHaveCount(ENTRY_COUNT);
	});

	test("渲染分组与瓷砖（SectionTitle 标题行 / 每组条数 / 外链 / 图标三态 / 计数行）", async ({
		page,
	}) => {
		// 11 个分组 section，每组 tile 数与数据源一致；标题行为站内 SectionTitle
		for (const shelf of SHELVES) {
			await expect(
				page.locator(`section[data-shelf="${shelf.key}"]`),
			).toHaveCount(1);
			await expect(
				page.locator(`section[data-shelf="${shelf.key}"] .compass-tile`),
			).toHaveCount(shelf.count);
			await expect(
				page.locator(`section[data-shelf="${shelf.key}"] .section-title__title`),
			).toHaveText(shelf.name);
		}

		// 首 tile（项目管理 > GitHub）：label / note / 外链 / 新标签页
		const first = page.locator(".compass-tile").first();
		await expect(first.locator(".compass-tile__label")).toHaveText("GitHub");
		await expect(first.locator(".compass-tile__note")).toHaveText("代码托管与协作");
		await expect(first.locator("a.compass-tile__link")).toHaveAttribute(
			"href",
			"https://github.com",
		);
		await expect(first.locator("a.compass-tile__link")).toHaveAttribute(
			"target",
			"_blank",
		);
		await expect(first.locator("a.compass-tile__link")).toHaveAttribute(
			"rel",
			/noopener/,
		);
		// 图标形态一：Iconify 矢量 → svg。
		// @iconify/svelte 客户端图标数据异步加载，断言放宽超时避免慢网络下误报
		await expect(first.locator(".compass-tile__icon svg")).toHaveCount(1, {
			timeout: 15_000,
		});

		// 图标形态二：本地图片（icon 为 /images/compass/*.png）→ img，不渲染 svg
		const aiFirst = page.locator('section[data-shelf="ai"] .compass-tile').first();
		await expect(aiFirst.locator(".compass-tile__label")).toHaveText("豆包");
		await expect(aiFirst.locator(".compass-tile__icon img")).toHaveAttribute(
			"src",
			/\/images\/compass\/doubao\.png$/,
		);
		await expect(aiFirst.locator(".compass-tile__icon svg")).toHaveCount(0);

		// 图标形态三：首字母兜底（全量数据里唯一一条无图标的条目）→ tonal 块内大写首字母
		const squoosh = page
			.locator('section[data-shelf="tools"] .compass-tile')
			.nth(6);
		await expect(squoosh.locator(".compass-tile__label")).toHaveText("Squoosh");
		await expect(squoosh.locator(".compass-tile__letter")).toHaveText("S");
		await expect(squoosh.locator(".compass-tile__icon svg")).toHaveCount(0);
		await expect(squoosh.locator(".compass-tile__icon img")).toHaveCount(0);

		// 计数行（totalCount > 1 时渲染）
		await expect(page.locator(".compass-section__count")).toHaveText(
			"88 个站点",
		);
	});

	test("分组筛选：chips 单选过滤（三段 Loading 过渡 + 再点取消恢复，URL ?group= 同步）", async ({
		page,
	}) => {
		const noteChip = page.getByRole("button", {
			name: "笔记相关",
			exact: true,
		});
		// 选中 → 三段过渡（contained 指示器展示后淡出），收敛后只剩该组 + aria-pressed + URL 同步
		await noteChip.click();
		await expect(noteChip).toHaveAttribute("aria-pressed", "true");
		await expect(page).toHaveURL(/[?&]group=note/);
		await expect(
			page.locator(".compass-section__loading .m3-loading--contained"),
		).toBeVisible();
		await expect(page.locator(".compass-tile")).toHaveCount(3);
		await expect(page.locator(".compass-section__loading")).toHaveCount(0);
		await expect(page.locator('section[data-shelf="note"]')).toBeVisible();
		for (const key of OTHER_KEYS) {
			await expect(page.locator(`section[data-shelf="${key}"]`)).toHaveCount(0);
		}
		// 再点取消 → 恢复全部 + URL 参数移除
		await noteChip.click();
		await expect(noteChip).toHaveAttribute("aria-pressed", "false");
		await expect(page.locator(".compass-tile")).toHaveCount(ENTRY_COUNT);
		await expect(page).not.toHaveURL(/group=/);
	});

	test("深链恢复筛选（?group= / ?group= + ?q= 叠加）与未知分组空态", async ({
		page,
	}) => {
		await page.goto("/compass/?group=reads");
		await expect(
			page.getByRole("button", { name: "阅读", exact: true }),
		).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator(".compass-tile")).toHaveCount(3);
		await expect(page.locator(".compass-tile__label").first()).toHaveText(
			"Hacker News",
		);

		// 分组筛选与搜索可叠加：设计组里搜 iconify → 只剩设计组的 Iconify
		await page.goto("/compass/?group=design&q=iconify");
		await expect(page.locator(".compass-tile")).toHaveCount(1);
		await expect(page.locator(".compass-tile__label")).toHaveText("Iconify");
		await expect(page.locator('section[data-shelf="design"]')).toBeVisible();
		for (const key of SHELVES.filter((s) => s.key !== "design").map((s) => s.key)) {
			await expect(page.locator(`section[data-shelf="${key}"]`)).toHaveCount(0);
		}

		// 未知分组值 → 空态文案
		await page.goto("/compass/?group=nonsense");
		await expect(page.locator(".compass-section__empty")).toBeVisible();
		await expect(page.locator(".compass-section__empty")).toContainText(
			"没有符合条件的站点",
		);
	});

	test("搜索过滤（label / note / 域名命中，?q= 同步，清空恢复）", async ({
		page,
	}) => {
		// 站内顶栏搜索框同名 placeholder，限定罗盘页内搜索框
		const search = page.locator(
			'.compass-section__search input[type="search"]',
		);

		// label 命中
		await search.fill("firecrawl");
		await expect(page).toHaveURL(/[?&]q=firecrawl/);
		await expect(page.locator(".compass-tile")).toHaveCount(1);
		await expect(page.locator(".compass-tile__label")).toHaveText("Firecrawl");

		// 清空恢复全部 + URL 参数移除
		await search.fill("");
		await expect(page.locator(".compass-tile")).toHaveCount(ENTRY_COUNT);
		await expect(page).not.toHaveURL(/q=/);

		// note 命中（正则测试与调试 → Regex101）
		await search.fill("正则");
		await expect(page.locator(".compass-tile")).toHaveCount(1);
		await expect(page.locator(".compass-tile__label")).toHaveText("Regex101");

		// 域名命中（news.ycombinator.com → Hacker News）
		await search.fill("news.ycombinator");
		await expect(page.locator(".compass-tile")).toHaveCount(1);
		await expect(page.locator(".compass-tile__label")).toHaveText(
			"Hacker News",
		);
	});

	test("空组隐藏：搜索只命中某组时其余分组不渲染，且计数行隐藏", async ({
		page,
	}) => {
		await page
			.locator('.compass-section__search input[type="search"]')
			.fill("obsidian");
		await expect(page.locator('section[data-shelf="note"]')).toBeVisible();
		for (const key of OTHER_KEYS) {
			await expect(page.locator(`section[data-shelf="${key}"]`)).toHaveCount(0);
		}
		// totalCount === 1 → 计数行整体不渲染
		await expect(page.locator(".compass-section__count")).toHaveCount(0);
	});

	test("无结果空态", async ({ page }) => {
		await page
			.locator('.compass-section__search input[type="search"]')
			.fill("zzzzzz");
		await expect(page.locator(".compass-tile")).toHaveCount(0);
		await expect(page.locator(".compass-section__empty")).toBeVisible();
		await expect(page.locator(".compass-section__empty")).toContainText(
			"没有符合条件的站点",
		);
	});

	test("侧栏 widget 在罗盘页照常渲染（pages 过滤对齐 friends/moments/anime）", async ({
		page,
	}) => {
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});
});
