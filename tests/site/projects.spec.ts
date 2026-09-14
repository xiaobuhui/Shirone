import { expect, test } from "@playwright/test";

/**
 * 项目页功能锁定。
 * 数据来自 src/data/projects.ts（当前仅 Shirone 一项），断言随之收敛；
 * 站点语言 zh_CN，文案断言与 zh_CN 及内容仓 data/projects.ts 保持一致。
 */
const PROJECT_COUNT = 1;

test.describe("项目页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/projects/");
		await expect(page.locator(".project-card")).toHaveCount(PROJECT_COUNT);
	});

	test("渲染代表项目、阶段、技术栈与源码链接", async ({ page }) => {
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"projects",
		);
		await expect(page.locator(".page-header__title")).toHaveText("项目");
		await expect(page.locator(".projects-section__count")).toHaveText(
			"1 个项目",
		);

		const shirone = page.locator('[data-project="shirone"]');
		await expect(shirone.locator("h2")).toHaveText("Shirone");
		await expect(shirone.locator(".project-card__cover img")).toHaveAttribute(
			"src",
			"/assets/projects/shirone.webp",
		);
		await expect(shirone).toHaveClass(/project-card--featured/);
		await expect(shirone.locator('[data-phase="building"]')).toHaveText(
			"构建中",
		);
		await expect(shirone.locator(".project-card__technologies li")).toHaveCount(
			4,
		);
		await expect(
			shirone.getByRole("link", { name: "查看源码" }),
		).toHaveAttribute("href", "https://github.com/LyraVoid/Shirone");

		// 带封面项目：渲染封面区（不渲染图标瓷砖）
		await expect(shirone.locator(".project-card__cover")).toBeVisible();
		await expect(shirone.locator(".project-card__icon")).toHaveCount(0);
	});

	test("直接加载时导航高亮与侧栏页面过滤正确", async ({ page }) => {
		await expect(
			page.locator('[data-nav-key="projects"]').first(),
		).toHaveAttribute("aria-current", "page");
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});

	test("单一分类时不渲染筛选 chips，数量文案正确", async ({ page }) => {
		// 组件规则：categoryItems.length > 1 才渲染 Chips；
		// 当前数据只有 theme（主题）一个分类，因此筛选器整体不出现。
		// 数据里出现第二个分类后，筛选 chips 会自动回归（届时恢复交互断言）。
		await expect(page.locator(".projects-section__chips")).toHaveCount(0);
		await expect(page.locator(".projects-section__count")).toHaveText(
			"1 个项目",
		);
		await expect(page.locator(".project-card")).toHaveCount(PROJECT_COUNT);
	});

	test("实时搜索过滤、空态与清除（URL ?q= 同步）", async ({ page }) => {
		const searchInput = page.locator(".projects-section__search input");
		await expect(searchInput).toBeVisible();
		await searchInput.fill("Shirone");
		await expect(page.locator(".project-card")).toHaveCount(1);
		await expect(page.locator('[data-project="shirone"]')).toBeVisible();
		await expect(page).toHaveURL(/[?&]q=Shirone/);

		// 无命中：空态
		await searchInput.fill("no such project");
		await expect(page.locator(".projects-section__empty")).toBeVisible();
		await expect(page.locator(".project-card")).toHaveCount(0);

		// 清除搜索恢复全部
		await page.locator(".projects-section__search-clear").click();
		await expect(page.locator(".project-card")).toHaveCount(PROJECT_COUNT);
		await expect(page).not.toHaveURL(/q=/);
	});

	test("桌面与手机布局之间无刷新切换时重置瀑布流定位", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		const grid = page.locator(".projects-section__grid");
		const cards = page.locator(".project-card");

		await expect
			.poll(() =>
				grid.evaluate(
					(element) =>
						getComputedStyle(element)
							.gridTemplateColumns.split(" ")
							.filter(Boolean).length,
				),
			)
			.toBeGreaterThan(1);
		await expect
			.poll(() =>
				cards.evaluateAll((elements) =>
					elements.every(
						(element) =>
							(element as HTMLElement).style.gridColumnStart !== "" &&
							(element as HTMLElement).style.gridRowEnd !== "",
					),
				),
			)
			.toBe(true);
		await expect
			.poll(() =>
				cards.evaluateAll((elements) =>
					elements.every(
						(element) => getComputedStyle(element).gridColumnEnd === "span 1",
					),
				),
			)
			.toBe(true);

		await page.setViewportSize({ width: 390, height: 844 });

		await expect
			.poll(() =>
				grid.evaluate(
					(element) =>
						getComputedStyle(element)
							.gridTemplateColumns.split(" ")
							.filter(Boolean).length,
				),
			)
			.toBe(1);
		await expect
			.poll(() =>
				cards.evaluateAll((elements) =>
					elements.every(
						(element) =>
							(element as HTMLElement).style.gridColumnStart === "" &&
							(element as HTMLElement).style.gridRowEnd === "",
					),
				),
			)
			.toBe(true);
		await expect(cards).toHaveCount(PROJECT_COUNT);
		await expect(page).toHaveURL(/\/projects\/$/);

		await page.setViewportSize({ width: 1280, height: 900 });

		await expect
			.poll(() =>
				cards.evaluateAll((elements) =>
					elements.every(
						(element) =>
							(element as HTMLElement).style.gridColumnStart !== "" &&
							(element as HTMLElement).style.gridRowEnd !== "",
					),
				),
			)
			.toBe(true);
	});

	test("当前数据没有无封面项目，无封面卡片数为 0", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		// 说明：数据里只剩带封面的 Shirone，「无封面卡片技术栈与源码合并同一行」
		// 这条布局规则缺少数据样本。若日后在 data/projects.ts 追加无封面项目，
		// 请恢复该规则的行重叠断言（历史实现见 git 记录）。
		await expect(page.locator(".project-card--without-cover")).toHaveCount(0);
	});
});

test.describe("项目页 Swup 导航", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test("从持久顶栏进入后同步页面、导航与侧栏状态", async ({ page }) => {
		await page.goto("/skills/", { waitUntil: "domcontentloaded" });
		await page.getByRole("button", { name: "更多", exact: true }).click();
		await page.locator('a[data-nav-key="projects"]').click();

		await expect(page).toHaveURL(/\/projects\/$/);
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"projects",
		);
		await expect(page.locator(".project-card")).toHaveCount(PROJECT_COUNT);
		await expect(page.locator('a[data-nav-key="projects"]')).toHaveAttribute(
			"aria-current",
			"page",
		);
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});
});
