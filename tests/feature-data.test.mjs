import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	filterByDisabledKeys,
	resolveDevicesData,
	resolveProjectsData,
	resolveSkillsData,
	resolveTimelineData,
} from "../src/utils/feature-data.ts";

describe("Feature Data & Resolver Tests", () => {
	it("filterByDisabledKeys correctly filters items by key/id/name/title", () => {
		const items = [
			{ key: "item-1", name: "One" },
			{ key: "item-2", name: "Two" },
			{ key: "item-3", name: "Three" },
		];

		const filtered = filterByDisabledKeys(items, ["item-2"]);
		assert.equal(filtered.length, 2);
		assert.deepEqual(
			filtered.map((i) => i.key),
			["item-1", "item-3"],
		);
	});

	it("resolveProjectsData applies disabledKeys correctly", () => {
		// 当前数据仅 Shirone 一项：过滤禁用项后应为空，未禁用时保留
		const all = resolveProjectsData({ enable: true, categories: [] });
		assert.deepEqual(
			all.map((p) => p.key),
			["shirone"],
		);

		const resolved = resolveProjectsData({
			enable: true,
			categories: [],
			disabledKeys: ["shirone"],
		});
		assert.equal(resolved.length, 0);
	});

	it("resolveSkillsData applies disabledNames correctly", () => {
		const config = {
			enable: true,
			categories: [],
			disabledNames: ["PHP"],
		};
		const resolved = resolveSkillsData(config);
		assert.ok(resolved.some((s) => s.name === "TypeScript"));
		assert.ok(!resolved.some((s) => s.name === "PHP"));
	});

	it("resolveTimelineData applies disabledTitles and order correctly", () => {
		// 当前数据仅一条：默认保留，禁用后为空
		const all = resolveTimelineData({ enable: true, categories: [] });
		assert.deepEqual(
			all.map((t) => t.title),
			["Shirone 主题 M3E 架构大改版"],
		);

		const resolved = resolveTimelineData({
			enable: true,
			categories: [],
			order: "asc",
			disabledTitles: ["Shirone 主题 M3E 架构大改版"],
		});
		assert.equal(resolved.length, 0);
	});

	it("resolveDevicesData applies disabledIds correctly", () => {
		const config = {
			enable: true,
			categories: [],
			disabledIds: ["iphone-16-pro"],
		};
		const resolved = resolveDevicesData(config);
		assert.ok(resolved.some((d) => d.id === "macbook-pro-16"));
		assert.ok(!resolved.some((d) => d.id === "iphone-16-pro"));
	});
});
