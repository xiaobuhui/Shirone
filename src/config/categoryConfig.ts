import type { CategoryConfig } from "@/types/categoryConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 分类展示配置
 *
 * 【核心配置项】
 * - order：分类的展示顺序（按名称精确匹配）。列出的分类按数组顺序靠前，
 *   未列出的按字母序跟在后面；省略或留空则全部按字母序（主题默认行为）。
 *
 * 只影响展示顺序，不改变文章的分类归属。顺序由 `getCategoryList()` 消费，
 * 分类导航栏、侧栏分类 widget 与 `/categories/` 页共用同一结果。
 */
export const categoryConfig: CategoryConfig = withUserConfig("category", {
	order: [],
});
