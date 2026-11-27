# Bloom & Letter

**A digital bouquet and a personal letter, delivered together.**

Bloom & Letter turns a message into an interactive gift. Senders pick and arrange flowers, write on custom stationery, and share the finished gift with an unlisted link or a downloadable QR code. Recipients can explore the bouquet, open the envelope, and read the letter without creating an account.

## Features

| For senders                                                                                    | For recipients                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Pick eight flower varieties in the virtual garden                                              | Reveal the bouquet and explore flower meanings                     |
| Arrange individual stems by dragging or using the keyboard                                     | Read flower notes or one note for the whole bouquet                |
| Customize paper, wrapper shape, ribbon, and stationery                                         | Open the letter with the sender's bouquet still in view            |
| Save drafts, attach a photo, and manage gifts in **My Letters**                                | Optionally take or choose a keepsake photo and download it locally |
| Publish a link and QR code, schedule delivery, set an expiry date, add a PIN, or revoke access | Open active gifts on mobile or desktop without signing in          |

## Quick start

**Requirements:** Node.js 22 or newer and npm. Use PowerShell from the project folder on Windows.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

If `.env.local` already exists, skip the copy and edit the existing file. Open the local URL printed in the terminal. You can explore the garden, arrange a bouquet, and preview a letter before connecting Supabase. Guests' drafts stay in their browser.

### Connect Supabase

Create a Supabase project, then run these commands from the repository root. Replace `YOUR_PROJECT_REF` with the project reference.

```powershell
npx.cmd supabase@2 login
npx.cmd supabase@2 link --project-ref YOUR_PROJECT_REF
npx.cmd supabase@2 db push
npx.cmd supabase@2 functions deploy read-gift --use-api --no-verify-jwt
```

The migrations create the gift tables, ownership policies, and private `letter-photos` bucket. The `read-gift` function validates gift access for signed-out visitors and supplies a short-lived photo URL when the letter is opened.

Add these values to `.env.local` for local development and to Vercel for production.

| Variable                 | Purpose                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | Supabase project API URL                                                                                                                               |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key or legacy anon key                                                                                                            |
| `VITE_PUBLIC_ORIGIN`     | Stable production origin for gift links and QR codes, such as `https://your-site.vercel.app`. Leave blank to use the current origin for local testing. |

Restart the dev server after editing `.env.local`. Vite exposes `VITE_` variables in the browser, so keep service-role keys and SMTP passwords in Supabase.

In **Supabase → Authentication → URL Configuration**, set the production **Site URL** and allow the `/create` and `/letters` URLs on that origin. Add those same paths on your local origin if you want to test sign-in locally. Enable the **Email** provider and configure custom SMTP before opening registration to the public. The built-in email service is suitable for testing with Supabase team addresses.

## Deploy and update

The [click-by-click deployment guide](DEPLOYMENT-GUIDE.txt) covers GitHub, Supabase, Vercel, magic-link sign-in, and testing a gift on the live site.

For Vercel, import the repository using the **Vite** preset, set the build command to `npm run build`, and set the output directory to `dist`. Add the production environment variables before deploying. The repository includes SPA routing rules for Vercel and Netlify so direct gift links work after a refresh.

| Change                      | Deployment action                                 |
| --------------------------- | ------------------------------------------------- |
| Frontend or public assets   | Push to the production branch connected to Vercel |
| Database migration          | Run `npx.cmd supabase@2 db push`                  |
| Recipient Edge Function     | Run the `read-gift` deploy command above          |
| Vercel environment variable | Update the value in Vercel and redeploy           |

For a release that changes the database or Edge Function alongside the frontend, deploy the backend changes before pushing the frontend.

### Buy Me a Coffee

The optional support panel appears after bouquet creation and links to the support page. Each uploaded QR code is shown with its payment provider label.

| Provider    | Image path                                     |
| ----------- | ---------------------------------------------- |
| GCash       | `public/gcash-qr.jpg` or `public/gcash-qr.png` |
| MariBank    | `public/maribank-qr.jpg`                       |
| GoTyme Bank | `public/go-tyme.jpg`                           |

Set `VITE_GCASH_QR_URL` to override the GCash image path. `VITE_GCASH_NAME` and `VITE_GCASH_NUMBER` are optional public display fields. Rebuild after replacing an image or changing these values.

## Architecture and privacy

- **Frontend** — React, TypeScript, Vite, React Router, Framer Motion, and SVG bouquet illustrations.
- **Backend** — Supabase Auth, PostgreSQL, private Storage, and the `read-gift` Edge Function.
- **Gift lifecycle** — Owner-managed drafts live in `gifts`. Recipients read the published snapshot in `gift_publications`, so draft edits stay private until republished.
- **Access** — Gift links use URL-safe tokens generated from 32 random bytes. Scheduled availability, expiry, revocation, and optional PIN checks run server-side. PINs are hashed with bcrypt and temporarily locked after eight incorrect attempts in ten minutes.
- **Photos** — Sender attachments support JPEG, PNG, and WebP up to 5 MB and are served through short-lived signed URLs. An abandoned upload can leave a private, unreferenced file. Recipient keepsake photos stay in the browser unless downloaded. The camera requires permission and HTTPS or localhost.

## Testing

Build first, then run the preview server in a separate terminal for browser tests.

```powershell
npm.cmd run build
npm.cmd run preview -- --port 4173
```

| Command                       | What it checks                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd test`                | Migrations, publication snapshots, note and arrangement settings, ownership, PINs, and link access rules in embedded PostgreSQL |
| `npm.cmd run test:browser`    | Sender flow and responsive layout in Edge at mobile, tablet, and desktop sizes                                                  |
| `npm.cmd run test:recipient`  | Recipient reveal, PIN entry, and keepsake camera with a mocked Supabase endpoint and simulated camera                           |
| `npm.cmd run test:publishing` | Draft reload, publishing, sharing, and PNG QR download with mocked Supabase endpoints                                           |

Set `TEST_ORIGIN` to override `http://localhost:4173` or `BROWSER_CHANNEL` to use a different installed browser. For the mocked recipient and publishing tests, build with `VITE_SUPABASE_URL=https://bloom-test.supabase.co` and `VITE_SUPABASE_ANON_KEY=qa-browser-key` set in the build terminal. Those values are for tests only. After deploying, verify actual email delivery, photo uploads, and gift links on the production site.
