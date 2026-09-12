/**
 * 分类展示配置（CategoryConfig）
 *
 * 分类本身由文章 frontmatter 的 `category` 字段聚合而来（见
 * `src/utils/content-utils.ts` 的 `getCategoryList`），本配置**只控制展示顺序**，
 * 不改变任何文章的分类归属。
 *
 * 顺序对以下三处同时生效，保证站内一致：
 * - 分类导航栏 `CategoryBar`（首页 / 归档页顶部）
 * - 侧栏 `Categories` widget
 * - `/categories/` 分类总览页
 */
export interface CategoryConfig {
	/**
	 * 分类的展示优先级顺序（按分类名精确匹配，忽略首尾空白）。
	 *
	 * - 列出的分类按本数组顺序排在前面；
	 * - 未列出的分类按原有字母序（`localeCompare`）排在后面；
	 * - 省略、留空或 `[]` 时全部按字母序 —— 与主题默认行为一致。
	 *
	 * 例：`["指南", "一些碎碎念", "例子"]`
	 */
	order?: string[];
}
