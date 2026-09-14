import { expect, test } from "@playwright/test";

/**
 * 归档页筛选面包屑（/archive/?category= 定向浏览视图）。
 * 站点默认语言为 zh_CN，文案断言用中文；数据基线为内容仓真实文章（23 篇 / 3 个分类）。
 * 断言中的 href 是服务端输出的原样（中文经 percent-encoding）属性值。
 */
const CATEGORY_SAMPLE = "例子";
const CATEGORY_SAMPLE_QUERY = `?category=${encodeURIComponent(CATEGORY_SAMPLE)}`;
/** 「例子」分类下的文章数（内容仓真实数据） */
const CATEGORY_SAMPLE_COUNT = 10;

test.describe("archive filter breadcrumb", () => {
	test("uses concise breadcrumb semantics", async ({ page }) => {
		await page.goto(`/archive/${CATEGORY_SAMPLE_QUERY}`);
		const crumb = page.getByRole("navigation", { name: "Breadcrumb" });
		await expect(crumb.locator("ol > li")).toHaveCount(3);
		await expect(crumb.getByRole("link", { name: "分类" })).toHaveAttribute(
			"href",
			"/categories/",
		);
		await expect(crumb.locator('[aria-current="page"]')).toHaveText(
			CATEGORY_SAMPLE,
		);
		await expect(crumb.locator(".archive-panel__crumb-count")).toHaveCount(0);
	});

	test("server-renders archive content before hydration", async ({
		request,
		page,
	}) => {
		const response = await request.get(`/archive/${CATEGORY_SAMPLE_QUERY}`);
		expect(response.ok()).toBe(true);
		const html = await response.text();
		expect(html).toContain("archive-panel");
		expect(html).toContain("m3-blog-archive__group");

		await page.goto(`/archive/${CATEGORY_SAMPLE_QUERY}`);
		await expect(
			page.getByRole("navigation", { name: "Breadcrumb" }),
		).toBeVisible();
		await expect(page.locator(".m3-blog-archive__item")).toHaveCount(
			CATEGORY_SAMPLE_COUNT,
		);
	});

	test("keeps mobile insets and long values inside the archive card", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		const value = "A-category-name-that-is-intentionally-long-for-mobile";
		await page.goto(`/archive/?category=${encodeURIComponent(value)}`);

		const panel = page.locator(".archive-panel");
		const crumb = page.locator(".archive-panel__crumb");
		const current = page.locator(".archive-panel__crumb-current");
		const panelPadding = await panel.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				left: Number.parseFloat(style.paddingLeft),
				right: Number.parseFloat(style.paddingRight),
			};
		});
		expect(panelPadding.left).toBeGreaterThanOrEqual(12);
		expect(panelPadding.right).toBeGreaterThanOrEqual(12);
		await expect(page.locator(".archive-panel__crumb-value")).toHaveAttribute(
			"title",
			value,
		);

		const [panelBox, crumbBox, currentBox] = await Promise.all([
			panel.boundingBox(),
			crumb.boundingBox(),
			current.boundingBox(),
		]);
		expect(panelBox).not.toBeNull();
		expect(crumbBox).not.toBeNull();
		expect(currentBox).not.toBeNull();
		expect(crumbBox!.x).toBeGreaterThanOrEqual(panelBox!.x + panelPadding.left);
		expect(currentBox!.x + currentBox!.width).toBeLessThanOrEqual(
			panelBox!.x + panelBox!.width - panelPadding.right,
		);
		expect(
			await page
				.locator(".archive-panel__crumb-list")
				.evaluate((element) => element.scrollWidth <= element.clientWidth),
		).toBe(true);
	});
});
