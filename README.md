This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database Setup (Azure SQL)

The app connects to an Azure SQL database through [`src/lib/db.ts`](src/lib/db.ts) (server-side only).

1. Copy `.env.example` to `.env` and replace the placeholder password with the real one:

   ```
   DB_SERVER=wegettinga98causeweregoated.database.windows.net
   DB_NAME=application
   DB_USER=application
   DB_PASSWORD="your-password"
   ```

   Wrap the password in quotes. Without them, a `#` (or `$`) in the password is parsed incorrectly and the login fails. Never commit `.env`; it is gitignored.

2. Run `npm run dev` and open [http://localhost:3000/api/db-check](http://localhost:3000/api/db-check). You should see `{"ok":true,"db":"application"}`.

`/api/db-check` is a temporary connectivity check.

In server code, use the shared pool:

```ts
import { getPool } from "@/lib/db";

const pool = await getPool();
const result = await pool.request().query("SELECT TOP 5 * FROM book");
```

## Librarian Operations (books, shelves, next-day)

Pages: `/AdminDash` (dashboard + next-day button), `/AdminDash/AddBook`, `/AdminDash/RemoveBook`, `/AdminDash/MoveBook`.
Logic lives in `src/lib/inventory.ts` and `src/lib/nextDay.ts`; the routes under `src/app/api/librarian/` are thin wrappers.

- Every action checks that the signed-in account has `accountType = 'librarian'` (401 with no account, 403 for patrons).

## Login, sessions and access control (localhost only)

- The login page (`/`) checks the login ID and password against the `account` table (passwords are stored as plain text) and sets an HMAC-signed `lcs_login_id` cookie (`src/lib/sessionToken.ts`). The signing key is `SESSION_SECRET` from `.env`, falling back to `DB_PASSWORD`. This is for local use only and isn't hardened for deployment.
- `src/proxy.ts` locks every page and API route except `/`, `/ForgotPassword`, `/api/session` and `/api/password-reset`. Signed-out visitors are redirected to `/`. `/AdminDash/*`, `/CreateAccount` and `/api/librarian/*` are librarian-only; patrons are redirected to `/UserDash` (403 for the API).
- The profile icon (top right, shown when signed in) shows the user's name, login ID and role, and has a **Log out** button.
- `/ForgotPassword`: enter login ID + full name; if they match an account you can set a new password (8+ characters).
- `npm run db:migrate` also seeds shelves 1-10 (capacity 50) when the `shelf` table is empty.
- A shelf holds at most 50 copies (`shelf.capacity` is capped at 50). Adds and moves lock the shelf row inside a transaction, so concurrent requests can't overfill it.
- Copies that are on loan or have a waiting hold cannot be removed.
- Next-day processing is run once per date (recorded in `next_day_run`). It fines overdue loans (`FINE_PER_OVERDUE_DAY` in `src/lib/config.ts`, currently $1/day, max $99.99 per loan), expires holds past their expiration date, and rolls back fully if anything fails.

Setup and tests:

```bash
npm run db:migrate   # creates next_day_run and seeds shelves (safe to re-run)
npm test             # integration tests against the database in .env
```

The tests cover cases BM-01 to BM-15, SC-01 to SC-10 and ND-01 to ND-13 from the test-case document. They create temporary rows (prefixed `__LCS_TEST__` / `zz_lcs_test_`) and delete them afterwards.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
