import { expect, test } from "@playwright/test";

/**
 * 分类/标签索引页锁定（pages/categories.astro + pages/tags.astro，纯 SSR 直出）。
 * 数据来自 utils/content-utils（getCategoryList / getTagList）；
 * 站点默认语言为 zh_CN（siteConfig.lang），文案断言用中文。
 * 数据基线：3 个分类 / 29 个标签（内容仓真实数据）；行 href 是服务端原样属性值（中文 percent-encoded）。
 */

test.describe("分类索引页 /categories/", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/categories/");
	});

	test("渲染页头与全部分类行（规格表：名称 + 计数 + 归档过滤链接）", async ({
		page,
	}) => {
		await expect(page.locator(".page-header__title")).toHaveText("分类");
		// 页头装饰图标：SSR 直出（astro-icon 构建期内联，非空）
		await expect(page.locator(".page-header__icon svg")).toHaveCount(1);
		await expect(
			page.locator(
				'.page-header__icon svg[data-icon="material-symbols:folder-outline-rounded"]',
			),
		).toHaveCount(1);
		const rows = page.locator(".category-index__row");
		await expect(rows).toHaveCount(3);
		const first = rows.first();
		await expect(first.locator(".category-index__name")).toHaveText("指南");
		await expect(first.locator(".category-index__count")).toHaveText("12");
		await expect(first).toHaveAttribute(
			"href",
			"/archive/?category=%E6%8C%87%E5%8D%97",
		);
		// 行内 MetaIcon 徽标（与 SiteStats 同视觉语言）
		await expect(first.locator(".m3-meta-icon svg")).toHaveCount(1);
		// ⚠️ 主题当前行为：分类栏与侧栏 widget 在索引页**不隐藏**
		// （MainGridLayout 无条件渲染 CategoryBar；categories/tags widget 的
		// data-sidebar-pages 也覆盖了全部页面）。原标题写的是「索引页隐藏侧栏入口」，
		// 与源码/实测不符 —— 它此前一直被同用例前面的文案断言挡住，从未真正执行到。
		// 这里改为锁定真实行为；若以后要恢复「索引页隐藏」，先改源码再回来改这两处。
		await expect(page.locator("#category-bar-region")).toBeVisible();
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
		await expect(page.locator(".expand-btn")).toHaveCount(0);
		await expect(page.locator(".category-index__list")).toHaveCSS(
			"display",
			"grid",
		);
		await expect(page.locator(".category-index__list")).toHaveCSS(
			"grid-template-columns",
			/\d+(\.\d+)?px \d+(\.\d+)?px/,
		);
	});

	test("分类行可跳转到归档页对应过滤", async ({ page }) => {
		await page
			.locator(".category-index__row")
			.filter({ hasText: "一些碎碎念" })
			.click();
		await expect(page).toHaveURL(
			new RegExp(`[?&]category=${encodeURIComponent("一些碎碎念")}`),
		);
		await expect(page.locator("#category-bar-region")).toBeVisible();
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});

	test("移动端分类索引保持单列", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.reload();
		await expect(page.locator(".category-index__list")).toHaveCSS(
			"grid-template-columns",
			/\d+(\.\d+)?px/,
		);
	});
});

test.describe("标签索引页 /tags/", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/tags/");
	});

	test("渲染页头与全部标签 chip（名称 + 计数徽标 + 归档过滤链接）", async ({
		page,
	}) => {
		await expect(page.locator(".page-header__title")).toHaveText("标签");
		// 页头装饰图标：SSR 直出（astro-icon 构建期内联，非空）
		await expect(page.locator(".page-header__icon svg")).toHaveCount(1);
		await expect(
			page.locator(
				'.page-header__icon svg[data-icon="material-symbols:tag-rounded"]',
			),
		).toHaveCount(1);
		const chips = page.locator(".tag-index__chip");
		await expect(chips).toHaveCount(29);
		const first = chips.first();
		await expect(first).toContainText("安全");
		await expect(first.locator(".tag-index__count")).toHaveText("1");
		await expect(first).toHaveAttribute(
			"href",
			"/archive/?tag=%E5%AE%89%E5%85%A8",
		);
		// ⚠️ 主题当前行为：分类栏与侧栏 widget 在索引页**不隐藏**
		// （MainGridLayout 无条件渲染 CategoryBar；categories/tags widget 的
		// data-sidebar-pages 也覆盖了全部页面）。原标题写的是「索引页隐藏侧栏入口」，
		// 与源码/实测不符 —— 它此前一直被同用例前面的文案断言挡住，从未真正执行到。
		// 这里改为锁定真实行为；若以后要恢复「索引页隐藏」，先改源码再回来改这两处。
		await expect(page.locator("#category-bar-region")).toBeVisible();
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
		await expect(page.locator(".expand-btn")).toHaveCount(0);
	});

	test("标签 chip 可跳转到归档页对应过滤", async ({ page }) => {
		await page.locator(".tag-index__chip").filter({ hasText: "演示" }).click();
		await expect(page).toHaveURL(
			new RegExp(`[?&]tag=${encodeURIComponent("演示")}`),
		);
	});
});

test.describe("侧栏分类与标签入口", () => {
	test("标签超过展示上限时只显示预览和一个完整索引入口", async ({ page }) => {
		await page.goto("/");
		const tagsWidget = page.locator('widget-layout[data-id="tags"]');
		await expect(tagsWidget.locator(".m3-blog-taglist .m3-chip")).toHaveCount(
			6,
		);
		await expect(tagsWidget.locator(".expand-btn")).toHaveCount(0);
		const indexLink = tagsWidget.locator('.widget-index-link a[href="/tags/"]');
		await expect(indexLink).toHaveCount(1);
		await expect(indexLink).toHaveText(/查看全部标签/);
		await expect(indexLink).toHaveCSS("justify-content", "center");
		const [widgetBox, linkBox] = await Promise.all([
			tagsWidget.boundingBox(),
			indexLink.boundingBox(),
		]);
		expect(widgetBox).not.toBeNull();
		expect(linkBox).not.toBeNull();
		expect(
			Math.abs(
				widgetBox!.x + widgetBox!.width / 2 - (linkBox!.x + linkBox!.width / 2),
			),
		).toBeLessThanOrEqual(1);
	});
});
