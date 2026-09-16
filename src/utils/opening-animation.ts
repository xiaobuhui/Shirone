/**
 * 开场动画的会话标记与重播入口。
 *
 * 标记存在 `sessionStorage`，是**标签页级**的：关掉标签页即失效，所以「每标签页只播一次」
 * 天然成立，不需要再给访客配一个持久开关。键名带版本号，语义变了 bump 一次即可作废旧标记。
 *
 * 契约：读写失败（隐私模式等）一律按「没播过」处理，动画照常播放，绝不抛错。
 */

import { url } from "./url-utils";

/** 会话内只播一次的标记键。带版本号：语义变更时 bump，旧标记自动作废。 */
export const OPENING_SEEN_KEY = "shirone-opening-played.v1";

/** 本会话是否已经播过开场动画。 */
export function hasSeenOpening(): boolean {
	try {
		return window.sessionStorage.getItem(OPENING_SEEN_KEY) === "1";
	} catch {
		return false;
	}
}

/** 记下「本会话已播过」。必须在动画**完整播完**之后调用，否则中途被打断会永久吞掉这一轮。 */
export function markOpeningSeen(): void {
	try {
		window.sessionStorage.setItem(OPENING_SEEN_KEY, "1");
	} catch {
		// 隐私模式下不可写：忽略，不影响本次播放。
	}
}

/** 清掉会话标记，让下一次加载重新播。 */
export function clearOpeningSeen(): void {
	try {
		window.sessionStorage.removeItem(OPENING_SEEN_KEY);
	} catch {
		// 同上。
	}
}

/**
 * 重播开场动画。
 *
 * 遮罩只在**首页 SSR** 时渲染，且挂在 `#swup-container` 之外 —— 站内软导航不会重建它，
 * 所以唯一可靠的触发方式是整页加载首页：清掉会话标记后硬跳一次。
 */
export function replayOpeningAnimation(): void {
	clearOpeningSeen();
	window.location.assign(url("/"));
}
