import { expect, test } from "@playwright/test";

test.describe("相册页响应式滚动", () => {
	test("从手机视口切换到桌面视口后仍可滚动", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/albums/AcgExample/", { waitUntil: "networkidle" });
		await expect(page.locator(".album-gallery__item").first()).toBeVisible();

		await page.setViewportSize({ width: 1440, height: 900 });
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollHeight > window.innerHeight,
				),
			)
			.toBe(true);

		await page.evaluate(() => window.scrollTo(0, 700));
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(0);

		await expect(page.locator("html")).not.toHaveAttribute(
			"data-overlayscrollbars",
		);
		await expect(page.locator("body")).not.toHaveAttribute(
			"data-overlayscrollbars",
		);
	});
});

test.describe("受保护相册", () => {
	// 断言文案与站点语言(zh_CN)一致：i18n 见 src/i18n/languages/zh_CN.ts 的 albumPassword*，
	// 密码提示与照片 alt 来自内容仓 public/images/albums/EncryptedExample/info.json。
	test("提供完整的密码输入与解锁反馈", async ({ page }) => {
		await page.goto("/albums/EncryptedExample/", { waitUntil: "networkidle" });

		const input = page.getByRole("textbox", { name: "密码" });
		const submit = page.getByRole("button", { name: "解锁相册" });
		const visibility = page.getByRole("button", { name: "显示密码" });

		await expect(
			page.getByRole("heading", { name: "这是一个受保护相册" }),
		).toBeVisible();
		await expect(page.getByText("六位数字", { exact: true })).toBeVisible();
		await expect(input).toHaveAttribute("type", "password");
		await expect(input).toHaveAttribute("autocomplete", "current-password");

		await visibility.click();
		await expect(input).toHaveAttribute("type", "text");
		await expect(
			page.getByRole("button", { name: "隐藏密码" }),
		).toBeVisible();

		await submit.click();
		await expect(
			page.getByText("请输入密码", { exact: true }),
		).toBeVisible();
		await expect(input).toHaveAttribute("aria-invalid", "true");

		await input.fill("000000");
		await expect(
			page.getByText("请输入密码", { exact: true }),
		).toBeHidden();
		await submit.click();
		await expect(
			page.getByText("密码无法解锁这个相册", {
				exact: true,
			}),
		).toBeVisible();

		await input.fill("123456");
		await submit.click();
		await expect(page.locator(".album-gallery__item")).toHaveCount(2);
		await expect(page.locator(".album-gallery")).toHaveClass(
			/album-gallery--masonry/,
		);
		await expect(page.locator(".album-gallery")).not.toHaveClass(
			/album-gallery--grid/,
		);
		const portrait = page.getByAltText("受保护的竖构图照片");
		const landscape = page.getByAltText("受保护的庭院风景");
		await expect(
			page.locator(".album-gallery__item img").first(),
		).toHaveAttribute("alt", "受保护的竖构图照片");
		await expect
			.poll(async () => {
				const portraitBox = await portrait.boundingBox();
				const landscapeBox = await landscape.boundingBox();
				if (!portraitBox || !landscapeBox) return false;
				const naturalDirections = await page.evaluate(() => {
				const portraitImage = document.querySelector(
					'img[alt="受保护的竖构图照片"]',
				) as HTMLImageElement | null;
				const landscapeImage = document.querySelector(
					'img[alt="受保护的庭院风景"]',
				) as HTMLImageElement | null;
					return Boolean(
						portraitImage &&
							landscapeImage &&
							portraitImage.naturalHeight > portraitImage.naturalWidth &&
							landscapeImage.naturalWidth > landscapeImage.naturalHeight,
					);
				});
				return (
					naturalDirections &&
					portraitBox.height > portraitBox.width &&
					landscapeBox.width > landscapeBox.height &&
					portraitBox.x <= landscapeBox.x
				);
			})
			.toBe(true);
		await expect(page.locator(".password-gate")).toBeHidden();
		await expect
			.poll(() =>
				page.locator(".album-detail__gallery").evaluate((element) => {
					const style = getComputedStyle(element);
					return (
						style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
						style.padding !== "0px"
					);
				}),
			)
			.toBe(true);
	});
});
