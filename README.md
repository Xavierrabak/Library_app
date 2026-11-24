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
