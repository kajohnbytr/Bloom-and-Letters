import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
});
const origin = process.env.TEST_ORIGIN || "http://localhost:4173";
try {
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1440, 900],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const fits = async () =>
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    await page.goto(origin);
    await page
      .getByRole("heading", {
        name: "Some feelings deserve more than just words.",
      })
      .waitFor();
    await fits();
    await page.getByRole("link", { name: "Discover How It Works" }).click();
    assert.equal(new URL(page.url()).hash, "#how");
    await page.getByRole("link", { name: "Create Your Bouquet" }).click();
    assert.equal(
      await page.getByRole("button", { name: "Arrange Bouquet" }).isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "Rose", exact: true }).click();
    await page.getByRole("button", { name: "Peony", exact: true }).click();
    await page.getByRole("button", { name: "Undo last stem" }).click();
    await page.getByText("1 stem picked").waitFor();
    await page.getByRole("button", { name: "Arrange Bouquet" }).click();
    await page.getByRole("button", { name: "Add one Rose" }).click();
    await page.getByLabel("Arrangement").selectOption("Wildflower");
    await page.getByLabel("Wrapping paper").selectOption("Vintage floral");
    await page.getByLabel("Ribbon").selectOption("Lavender");
    await page
      .getByRole("group", { name: "Wildflower bouquet with 2 stems" })
      .waitFor();
    await fits();
    const stem = page.getByRole("button", { name: "Move Rose stem 1" });
    const originalX = Number(await stem.getAttribute("cx"));
    await stem.scrollIntoViewIfNeeded();
    const box = await stem.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 30,
      box.y + box.height / 2 - 12,
      { steps: 3 },
    );
    await page.mouse.up();
    const draggedX = Number(await stem.getAttribute("cx"));
    assert.ok(draggedX > originalX);
    await stem.press("ArrowRight");
    assert.equal(Number(await stem.getAttribute("cx")), draggedX + 4);
    await page.getByLabel("Wrapper shape").selectOption("Layered fan");
    await page.getByLabel("Note for Rose 1").fill("Our first walk");
    await page
      .getByRole("radio", { name: "One note for the whole bouquet" })
      .check();
    await page
      .getByLabel("Bouquet note (optional)")
      .fill("For all our mornings together.");
    await page.getByRole("radio", { name: "A note for each flower" }).check();
    assert.equal(
      await page.getByLabel("Note for Rose 1").inputValue(),
      "Our first walk",
    );
    await page
      .getByRole("radio", { name: "One note for the whole bouquet" })
      .check();
    await page.getByRole("button", { name: "Write Your Letter" }).click();
    const support = page.getByRole("complementary", {
      name: "Buy Me a Coffee",
    });
    await support.waitFor();
    const popup = page.waitForEvent("popup");
    await support.getByRole("link", { name: /View payment options/ }).click();
    const supportPage = await popup;
    await supportPage
      .getByRole("heading", { name: "Buy Me a Coffee" })
      .waitFor();
    await supportPage.close();
    await page.getByLabel("Recipient", { exact: true }).waitFor();
    await page.getByLabel("Recipient", { exact: true }).fill("Lina");
    await page.getByLabel("Title", { exact: true }).fill("Thinking of you");
    await page
      .getByLabel("Message", { exact: true })
      .fill("I hope these flowers make you smile.");
    await page.getByLabel("Stationery").selectOption("Floral stationery");
    await page.getByRole("button", { name: "Preview Gift" }).click();
    await page
      .getByText("Wildflower · Vintage floral · Lavender ribbon · Layered fan")
      .waitFor();
    await page.getByText("Dear Lina,").waitFor();
    await page.getByText("For all our mornings together.").waitFor();
    await fits();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("bloom-draft")).body,
      ),
      "I hope these flowers make you smile.",
    );
    await page.reload();
    assert.ok(new URL(page.url()).pathname.startsWith("/create"), page.url());
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("bloom-draft")).flowers.length,
      ),
      2,
    );
    await page.getByText("2 stems picked").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Bouquet", exact: true }).click();
    assert.equal(
      Number(
        await page
          .getByRole("button", { name: "Move Rose stem 1" })
          .getAttribute("cx"),
      ),
      draggedX + 4,
    );
    assert.equal(
      await page.getByLabel("Wrapper shape").inputValue(),
      "Layered fan",
    );
    await page.getByRole("button", { name: "Reset flower positions" }).click();
    assert.equal(
      Number(
        await page
          .getByRole("button", { name: "Move Rose stem 1" })
          .getAttribute("cx"),
      ),
      originalX,
    );
    await page.getByRole("button", { name: "Letter", exact: true }).click();
    assert.equal(
      await page.getByLabel("Message", { exact: true }).inputValue(),
      "I hope these flowers make you smile.",
    );
    await page.getByRole("link", { name: "Buy Me a Coffee" }).click();
    for (const name of ["GCash", "MariBank", "GoTyme Bank"]) {
      const title = page.getByRole("heading", { name, exact: true });
      await title.waitFor();
      const qr = page.getByRole("img", { name: name + " payment QR code" });
      await qr.waitFor();
      assert.equal(
        await qr.evaluate(async (image) => {
          await image.decode();
          return image.naturalWidth > 0;
        }),
        true,
      );
    }
    await fits();
    await page.goto(origin + "/gift/invalid");
    await page.getByRole("heading", { name: "Gift unavailable" }).waitFor();
    await page.goto(origin + "/letters");
    await page
      .getByRole("link", { name: "Sign in to view your gifts" })
      .waitFor();
    assert.deepEqual(errors, []);
    await page.close();
    console.log("Browser checks passed at " + width + " × " + height);
  }
} finally {
  await browser.close();
}
