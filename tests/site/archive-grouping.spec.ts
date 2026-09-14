import { expect, test } from "@playwright/test";

/**
 * 归档页分组切换（SegmentedButton 落地锁定）：
 * - 单选组语义（role=group + radio，方向键原生支持）；
 * - 三种分组维度（按年份 / 按分类 / 按标签）的组头与计数；
 * - 带 URL 筛选（?category=）时是定向浏览视图：隐藏分组切换、保留面包屑。
 * 组头顺序约定：年份倒序（新→旧）可直接锁定；分类/标签虽然也按名称排序，
 * 但**中文的具体先后取决于浏览器默认 collator** —— 源码用 `a.localeCompare(b)` 未传 locale
 * （ArchivePanel.svelte:163-165），zh-CN 按拼音、en-US 按码点，而 Playwright 上下文默认 en-US。
 * 所以这两处只锁「组内容」与「确实按名称排序」，不锁某一种语言的具体顺序。
 * 数据基线：内容仓真实数据 —— 23 篇文章 / 3 个分类 / 29 个标签。
 */
const ARCHIVE_COUNT = 23;
const ARCHIVE_YEARS = ["2026", "2024", "2023", "2022"];
const ARCHIVE_CATEGORIES = ["例子", "一些碎碎念", "指南"];
const ARCHIVE_TAGS = [
	"#安全",
	"#博客",
	"#步骤",
	"#草稿",
	"#加密",
	"#扩展",
	"#排版",
	"#片段复用",
	"#示例",
	"#视频",
	"#随笔",
	"#碎碎念",
	"#提示框",
	"#图库",
	"#图片网格",
	"#无障碍",
	"#选项卡",
	"#演示",
	"#音频阅读",
	"#折叠面板",
	"#指南",
	"#主题",
	"#注释",
	"#字段卡片",
	"#组件",
	"#Markdown",
	"#MDX",
	"#Mermaid",
	"#Svelte",
];
/** 「例子」分类下的文章数（跨 4 个年份，用于筛选视图断言） */
const CATEGORY_SAMPLE = "例子";
const CATEGORY_SAMPLE_QUERY = `?category=${encodeURIComponent(CATEGORY_SAMPLE)}`;
const CATEGORY_SAMPLE_COUNT = 10;

test.describe("archive grouping switch", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	async function openArchive(
		page: import("@playwright/test").Page,
		path = "/archive/",
	) {
		await page.goto(path, { waitUntil: "networkidle" });
		await page.waitForTimeout(600);
	}

	async function selectGroup(
		page: import("@playwright/test").Page,
		name: string,
	) {
		// SegmentedButton 的 input 是 sr-only 隐藏的，点击可见 label（原生转发到 input）
		await page
			.getByRole("group", { name: "归档分组" })
			.getByText(name, { exact: true })
			.click();
	}

	/** 组头 → 计数文案（对象比较与顺序无关，规避跨 locale 的中文排序差异） */
	async function groupCounts(page: import("@playwright/test").Page) {
		return Object.fromEntries(
			await page.$$eval(".m3-blog-archive__group", (nodes) =>
				nodes.map((node) => [
					node
						.querySelector(".m3-blog-archive__group-title")
						?.textContent?.trim() ?? "",
					node.querySelector(".m3-blog-archive__count")?.textContent?.trim() ?? "",
				]),
			),
		);
	}

	test("renders a labeled radio group with three options, year checked by default", async ({
		page,
	}) => {
		await openArchive(page);

		const group = page.getByRole("group", { name: "归档分组" });
		const radios = group.getByRole("radio");
		await expect(radios).toHaveCount(3);
		await expect(radios.nth(0)).toHaveAccessibleName("按年份");
		await expect(radios.nth(1)).toHaveAccessibleName("按分类");
		await expect(radios.nth(2)).toHaveAccessibleName("按标签");
		await expect(radios.nth(0)).toBeChecked();
		await expect(radios.nth(1)).not.toBeChecked();

		// 默认按年分组：年份倒序，首组为最新年份
		const titles = page.locator(".m3-blog-archive__group-title");
		await expect(titles.first()).toHaveText(ARCHIVE_YEARS[0]);
		await expect(titles).toHaveText(ARCHIVE_YEARS);
		await expect(page.locator(".m3-blog-archive__item")).toHaveCount(
			ARCHIVE_COUNT,
		);
	});

	test("switches grouping to category with counts", async ({ page }) => {
		await openArchive(page);

		await selectGroup(page, "按分类");
		const counts = await groupCounts(page);
		expect(new Set(Object.keys(counts))).toEqual(new Set(ARCHIVE_CATEGORIES));
		expect(counts).toEqual({
			例子: "10 篇文章",
			一些碎碎念: "1 篇文章",
			指南: "12 篇文章",
		});
	});

	test("switches grouping to tag, each prefixed with # and sorted by name", async ({
		page,
	}) => {
		await openArchive(page);

		await selectGroup(page, "按标签");
		const titles = await page
			.locator(".m3-blog-archive__group-title")
			.allTextContents();
		expect(titles).toHaveLength(ARCHIVE_TAGS.length);
		expect(titles.every((title) => title.startsWith("#"))).toBe(true);
		expect(new Set(titles)).toEqual(new Set(ARCHIVE_TAGS));
		// 用页面自身同一个默认 collator 复算，验证「确实按名称排过序」（不锁语言）
		const sorted = await page.evaluate(
			(list) =>
				[...list].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
			titles,
		);
		expect(titles).toEqual(sorted);
	});

	test("arrow keys move selection within the radio group", async ({ page }) => {
		await openArchive(page);

		await page.getByRole("radio", { name: "按年份" }).focus();
		await page.keyboard.press("ArrowRight");
		await expect(page.getByRole("radio", { name: "按分类" })).toBeChecked();
		await page.keyboard.press("ArrowRight");
		await expect(page.getByRole("radio", { name: "按标签" })).toBeChecked();
		await page.keyboard.press("ArrowLeft");
		await expect(page.getByRole("radio", { name: "按分类" })).toBeChecked();
	});

	test("URL filter is a scoped browse view: switch hidden, breadcrumb shown", async ({
		page,
	}) => {
		await openArchive(page, `/archive/${CATEGORY_SAMPLE_QUERY}`);

		// 筛选头保留
		await expect(
			page.getByRole("navigation", { name: "Breadcrumb" }),
		).toBeVisible();
		// 带筛选参数时不渲染分组切换（定向浏览视图，分组控制无意义）
		await expect(page.getByRole("group", { name: "归档分组" })).toHaveCount(0);
		// 直接呈现筛选后的年份时间轴
		await expect(page.locator(".m3-blog-archive__item")).toHaveCount(
			CATEGORY_SAMPLE_COUNT,
		);
		await expect(page.locator(".m3-blog-archive__group-title")).toHaveText(
			ARCHIVE_YEARS,
		);

		// 回到无参数归档页：分组切换恢复
		await openArchive(page);
		await expect(page.getByRole("group", { name: "归档分组" })).toBeVisible();
	});
});
