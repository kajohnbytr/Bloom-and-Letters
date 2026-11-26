# Bloom & Letter

Bloom & Letter is a React and TypeScript app for sending a bouquet with a personal letter. Pick individual stems in the garden, style the bouquet, write on custom stationery, and publish an unlisted gift link with a downloadable PNG QR code. Recipients open the garden, explore the bouquet, then open the envelope.

## Run locally

Use Node.js 22 or newer.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

The garden, bouquet editor, and letter preview work before connecting Supabase. An unsigned visitor's in-progress draft stays in that browser. Sign in to autosave to PostgreSQL, attach a photograph, or publish. To smoke-test the built app, run `npm run build` and `npm run preview -- --port 4173`.

## Supabase setup

1. Create or select a Supabase project. Install the Supabase CLI and authenticate in its own sign-in flow.
2. Run `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push`. The migration creates the gift tables, publishing and recipient RPCs, ownership policies, and a private image bucket.
3. Run `supabase functions deploy read-gift --no-verify-jwt`. Unauthenticated recipients use this endpoint with the gift token. The Edge Function uses the Supabase runtime service role and returns only the gift presentation and, when the envelope opens, a short-lived signed photo URL.
4. Enable email authentication and configure a production SMTP provider for sign-in links. In Auth URL Configuration, use the public frontend as the Site URL and allow its `/create` and `/letters` redirects. For local sign-in, also allow those routes on the local frontend origin.
5. Add the variables below to `.env.local` and later to the frontend host. Rebuild after changing them.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project API URL |
| `VITE_SUPABASE_ANON_KEY` | Browser-safe publishable or legacy anon key |
| `VITE_PUBLIC_ORIGIN` | Canonical production HTTPS origin used in published links and QR codes |

Keep the Supabase service-role key in the Edge Function environment. All `VITE_` variables are public at build time. If the canonical origin is omitted, sharing uses the page origin, which is useful for a local test only.

## Deploy

Import the checkout into Vercel as a Vite project. Use `npm run build` and output directory `dist`. Alternatively, use the same build and output settings on Netlify. The repository includes SPA fallback rules for both hosts so that directly opened gift URLs and refreshes work. Add the three variables before building, then make a test gift and verify its QR code on a separate device. Check revocation, scheduled opening, expiration, and direct-link refresh on the production domain.

## How persistence works

PostgreSQL stores owner-managed drafts in `gifts` and a separate immutable-until-republished snapshot in `gift_publications`. Letter and bouquet presentation settings are validated JSON snapshots with an ordered array of stems. Saving edits to an existing gift leaves the live snapshot intact until it is published again. Links use 32 random bytes encoded for URLs. Only authenticated owners can edit, delete, revoke, or restore a gift. Anyone with an active sharing link can open it while its delivery window is valid.

For photography, the private bucket accepts JPEG, PNG, and WebP up to 5 MB. Recipients receive signed URLs that expire after two minutes. Deleting a gift also attempts cleanup of its uploaded photos. An upload abandoned before the draft was saved can leave an unreferenced private object.

## Verification and known limitations

- `npm test` applies the migration in embedded PostgreSQL with Supabase role and Storage fixtures. It tests validation, token uniqueness, published snapshots, owner isolation, revocation, restore, scheduled access, expiration, and deletion.
- `npm run test:browser` checks the built app on Edge at mobile, tablet, and desktop sizes. Start preview on port 4173 first. Set `TEST_ORIGIN` to use a different origin or `BROWSER_CHANNEL` to use installed Chrome.
- Senders can add a 6–12 digit access PIN at publication. PostgreSQL stores a salted bcrypt hash and temporarily locks PIN checks for that gift after eight incorrect attempts in ten minutes.
- To test the recipient UI with a mocked Edge Function, build with VITE_SUPABASE_URL set to https://bloom-test.supabase.co and VITE_SUPABASE_ANON_KEY set to qa-browser-key, serve the build, and run npm run test:recipient and npm run test:publishing. These values are for isolated tests only.
- Hosted Supabase authentication, Storage, the Edge Function, and public deployment require project access and must be verified after setup.



## Add your GCash QR code

Save your public GCash receive-payment QR image as `public/gcash-qr.png`. Restart the development server or rebuild and redeploy the site. The footer links to the Buy Me a Coffee page, which will display the image automatically. Until an image is in place, the page shows that payment details are unavailable.

If you prefer a different filename, set `VITE_GCASH_QR_URL` to the public path, such as `/my-gcash-qr.jpg`, and place that file in `public/`. The optional `VITE_GCASH_NAME` and `VITE_GCASH_NUMBER` values are visible to visitors when set.

For an existing Supabase deployment, run `supabase db push` and redeploy `read-gift` when releasing the bouquet note options.

## Custom bouquets and recipient keepsakes

Drag a flower in the bouquet preview to move it. With the flower focused,
use arrow keys for fine adjustments or Shift + arrow keys for larger moves.
Reset flower positions returns to the selected preset. Wrapping paper and
wrapper shape can be selected separately.

The letter reveal includes the same bouquet that the sender arranged. The
optional keepsake camera uses a secure connection (HTTPS or localhost) and
requires browser permission. Recipients can use the device photo picker if
the live camera is unavailable. Keepsake photos stay in the browser until
downloaded and are never uploaded.

For an existing deployment, apply the bouquet arrangement migration and
redeploy read-gift before pushing the updated frontend. See Step 10 of
DEPLOYMENT-GUIDE.txt.
