import type { SkillsConfig } from "@/types/skillsConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 技能页行为与展示配置。
 *
 * 遵循「配置管行为，数据管内容」原则：
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /skills/ 跳转 404；
 * - categories：分类清单，**数组顺序 = 页面分组顺序 = 顶部 Chips 顺序**；
 * - disabledNames：可选被禁用的技能名称列表（例如 ["PHP"]）；
 *
 * 注：本项目的 `categories` 已由内容仓 `config/skills.yaml` 整体替换
 * （当前 8 组：后端 / 前端 / 数据库 / Agent / 运维部署 / AI工具 / 中间件 / 测试），
 * 下面的默认值仅是主题兜底。数组是整体替换语义 —— 漏写一组就少一组，
 * 新增默认分类需手动回内容仓补条目。
 * 想调整页面上的分组先后，只改内容仓 YAML 里各块的顺序即可，组件不硬编码顺序。
 *
 * ⚠️ 分类的 `icon` 值不能只写在 YAML 里：站点图标是离线内联打包的，
 * 构建器只扫描 `src/**`，扫不到 `config/`。必须在内容仓 `data/custom-icons.ts`
 * 里再登记一次，否则分类标签上的图标是空白且不报错。
 *
 * 注：技能的具体内容数据（技能名称、熟练度等级、图标、描述等）请在 `src/data/skills.ts` 中维护。
 */
export const skillsConfig: SkillsConfig = withUserConfig("skills", {
	enable: true,
	categories: [
		{
			key: "frontend",
			label: "前端",
			icon: "material-symbols:web-rounded",
		},
		{
			key: "backend",
			label: "后端",
			icon: "material-symbols:dns-rounded",
		},
		{
			key: "tooling",
			label: "工具链",
			icon: "material-symbols:construction-rounded",
		},
	],
	// disabledNames: [],
});
