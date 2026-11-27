import assert from "node:assert/strict";
import { chromium } from "playwright";
import QRCode from "qrcode";

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
});
const origin = process.env.TEST_ORIGIN || "http://localhost:4173";
const host = "https://bloom-test.supabase.co";
const token = "Q".repeat(43);
const user = {
  id: "a0000000-0000-4000-8000-000000000001",
  email: "sender@example.com",
  app_metadata: {},
  user_metadata: {},
};
const expires = Math.floor(Date.now() / 1000) + 3600;
const jwt = [
  { alg: "HS256", typ: "JWT" },
  { sub: user.id, exp: expires },
  "mock",
]
  .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
  .join(".");
try {
  const page = await browser.newPage({
    viewport: { width: 768, height: 1024 },
  });
  await page.addInitScript(
    ({ jwt, expires, user }) => {
      localStorage.setItem(
        "sb-bloom-test-auth-token",
        JSON.stringify({
          access_token: jwt,
          refresh_token: "mock",
          expires_at: expires,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    },
    { jwt, expires, user },
  );
  let saved;
  await page.route(host + "/rest/v1/rpc/save_gift", async (route) => {
    const body = route.request().postDataJSON();
    saved = body;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body.publish ? token : null),
    });
  });
  await page.route(host + "/rest/v1/gifts?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: saved.payload }),
    }),
  );
  await page.goto(origin + "/create");
  await page.getByRole("link", { name: "My Letters" }).waitFor();
  await page.getByRole("button", { name: "Rose", exact: true }).click();
  await page.getByRole("button", { name: "Letter", exact: true }).click();
  await page.getByLabel("Recipient", { exact: true }).fill("Lina");
  await page.getByLabel("Title", { exact: true }).fill("A spring morning");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Here are the roses I promised.");
  await page.getByRole("button", { name: "Preview Gift" }).click();
  await page.getByRole("button", { name: "Save Draft" }).click();
  await page
    .getByText("Draft saved to your account.", { exact: true })
    .waitFor();
  assert.equal(saved.publish, false);
  const draftUrl = page.url();
  assert.match(draftUrl, /\/create\/[0-9a-f-]{36}$/);
  await page.reload();
  await page.getByRole("button", { name: "Letter", exact: true }).click();
  assert.equal(
    await page.getByLabel("Message", { exact: true }).inputValue(),
    "Here are the roses I promised.",
  );
  await page.getByRole("button", { name: "Preview Gift" }).click();
  await page.getByRole("button", { name: "Publish Gift" }).click();
  await page.getByRole("heading", { name: "Your gift is published" }).waitFor();
  assert.equal(saved.publish, true);
  assert.equal(saved.payload.recipient, "Lina");
  const giftLink = await page.getByLabel("Gift link").inputValue();
  assert.equal(new URL(giftLink).pathname, "/gift/" + token);
  const qr = page.getByRole("img", { name: "QR code for this gift" });
  await qr.waitFor();
  const png = await qr.getAttribute("src");
  assert.match(png, /^data:image\/png;base64,/);
  const matrix = QRCode.create(giftLink, { errorCorrectionLevel: "M" });
  const pixelCheck = await page.evaluate(
    async ({ png, modules, size }) => {
      const image = new Image();
      image.src = png;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = image.width;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const scale = image.width / (size + 8);
      return modules.every((value, index) => {
        const x = Math.floor(((index % size) + 4.5) * scale);
        const y = Math.floor((Math.floor(index / size) + 4.5) * scale);
        return (
          (context.getImageData(x, y, 1, 1).data[0] === 0) === Boolean(value)
        );
      });
    },
    {
      png,
      modules: Array.from(matrix.modules.data),
      size: matrix.modules.size,
    },
  );
  assert.equal(pixelCheck, true);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download QR code" }).click();
  assert.equal((await download).suggestedFilename(), "bloom-and-letter.png");
  console.log(
    "Authenticated draft reload, publishing, gift link, QR pixels, and PNG download passed against mocked Supabase endpoints.",
  );
} finally {
  await browser.close();
}
