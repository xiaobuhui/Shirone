import { expect, test } from "@playwright/test";

/**
 * 友链页功能锁定（pages/friends.astro -> organisms/FriendSection.svelte，client:only）。
 * 视觉约束对齐站点设计语言：PageHeader 页内大标题（装饰图标）、胶囊搜索条、
 * 官方 Chips 筛选原子、PostCard 风格卡片（hover 箭头 + #tag 弱文本标签）、
 * 筛选状态 URL 同步（?q= / ?tag=）。
 * 数据来自 src/data/friends.ts（getFriendsList 稳定顺序），断言基于默认数据集；
 * 站点语言 zh_CN（siteConfig.lang），文案/标签断言与 zh_CN 及内容仓 data/friends.ts 保持一致。
 */

const FRIEND_COUNT = 1;

test.describe("友链页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/friends/");
		await expect(page.locator(".friend-card")).toHaveCount(FRIEND_COUNT);
	});

	test("渲染友链卡片（整卡可点，标题 / 描述 / 标签）", async ({ page }) => {
		const first = page.locator(".friend-card").first();
		await expect(first).toHaveAttribute("href", "https://mizuki.mysqil.com");
		await expect(first).toHaveAttribute("target", "_blank");
		await expect(first).toContainText("Mizuki");
		await expect(first).toContainText(
			"另一款基于 Fuwari 的博客主题，带文档",
		);
		await expect(first.locator(".friend-card__tag").first()).toHaveText(
			"#博客",
		);
	});

	test("使用站点统一的友链视觉结构", async ({ page }) => {
		// PageHeader 封装的大标题（带装饰图标）
		await expect(page.locator(".page-header")).toHaveCount(1);
		await expect(page.locator(".page-header__title")).toHaveText("友链");
		await expect(page.locator(".page-header__icon svg")).toHaveCount(1);
		// PostCard 式箭头（chevron，hover 右滑）
		await expect(page.locator(".friend-card__arrow")).toHaveCount(FRIEND_COUNT);
		// 官方 Chips 原子（filter 形态）承担标签筛选
		// 数量 = 数据里出现的去重标签数（当前仅"博客""主题"）
		await expect(
			page.locator(".friend-section__chips .m3-chip--filter"),
		).toHaveCount(2);
		// 换链说明为 PageHeader 副标题
		await expect(page.locator(".page-header__subtitle")).toBeVisible();
		await expect(page.locator(".page-header__subtitle")).toContainText(
			"交换友链",
		);
	});

	test("筛选状态同步到 URL（?q= / ?tag=）", async ({ page }) => {
		await page.locator(".friend-section__search input").fill("Mizuki");
		await expect(page).toHaveURL(/[?&]q=Mizuki/);
		await page.getByRole("button", { name: "博客", exact: true }).click();
		await expect(page).toHaveURL(/[?&]tag=%E5%8D%9A%E5%AE%A2/);
		await page.locator(".friend-section__search input").fill("");
		await expect(page).toHaveURL(/[?&]tag=%E5%8D%9A%E5%AE%A2/);
	});

	test("单选标签筛选（再点取消恢复全部，aria-pressed 同步）", async ({
		page,
	}) => {
		const blogFilter = page.getByRole("button", { name: "博客", exact: true });
		await blogFilter.click();
		await expect(blogFilter).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator(".friend-card")).toHaveCount(1);
		await expect(page.getByText("Mizuki", { exact: true })).toBeVisible();
		await blogFilter.click();
		await expect(page.locator(".friend-card")).toHaveCount(FRIEND_COUNT);
		await expect(blogFilter).toHaveAttribute("aria-pressed", "false");
	});

	test("搜索过滤 + 空态", async ({ page }) => {
		await page.locator(".friend-section__search input").fill("Fuwari");
		await expect(page.locator(".friend-card")).toHaveCount(1);
		await page.locator(".friend-section__search input").fill("no such site");
		await expect(page.locator(".friend-section__empty")).toBeVisible();
	});
});

test.describe("友链页 Swup 导航", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test("重复进入后保持组件样式和加载指示器居中", async ({ page }) => {
		await page.goto("/", { waitUntil: "networkidle" });

		for (let visit = 0; visit < 3; visit++) {
			await page.locator('#top-row a[href="/friends/"]').click();
			await expect(page).toHaveURL(/\/friends\/$/);
			const list = page.locator(".friend-section__list");
			await expect(page.locator(".friend-card")).toHaveCount(FRIEND_COUNT);
			await expect(list).toHaveCSS("display", "grid");
			await expect(list).toHaveCSS("gap", "16px");
			await expect(list).toHaveCSS(
				"grid-template-columns",
				/\d+(\.\d+)?px \d+(\.\d+)?px/,
			);

			const blogFilter = page.getByRole("button", {
				name: "博客",
				exact: true,
			});
			await blogFilter.click();
			// 过渡指示器是瞬态节点（三段过渡结束即移除），断言必须原子化：
			// 单次 evaluate 内同时取到加载容器与指示器，并校验尺寸与居中偏移。
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							const loading = document.querySelector(
								".friend-section__loading",
							) as HTMLElement | null;
							const indicator = loading?.querySelector(
								".m3-loading",
							) as HTMLElement | null;
							if (!loading || !indicator) return false;
							const style = getComputedStyle(indicator);
							const outer = loading.getBoundingClientRect();
							const inner = indicator.getBoundingClientRect();
							// 只锁定水平居中（容器留白导致垂直方向有固定 12px 偏移，非缺陷）
							return (
								style.width === "64px" &&
								style.height === "64px" &&
								Math.abs(
									outer.x + outer.width / 2 - (inner.x + inner.width / 2),
								) <= 1
							);
						}),
					{ timeout: 10000, message: "等待加载指示器出现并测量居中" },
				)
				.toBe(true);

			await page.locator('#top-row a[data-nav-key="home"]').click();
			await expect(page).toHaveURL(/\/$/);
		}
	});
});
