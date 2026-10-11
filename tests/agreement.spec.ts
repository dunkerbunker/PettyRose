import { test, expect, type Page } from "@playwright/test";
import { dhivehi, dhivehiTerms } from "../src/data/dhivehiAgreement";
import config from "../src/data/agreementConfig.json" with { type: "json" };

const chooseLanguage = async (page: Page, language: "en" | "dv") => {
  await page.getByRole("button", { name: "Agreement language", exact: true }).click();
  await page.getByRole("radio", { name: language === "en" ? "English" : "Dhivehi", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Choose language" })).toHaveCount(0);
};

const fillForm = async (page: Page, language: "en" | "dv" = "en") => {
  await page.goto("./");
  await expect(page.getByText("Loading agreement tool", { exact: true })).toHaveCount(0);
  await page.getByPlaceholder("Full legal name").fill(language === "dv" ? "އަހުމަދު އަލީ" : "Ahmed Ali");
  await page.getByPlaceholder("A000000").fill("A123456");
  await chooseLanguage(page, language);
};
const ready = async (page: Page) => {
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".viewer-page canvas")).toBeVisible();
  await expect(page.getByLabel("Agreement page")).toHaveAttribute("aria-busy", "false");
  await expect.poll(() => page.locator(".viewer-page canvas").evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(100);
  const ink = await page.locator(".viewer-page canvas").evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 200 && pixels[i + 1] < 200 && pixels[i + 2] < 200) dark++;
    return dark;
  });
  expect(ink).toBeGreaterThan(500);
};

for (const language of ["en", "dv"] as const) {
  test(`${language}: PDF generation, navigation, zoom, download and close`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await fillForm(page, language);
    await page.getByRole("button", { name: "Generate preview" }).click();
    await ready(page);
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
    const count = Number(await page.getByLabel("Page number").getAttribute("max"));
    expect(count).toBeGreaterThan(3);
    await page.screenshot({ path: testInfo.outputPath(`${language}-cover.png`) });
    await page.getByRole("button", { name: "Next page" }).click();
    await ready(page);
    await expect(page.getByLabel("Page number")).toHaveValue("2");
    await page.screenshot({ path: testInfo.outputPath(`${language}-details.png`) });
    await page.getByLabel("Page number").fill(String(count));
    await page.getByLabel("Page number").press("Enter");
    await ready(page);
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
    await page.getByRole("button", { name: "Fit page", exact: true }).click();
    await ready(page);
    await page.screenshot({ path: testInfo.outputPath(`${language}-signatures.png`) });
    const bounds = await page.locator(".viewer-page").boundingBox();
    const stage = await page.getByLabel("Agreement page").boundingBox();
    expect(bounds!.height).toBeLessThanOrEqual(stage!.height);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await ready(page);
    await page.getByRole("button", { name: "Fit width", exact: true }).click();
    await ready(page);
    // Interrupt in-flight rendering several times to exercise canvas ownership.
    await page.getByRole("button", { name: "Previous page" }).click();
    await page.getByRole("button", { name: "Previous page" }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Fit width", exact: true }).click();
    await ready(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PDF", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(language === "dv" ? "-dhivehi.pdf" : "-agreement.pdf");
    await download.saveAs(testInfo.outputPath(`${language}.pdf`));
    await page.getByRole("button", { name: "Close preview" }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator(".viewer-save")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByPlaceholder("A000000")).toHaveValue("A123456");
    expect(errors).toEqual([]);
  });
}

test("Dhivehi preview survives a blocked PDF worker", async ({ page }) => {
  await page.route("**/*pdf.worker*", (route) => route.request().url().includes("?url") ? route.continue() : route.abort());
  await fillForm(page, "dv");
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.locator(".viewer-page img")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator(".viewer-page img")).toHaveAttribute("alt", /page 2/);
  await expect(page.getByRole("link", { name: "Download PDF", exact: true })).toBeVisible();
});

test("English preview failure keeps PDF actions available and can retry", async ({ page }) => {
  await page.route("**/*pdf.worker*", (route) => route.request().url().includes("?url") ? route.continue() : route.abort());
  await fillForm(page);
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByRole("alert")).toContainText("preview could not open", { timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Download PDF", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open PDF" })).toBeVisible();
  await page.unroute("**/*pdf.worker*");
  await page.getByRole("button", { name: "Retry preview" }).click();
  await ready(page);
});

test("A failed font request can be retried without losing form details", async ({ page }) => {
  await fillForm(page, "dv");
  await page.route("**/fonts/Faruma.otf", (route) => route.abort());
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText("PDF could not be prepared.", { exact: false })).toBeVisible();
  await page.unroute("**/fonts/Faruma.otf");
  await page.getByRole("button", { name: "Generate preview" }).click();
  await ready(page);
});

test("Dhivehi includes every clause and preserves the configured parties and entered amounts", async ({ page }) => {
  await page.addInitScript(() => {
    const output: string[] = [];
    (window as Window & { agreementText: string[] }).agreementText = output;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof fillText>) {
      if (this.canvas.lang === "dv") output.push(args[0]);
      return fillText.apply(this, args);
    };
  });
  await fillForm(page, "dv");
  await chooseLanguage(page, "en");
  await expect(page.getByPlaceholder("A000000")).toHaveValue("A123456");
  await chooseLanguage(page, "dv");
  await page.getByRole("textbox", { name: "Monthly rent MVR", exact: true }).fill("12345");
  await page.getByRole("textbox", { name: "Security deposit MVR", exact: true }).fill("24690");
  await page.getByRole("button", { name: "Generate preview" }).click();
  await ready(page);
  const lines = await page.evaluate(() => (window as Window & { agreementText: string[] }).agreementText);
  const content = lines.filter((line) => line !== dhivehi.property && !line.startsWith(`${dhivehi.title} |`)).join(" ");
  const terms = dhivehiTerms(config);
  expect(terms).toHaveLength(17);
  for (const term of terms) {
    expect(content).toContain(term.title);
    for (const paragraph of term.body) expect(content).toContain(paragraph);
  }
  for (const value of [config.landlord.name, config.landlord.idCardNo, config.witnesses.landlord.name,
    config.witnesses.landlord.idCardNo, "A123456", "12,345", "24,690", "7770000013844"]) expect(content).toContain(value);
  expect(content).not.toMatch(/Residential Tenancy|Agreement Details|Landlord|Witness|Monthly Rent|Execution/);
});

test("Dhivehi uses its page images when canvas rendering fails", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof getContext>) {
      // Keep the native-shaped agreement pages working; fail the PDF renderer.
      if (this.lang !== "dv") return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await fillForm(page, "dv");
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.locator(".viewer-page img")).toBeVisible();
  await expect(page.getByLabel("Agreement page")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator(".viewer-page img")).toHaveAttribute("alt", /page 2/);
});
