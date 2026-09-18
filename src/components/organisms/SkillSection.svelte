<script lang="ts">
/**
 * 技能页主体（有机体）：页头 + 分类筛选 + 按分类分组的卡片陈列。
 * 数据由页面层构建期传入（本地数据源，零运行时请求）。
 *
 * 分组不硬编码：分组顺序与分组标题直接来自 config 的 categories 数组顺序，
 * 想调整先后只改内容仓 config/skills.yaml，本组件无需改动。
 * 交互与站内 friends/moments/anime/compass 同一语言：
 * - 分类 chips 单选过滤（再点取消恢复全部），切换时走同款 LoadingIndicator
 *   三段过渡（loading → 淡出 → 分组 stagger 揭幕）；
 * - 分组标题用站内 SectionTitle 语言（罗盘/归档同款），不引入额外装置。
 */
import Chips from "@components/atoms/action/Chips.svelte";
import Card from "@components/atoms/display/Card.svelte";
import LoadingIndicator from "@components/atoms/feedback/LoadingIndicator.svelte";
import PageHeader from "@components/molecules/PageHeader.svelte";
import SectionTitle from "@components/molecules/SectionTitle.svelte";
import SkillCard from "@components/molecules/SkillCard.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { SkillCategory, SkillItem } from "@/types/skillsConfig";

let {
	categories = [] as SkillCategory[],
	items = [] as SkillItem[],
}: { categories?: SkillCategory[]; items?: SkillItem[] } = $props();

let selectedCategory = $state("");
/** 分类筛选过渡三段态（站内同款）：loading 展示指示器 → out 指示器淡出 → idle 列表 stagger 揭幕 */
type FilterPhase = "idle" | "loading" | "out";
let phase = $state<FilterPhase>("idle");
let phaseTimers: ReturnType<typeof setTimeout>[] = [];

const enabledItems = $derived(items.filter((item) => item.enable !== false));
/** 只保留有对应条目的分类：空分组连标题一起不渲染（与 chips 的可见性规则一致） */
const activeCategories = $derived(
	categories.filter((category) =>
		enabledItems.some((item) => item.category === category.key),
	),
);
const categoryItems = $derived(
	activeCategories.map((category) => ({
		value: category.key,
		label: category.label,
		leadingIcon: category.icon ?? "",
	})),
);
/** 分组陈列：分组顺序 = categories 顺序；选中某分类时只剩该组 */
const filteredGroups = $derived(
	activeCategories
		.filter((category) => !selectedCategory || category.key === selectedCategory)
		.map((category) => ({
			...category,
			items: enabledItems.filter((item) => item.category === category.key),
		})),
);
const totalCount = $derived(
	filteredGroups.reduce((sum, group) => sum + group.items.length, 0),
);

/** 分类筛选：指示器展示 → 淡出 → 分组 stagger 揭幕（CompassSection 同款三段） */
function onCategoryChange() {
	phaseTimers.forEach(clearTimeout);
	phase = "loading";
	phaseTimers = [
		setTimeout(() => (phase = "out"), 300),
		setTimeout(() => (phase = "idle"), 300 + 150),
	];
}
</script>

<Card color="var(--card-bg)" radius="l" class="skills-section px-8 py-6">
	<PageHeader
		icon="material-symbols:workspaces-outline-rounded"
		title={i18n(I18nKey.skills)}
		subtitle={i18n(I18nKey.skillsBanner)}
	/>

	{#if categoryItems.length > 1}
		<div class="skills-section__filters" aria-label={i18n(I18nKey.skillCategories)}>
			<Chips
				items={categoryItems}
				variant="filter"
				bind:value={selectedCategory}
				onchange={onCategoryChange}
			/>
		</div>
	{/if}

	<p class="skills-section__count">{totalCount} {i18n(I18nKey.skillsCounts)}</p>

	{#if phase !== "idle"}
		<!-- 分类筛选过渡：contained 指示器展示后淡出，再由分组 stagger 揭幕 -->
		<div
			class="skills-section__loading"
			class:skills-section__loading--out={phase === "out"}
		>
			<LoadingIndicator contained size={64} />
		</div>
	{:else}
		<div class="skills-section__groups" aria-live="polite">
			{#each filteredGroups as group (group.key)}
				<section class="skills-group" data-skill-group={group.key}>
					<SectionTitle title={group.label} icon={group.icon} />
					<div class="skills-group__grid">
						{#each group.items as skill, index (skill.name)}
							<SkillCard {skill} delay={Math.min(index, 7) * 45} />
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.skills-section
	display: block

	@media (max-width: bp-sm - 1px)
		padding: 1rem 0.75rem

	&__filters
		padding-bottom: 1rem
		border-bottom: 1px solid var(--outline-variant)

	&__count
		margin: 1rem 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

	/* 分类筛选过渡：区块位置的大号 contained LoadingIndicator（out = 淡出退场） */
	&__loading
		display: flex
		align-items: center
		justify-content: center
		min-height: 11rem
		padding-top: 1.5rem

		&--out
			animation: skills-loading-out var(--m3e-duration-short) var(--m3e-easing-emphasized-accelerate) both

/* 分组：间距 + 站内 SectionTitle 标题行（自带 margin-bottom） */
.skills-group
	margin-top: 1.75rem

/* 列宽与 gap 是一起调的，改一个要重算另一个（两者共同决定「一排放得下几列」）：
   - 定宽轨道 17rem（272px），卡片宽不随视口漂：站内其余列表都是「容器内排满」，
     而技能卡是 4:3 左右的图标卡，宽度固定后每张卡的留白节奏一致，更像卡片墙。
   - gap 保持 1rem：17rem×3 + 1rem×2 = 816 + 32 = 848px > 容器内宽 752px，
     所以 1440 档位只排 2 列、右侧留 96px。这块留白是「卡片够宽」的代价，
     换成 15rem 能吃掉它，但卡片会窄 32px —— 两件事不能同时要。
   - 想改宽度只改下面这一个数，改完重跑 tests/site/skills.spec.ts + 目视各档位：
     16rem → 256px / 1440 三列不留白；18rem → 288px / 1440 两列留白 260px。 */
.skills-group__grid
	display: grid
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 17rem))
	gap: 1rem

	@media (max-width: bp-sm - 1px)
		gap: 0.75rem

/* 指示器退场：淡出 + 轻微收拢（reduced-motion 由全局规则压至终态） */
@keyframes skills-loading-out
	from
		opacity: 1
		transform: none
	to
		opacity: 0
		transform: scale(0.96)
</style>
