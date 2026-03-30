# K-Track

K-Track is a task and client management platform for commission-based work. It combines client onboarding, task tracking, chat, file delivery, quoting, analytics, and Paystack-powered payments in a single app.

## Stack

- Frontend: React 19, Vite, Tailwind, Axios, Socket.IO client
- Backend: Node.js, Express 5, MySQL/TiDB, Socket.IO
- Storage: Cloudflare R2 with local fallback
- Payments: Paystack
- Email: Resend / SMTP helpers

## Core Features

- Registered clients with approval workflow
- Guest clients managed by admins
- Task lifecycle tracking with quotes, deposits, and completion states
- Per-task chat and general client chat
- File uploads and deliverables
- Payments, payment reminders, and audit history
- Admin analytics and reporting

## Security Notes

The current app behavior is:

- Access tokens are kept in memory on the frontend, not in `localStorage`
- Refresh tokens are stored in an HttpOnly cookie
- Socket.IO requires an authenticated handshake and validates room access
- Chat file uploads use the shared upload allowlist
- Message downloads only render a small inline-safe image set; other files are forced to download
- Email templates escape interpolated user content
- Database dump files are ignored and should never be committed

## Repository Layout

```text
my-task-tracker/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- scripts/
|   |-- services/
|   `-- server.js
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- utils/
|   `-- package.json
`-- README.md
```

## Prerequisites

- Node.js 20+
- MySQL 8+ or TiDB
- A database created for the app, for example `ktrack`

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` with at least:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ktrack
DB_PORT=3306

JWT_SECRET=replace_with_a_strong_secret_at_least_32_chars_long
GUEST_PAYMENT_LINK_SECRET=replace_with_a_long_random_secret

CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Optional but recommended
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

RESEND_API_KEY=
ADMIN_EMAIL=
FROM_EMAIL=

PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
EXCHANGE_RATE_USD_KES=135
```

Start the backend:

```bash
npm run dev
```

Or:

```bash
npm start
```

Notes:

- The server validates required environment variables on boot.
- Schema patches are applied on startup by `DatabasePatchService`.
- If R2 is not configured, uploads fall back to local storage.

## Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_PAYSTACK_PUBLIC_KEY=
VITE_EXCHANGE_RATE_USD_KES=135
```

Start the frontend:

```bash
npm run start
```

Build for production:

```bash
npm run build
```

## Useful Scripts

These scripts live under `backend/scripts/` and are mainly for local admin/debug work:

- `node scripts/list_all_users.js`
- `node scripts/reset_admin_password.js`
- `node scripts/reset_client_password.js`
- `node scripts/verify_admin.js`
- `node scripts/debug_user_v2.js`

Some older reproduction/debug scripts are still present in the repo. Treat them as local tooling, not production features.

## File and Secret Hygiene

- Do not commit `.env` files
- Do not commit SQL dump files
- Do not hardcode passwords in scripts
- Rotate secrets immediately if they are exposed

The repo ignores dump files such as `backend/*dump.sql`, so local database exports stay out of git by default.

## Development Notes

- Backend API runs on `http://localhost:3001`
- Frontend Vite dev server typically runs on `http://localhost:5173`
- Socket events depend on a valid access token and approved user account
- Payments should be tested with sandbox credentials before production rollout

## License

Private project. All rights reserved.
