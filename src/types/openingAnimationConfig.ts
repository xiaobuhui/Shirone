/**
 * 首页开场动画配置。
 *
 * 首次进入首页时播放的全屏开场：灰度底图 → 自左上角径向扩散出彩色 → 站点名落下 →
 * 按时段问候语打字机 → 整层上移收场。全程离线，不发起任何外部网络请求。
 *
 * 关闭时（enable: false）零 DOM 占位、零图片请求、零脚本执行。
 */
export interface OpeningAnimationConfig {
	/**
	 * 是否启用开场动画。
	 * @default false
	 */
	enable: boolean;
	/**
	 * 桌面端背景图，相对 src/ 目录，不带前导斜杠。
	 * @example "assets/images/opening/desktop.webp"
	 */
	desktopImage: string;
	/**
	 * 移动端背景图（竖版），相对 src/ 目录，不带前导斜杠。
	 * @example "assets/images/opening/mobile.webp"
	 */
	mobileImage: string;
	/**
	 * 动画总时长（毫秒）。各阶段按此值等比缩放。
	 * @default 4120
	 */
	duration: number;
}
