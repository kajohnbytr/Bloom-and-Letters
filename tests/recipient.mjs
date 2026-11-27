import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
const origin = process.env.TEST_ORIGIN || "http://localhost:4173";
const token = "N".repeat(43);
const envelope = {
  flowers: [
    { type: 0, note: "For our first garden walk", position: { x: 90, y: 110 } },
    { type: 3, note: "" },
  ],
  wrap: "Midnight stars",
  fold: "Layered fan",
  ribbon: "Lavender",
  arrangement: "Wildflower",
  recipient: "Lina",
  sender: "Jamie",
};
const letter = {
  ...envelope,
  title: "Thinking of you",
  body: "One line.\n\nA second paragraph.",
  theme: "Floral stationery",
  font: "Caveat",
  size: 26,
  align: "left",
  color: "#40312d",
  decoration: true,
  date: "",
};
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    "https://bloom-test.supabase.co/functions/v1/read-gift",
    async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "POST,OPTIONS",
          },
        });
      const body = request.postDataJSON();
      const response =
        body.token !== token
          ? null
          : body.pin !== "831729"
            ? { pinRequired: true, incorrect: Boolean(body.pin) }
            : { gift: body.openLetter ? letter : envelope, photo: "" };
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
        },
        body: JSON.stringify(response),
      });
    },
  );
  await page.goto(origin + "/gift/" + token);
  await page.getByLabel("Gift PIN").fill("000000");
  await page.getByRole("button", { name: "Unlock Gift" }).click();
  await page.getByText("That PIN did not match.").waitFor();
  await page.getByLabel("Gift PIN").fill("831729");
  await page.getByRole("button", { name: "Unlock Gift" }).click();
  await page.getByRole("button", { name: "Enter the Garden" }).click();
  await page.getByRole("heading", { name: "Welcome, Lina." }).waitFor();
  await page.getByRole("button", { name: "Reveal the Bouquet" }).click();
  await page
    .getByRole("group", { name: "Wildflower bouquet with 2 stems" })
    .waitFor();
  await page.getByRole("button", { name: "Lavender stem 2" }).press("Enter");
  await page.getByText("Peace and devotion", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Rose stem 1" }).press("Enter");
  await page.getByText("For our first garden walk").waitFor();
  assert.equal(await page.getByText("One line.").count(), 0);
  await page.getByRole("button", { name: "See the Envelope" }).click();
  await page.getByText("From Jamie").waitFor();
  await page.getByRole("button", { name: "Open the letter" }).click();
  await page.getByRole("heading", { name: "Thinking of you" }).waitFor();
  assert.equal(await page.locator(".letter-body").textContent(), letter.body);
  await page
    .locator(".held-bouquet")
    .getByRole("img", { name: "Wildflower bouquet with 2 stems" })
    .waitFor();
  assert.equal(await page.locator("video").isVisible(), false);
  await page.getByRole("button", { name: "Open Camera" }).click();
  await page.getByRole("button", { name: "Take Photo", exact: true }).click();
  await page.getByRole("img", { name: "Your keepsake photo" }).waitFor();
  assert.match(
    await page
      .getByRole("link", { name: "Download Photo" })
      .getAttribute("href"),
    /^blob:/,
  );
  await page.getByRole("button", { name: "Remove Photo" }).click();
  assert.equal(
    await page.getByRole("img", { name: "Your keepsake photo" }).count(),
    0,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Enter the gift PIN" }).waitFor();
  await page.goto(origin + "/gift/" + "O".repeat(43));
  await page.getByRole("heading", { name: "Gift unavailable" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Recipient checks passed on mobile, including the direct-link refresh. The Edge API was mocked.",
  );
} finally {
  await browser.close();
}
