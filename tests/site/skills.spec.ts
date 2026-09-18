import { expect, test } from "@playwright/test";
import { skillsConfig } from "../../src/config/skillsConfig";
import { skillsData } from "../../src/data/skills";

/**
 * 计数与分类清单从真实数据推导，不写死数字 —— 站主往 data/skills.ts 里
 * 增删技能后，这里断言的是「渲染结果与数据一致」，而不是某个具体数字。
 */
const SKILL_COUNT = skillsData.length;
const FRONTEND_COUNT = skillsData.filter(
	(skill) => skill.category === "frontend",
).length;
/** 有对应技能条目的分类才会渲染成 chip / 分组，见 SkillSection.svelte 的 activeCategories。 */
const ACTIVE_CATEGORIES = skillsConfig.categories.filter((category) =>
	skillsData.some((skill) => skill.category === category.key),
);
const ACTIVE_CATEGORY_COUNT = ACTIVE_CATEGORIES.length;
/** 分组的期望顺序 = config 里 categories 的数组顺序（页面不硬编码分组顺序）。 */
const EXPECTED_GROUP_LABELS = ACTIVE_CATEGORIES.map((category) => category.label);
/** 分组标题（SectionTitle）里的文字。 */
const GROUP_TITLE = ".skills-group .section-title__title";
/** 组内相对选择器：给 section.locator() 用，不能再带 .skills-group 前缀。 */
const GROUP_TITLE_INNER = ".section-title__title";

/** 熟练度枚举 -> 页面显示文案（对齐 zh_CN 语言包）与离散格数。 */
const LEVEL_TEXT = {
	beginner: { label: "入门", value: 1 },
	intermediate: { label: "熟悉", value: 2 },
	advanced: { label: "熟练", value: 3 },
	expert: { label: "精通", value: 4 },
} as const;

/** 挑一个等级最高的条目做展示校验，避免写死具体技能名。 */
const TOP_LEVEL = Math.max(
	...skillsData.map((skill) => LEVEL_TEXT[skill.level].value),
);
const SAMPLE_SKILL = skillsData.find(
	(skill) => LEVEL_TEXT[skill.level].value === TOP_LEVEL,
)!;

test.describe("技能页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/skills/");
		await expect(page.locator(".skill-card")).toHaveCount(SKILL_COUNT);
	});

	test("渲染配置技能与离散熟练度", async ({ page }) => {
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"skills",
		);
		await expect(page.locator(".page-header__title")).toHaveText("技能");
		await expect(page.locator(".skills-section__count")).toHaveText(
			`${SKILL_COUNT} 项技能`,
		);

		const meta = LEVEL_TEXT[SAMPLE_SKILL.level];
		const sample = page.locator(".skill-card", {
			hasText: SAMPLE_SKILL.name,
		});
		await expect(sample).toContainText(meta.label);
		await expect(sample.getByRole("meter")).toHaveAttribute(
			"aria-valuenow",
			String(meta.value),
		);
		await expect(
			sample.locator(".skill-card__segment--active"),
		).toHaveCount(meta.value);
	});

	test("每张技能卡都有图标或字母兜底", async ({ page }) => {
		const cards = page.locator(".skill-card");
		const total = await cards.count();
		for (let index = 0; index < total; index++) {
			const iconBox = cards.nth(index).locator(".skill-card__icon");
			// 图标名不在离线集合里时 <svg> 是空的，此时应退回名称首字母。
			const hasSvg = await iconBox.locator("svg").count();
			const hasFallback = await iconBox.locator("span").count();
			expect(hasSvg + hasFallback).toBeGreaterThan(0);
		}
	});

	test("技能按分类分组陈列，分组顺序与配置一致", async ({ page }) => {
		// 分组顺序不硬编码在组件里，而是 = categories 顺序，因此这里按同一规则算期望值。
		await expect(page.locator(GROUP_TITLE)).toHaveText(EXPECTED_GROUP_LABELS);

		// 每个分组的卡片数 = 该分类下的条目数；总和即全部技能。
		let sum = 0;
		for (const category of ACTIVE_CATEGORIES) {
			const group = page.locator(`.skills-group[data-skill-group="${category.key}"]`);
			const count = skillsData.filter((skill) => skill.category === category.key).length;
			sum += count;
			await expect(group.locator(".skill-card")).toHaveCount(count);
			await expect(group.locator(GROUP_TITLE_INNER)).toHaveText(category.label);
		}
		expect(sum).toBe(SKILL_COUNT);
	});

	test("分类 chips 与配置的分类清单一致且每项都有图标", async ({ page }) => {
		// 只有「有对应技能条目」的分类才渲染，因此按同一规则算期望值。
		const expected = ACTIVE_CATEGORIES.map((category) => category.label);

		const chips = page.locator(".skills-section__filters button");
		await expect(chips).toHaveCount(expected.length);
		await expect(chips).toHaveText(expected);

		// 图标是离线内联打包的：YAML 里写了名字但没登记到 data/custom-icons.ts 时，
		// 图标容器还在、<svg> 却是空的（且不报错）。这里逐个卡住。
		for (let index = 0; index < expected.length; index++) {
			await expect(chips.nth(index).locator("svg")).toHaveCount(1);
		}
	});

	test("分组标题的图标与配置一致（防止 YAML 写了名字却漏登记）", async ({ page }) => {
		for (const category of ACTIVE_CATEGORIES) {
			const icon = page.locator(
				`.skills-group[data-skill-group="${category.key}"] .section-title__icon`,
			);
			await expect(icon.locator("svg")).toHaveCount(1);
		}
	});

	test("分类 chips 可筛选并再次点击恢复全部", async ({ page }) => {
		const frontend = page.getByRole("button", {
			name: "前端",
			exact: true,
		});
		await frontend.click();
		await expect(frontend).toHaveAttribute("aria-pressed", "true");
		// 选中后只保留该分组；过渡结束时 loading 指示器退场、分组重新揭幕。
		await expect(page.locator(".skills-section__loading")).toHaveCount(0);
		await expect(page.locator(".skill-card")).toHaveCount(FRONTEND_COUNT);
		await expect(page.locator(GROUP_TITLE)).toHaveText(["前端"]);

		await frontend.click();
		await expect(frontend).toHaveAttribute("aria-pressed", "false");
		await expect(page.locator(".skills-section__loading")).toHaveCount(0);
		await expect(page.locator(".skill-card")).toHaveCount(SKILL_COUNT);
		await expect(page.locator(GROUP_TITLE)).toHaveText(EXPECTED_GROUP_LABELS);
	});

	test("侧栏页面过滤与直接加载导航高亮正确", async ({ page }) => {
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
		await expect(
			page.locator('[data-nav-key="skills"]').first(),
		).toHaveAttribute("aria-current", "page");
	});
});

test.describe("技能页 Swup 导航", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test("从持久顶栏进入后同步页面、导航与侧栏状态", async ({ page }) => {
		await page.goto("/compass/", { waitUntil: "domcontentloaded" });
		await page.getByRole("button", { name: "更多", exact: true }).click();
		await page.locator('a[data-nav-key="skills"]').click();

		await expect(page).toHaveURL(/\/skills\/$/);
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"skills",
		);
		await expect(page.locator(".skill-card")).toHaveCount(SKILL_COUNT);
		await expect(page.locator(GROUP_TITLE)).toHaveText(EXPECTED_GROUP_LABELS);
		await expect(page.locator('a[data-nav-key="skills"]')).toHaveAttribute(
			"aria-current",
			"page",
		);
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});
});

// ACTIVE_CATEGORY_COUNT 供后续按分类数扩展用例时复用。
void ACTIVE_CATEGORY_COUNT;
