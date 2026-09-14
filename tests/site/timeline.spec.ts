import { expect, test } from "@playwright/test";

const TOTAL_COUNT = 1;

test.describe("时间线页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/timeline/");
		await expect(page.locator(".timeline-card")).toHaveCount(TOTAL_COUNT);
	});

	test("渲染时间线事件与元数据", async ({ page }) => {
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"timeline",
		);
		await expect(page.locator(".page-header__title")).toHaveText("时间线");
		await expect(page.locator(".timeline-section__count")).toHaveText(
			`${TOTAL_COUNT} 个节点`,
		);

		const featuredItem = page.locator(".timeline-card--featured").first();
		await expect(featuredItem).toBeVisible();
		await expect(
			featuredItem.locator(".timeline-card__featured-pill"),
		).toBeVisible();
		await expect(featuredItem.locator(".timeline-card__title")).toContainText(
			"Shirone 主题 M3E 架构大改版",
		);
	});

	test("单一分类时不渲染筛选 chips，节点数量正确", async ({ page }) => {
		// 组件规则：categoryItems.length > 1 才渲染 Chips；
		// 当前数据只剩 milestone（里程碑）一个分类，筛选器整体不出现。
		// 数据里出现第二个分类后，筛选 chips 与交互断言应一并恢复。
		await expect(page.locator(".timeline-section__chips")).toHaveCount(0);
		await expect(page.locator(".timeline-section__count")).toHaveText(
			`${TOTAL_COUNT} 个节点`,
		);
		await expect(page.locator(".timeline-card")).toHaveCount(TOTAL_COUNT);
	});

	test("侧栏页面过滤与直接加载导航高亮正确", async ({ page }) => {
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
		await expect(
			page.locator('[data-nav-key="timeline"]').first(),
		).toHaveAttribute("aria-current", "page");
	});
});

test.describe("时间线页 Swup 导航", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test("从持久顶栏进入后同步页面、导航与侧栏状态", async ({ page }) => {
		await page.goto("/compass/", { waitUntil: "domcontentloaded" });
		await page.getByRole("button", { name: "更多", exact: true }).click();
		await page.locator('a[data-nav-key="timeline"]').click();

		await expect(page).toHaveURL(/\/timeline\/$/);
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"timeline",
		);
		await expect(page.locator(".timeline-card")).toHaveCount(TOTAL_COUNT);
		await expect(page.locator('a[data-nav-key="timeline"]')).toHaveAttribute(
			"aria-current",
			"page",
		);
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});
});
