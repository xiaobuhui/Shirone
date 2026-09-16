import type { OpeningAnimationConfig } from "@/types/openingAnimationConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 首页开场动画配置。
 *
 * 默认关闭：不产出 DOM、不请求图片、不执行脚本（零额外负担）。
 * 开启方式：内容仓 `config/opening-animation.yaml` 写 `enable: true`。
 */
export const openingAnimationConfig: OpeningAnimationConfig = withUserConfig(
	"openingAnimation",
	{
		enable: false,
		desktopImage: "assets/images/opening/desktop.webp",
		mobileImage: "assets/images/opening/mobile.webp",
		duration: 4120,
	},
);
