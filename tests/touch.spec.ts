import { expect, test, type Page } from "@playwright/test";

const openForm = async (page: Page) => {
  await page.goto("./");
  await expect(page.getByText("Loading agreement tool", { exact: true })).toHaveCount(0);
};
const language = async (page: Page, value: "English" | "Dhivehi") => {
  await page.getByRole("button", { name: "Agreement language", exact: true }).tap();
  await expect(page.getByRole("dialog", { name: "Choose language" })).toBeVisible();
  await page.getByRole("radio", { name: value, exact: true }).tap();
  await expect(page.getByRole("dialog", { name: "Choose language" })).toHaveCount(0);
};
const ready = async (page: Page) => {
  await expect(page.locator(".viewer-page canvas")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Agreement page")).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
};

test("Drawers support keyboard dismissal, focus containment and focus restoration", async ({ page }) => {
  await openForm(page);
  const trigger = page.getByRole("button", { name: "Agreement language", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Choose language" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("radio", { name: "English", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.querySelector("dialog")!.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await page.getByRole("radio", { name: "Dhivehi", exact: true }).press("Enter");
  await expect(trigger).toContainText("Dhivehi agreement");
  await expect(trigger).toBeFocused();
});

test.describe("Mobile touch", () => {
  test.beforeEach(async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "Requires a touch-enabled browser");
    await openForm(page);
  });

  test("Every apartment is reachable; rapid selection and language changes never reopen or block drawers", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 600 });
    for (const unit of ["6B", "2A", "4B", "5A", "3B", "6A", "4A", "5B", "3A", "2B"]) {
      await page.getByRole("button", { name: /^Choose apartment,/ }).tap();
      const dialog = page.getByRole("dialog", { name: "Choose apartment" });
      await expect(dialog).toBeVisible();
      const bounds = await page.locator(".drawer-sheet").boundingBox();
      expect(bounds!.height).toBeLessThanOrEqual(581);
      const option = page.getByRole("radio").filter({ has: page.locator(".apartment-option__unit", { hasText: unit }) });
      await option.scrollIntoViewIfNeeded();
      await option.tap();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator(".apartment-trigger strong").first()).toHaveText("English");
      await expect(page.getByRole("button", { name: /^Choose apartment,/ })).toContainText(unit);
      await expect(page.getByRole("textbox", { name: "Monthly rent MVR", exact: true })).toHaveValue(unit.endsWith("A") ? "10000" : "16000");
      // Immediately cross into another drawer: previously ignored for 700ms.
      await language(page, "Dhivehi");
      await language(page, "English");
    }
  });

  test("Close, backdrop and date selection allow immediate reopening without background movement", async ({ page }) => {
    await page.getByRole("button", { name: /^Choose apartment,/ }).tap();
    const position = await page.evaluate(() => document.body.style.top);
    await expect(page.locator("body")).toHaveCSS("position", "fixed");
    await page.getByRole("button", { name: "Close Choose apartment", exact: true }).tap();
    await page.getByRole("button", { name: /^Choose apartment,/ }).tap();
    await expect(page.getByRole("dialog", { name: "Choose apartment" })).toBeVisible();
    expect(await page.evaluate(() => document.body.style.top)).toBe(position);
    await page.touchscreen.tap(10, 10);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await language(page, "Dhivehi");
    await page.getByRole("button", { name: /^Start date/ }).tap();
    await page.getByRole("button", { name: "Next month", exact: true }).tap();
    await page.locator(".calendar-day:not(:disabled)").first().tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: /^Signing date/ }).tap();
    await page.getByRole("button", { name: "Today", exact: true }).tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: /^End date/ }).tap();
    await page.getByRole("button", { name: "Close End date", exact: true }).tap();
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  });

  test("Real finger scrolling and cancelled touches do not select an apartment or block the next drawer", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Raw touch gestures require Chromium's input protocol");
    await page.getByRole("button", { name: /^Choose apartment,/ }).tap();
    await page.locator(".drawer-sheet").evaluate(async (element) => { await Promise.all(element.getAnimations().map((animation) => animation.finished)); });
    const session = await page.context().newCDPSession(page);
    const bounds = (await page.locator(".drawer-content").boundingBox())!;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + Math.min(bounds.height - 50, 250);
    const touch = async (type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel", ty = y) => {
      await session.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y: ty, id: 1 }] });
    };
    await touch("touchStart");
    for (let distance = 20; distance <= 160; distance += 20) await touch("touchMove", y - distance);
    await touch("touchEnd");
    await expect(page.getByRole("dialog", { name: "Choose apartment" })).toBeVisible();
    await expect.poll(() => page.locator(".drawer-content").evaluate((element) => element.scrollTop)).toBeGreaterThan(50);
    await expect(page.getByRole("radio", { checked: true })).toContainText("2B");
    await touch("touchStart"); await touch("touchCancel");
    await expect(page.getByRole("dialog", { name: "Choose apartment" })).toBeVisible();
    await page.getByRole("button", { name: "Close Choose apartment", exact: true }).tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await language(page, "Dhivehi");
  });

  test("Touch flow generates and downloads a Faruma Dhivehi agreement, then switches back to English", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await language(page, "Dhivehi");
    await page.getByPlaceholder("Full legal name").tap();
    await page.getByPlaceholder("Full legal name").fill("އަހުމަދު އަލީ");
    await page.getByPlaceholder("A000000").tap();
    await page.getByPlaceholder("A000000").fill("A123456");
    await page.getByRole("button", { name: /^Choose apartment,/ }).tap();
    await page.getByRole("radio").filter({ has: page.locator(".apartment-option__unit", { hasText: "6B" }) }).tap();
    await page.getByRole("button", { name: "2 years", exact: true }).tap();
    await page.getByRole("button", { name: "2x", exact: true }).tap();
    await expect(page.getByRole("textbox", { name: "Security deposit MVR", exact: true })).toHaveValue("32000");
    await page.getByRole("button", { name: "Generate preview" }).tap();
    await ready(page);
    expect(await page.evaluate(() => Array.from(document.fonts).some((font) => font.family === "Faruma" && font.status === "loaded"))).toBe(true);
    await page.getByRole("button", { name: "Next page", exact: true }).tap();
    await ready(page);
    await page.getByRole("button", { name: "Zoom in", exact: true }).tap();
    await ready(page);
    await page.getByRole("button", { name: "Fit width", exact: true }).tap();
    await ready(page);
    await page.screenshot({ path: testInfo.outputPath("faruma-dhivehi-mobile.png") });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PDF", exact: true }).tap();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^6B-.*-dhivehi\.pdf$/);
    await download.saveAs(testInfo.outputPath("faruma-dhivehi.pdf"));
    await page.getByRole("button", { name: "Close preview", exact: true }).tap();
    await language(page, "English");
    await expect(page.getByPlaceholder("A000000")).toHaveValue("A123456");
    await expect(page.getByRole("button", { name: /^Choose apartment,/ })).toContainText("6B");
    await page.getByRole("button", { name: "Generate preview" }).tap();
    await ready(page);
    await page.getByRole("button", { name: "Close preview", exact: true }).tap();
    expect(errors).toEqual([]);
  });
});
