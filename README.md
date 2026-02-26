# K-Track | Advanced Task & Commission Management

**K-Track** is a professional task management platform designed to bridge the gap between service providers and their clients. It features real-time task tracking, secure file sharing (Cloudflare R2), per-task chat, commission/quote management, and a **Hybrid Client System** supporting both registered users and guest clients.

---

## ✨ Key Features

### 👥 Hybrid Client System
- **Registered Users** — full account with approval workflow and self-service dashboard
- **Guest Clients** — admin-managed clients with no login required
- **Account Merging** — seamlessly upgrade a guest client into a registered user, transferring all task history

### 💳 Milestone Payment System
- **50% Deposit Workflow** — Optional upfront deposit requirement before work begins
- **Paystack Integration** — Supports Cards and Mobile Money (M-Pesa), charged in KES
- **Server-Side Payment Intents** — Amount and security nonce computed server-side before Paystack opens; clients cannot tamper with the charge amount
- **USD → KES Conversion** — All USD task amounts are converted to KES using a configurable exchange rate (`EXCHANGE_RATE_USD_KES`) before charging
- **Transaction Audit** — Dedicated admin Payments page for granular tracking of all deposits and final balances
- **Anomaly Alerting** — Admin receives an email alert for any payment security event (amount mismatch, forged nonce, replay attempt)

### 📊 Analytics & Business Intelligence
- **Executive KPIs** — Real-time Revenue, Quote Acceptance, Task Completion, and Client Growth with MoM trend analysis
- **Financial Module** — Expected vs. actual revenue, payment status breakdown, and client revenue rankings
- **Task Intelligence** — Status distribution, pipeline funnel, on-time rate, and average completion time
- **Storage Analytics** — Cloudflare R2 utilization, file type breakdown, and storage growth trends
- **Smart Charting** — Time-series with gap-filling logic to accurately represent zero-activity periods

### 🛡️ Security
- JWT authentication with HttpOnly cookie refresh tokens
- CSRF protection on all mutation endpoints
- Helmet security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting: 20 req/15min on auth routes, 1000 req/15min on API
- bcrypt password hashing (10 rounds)
- Role-based access control (`authenticate` + `requireAdmin` middleware) on all sensitive routes
- **Secure file downloads** — uploaded files are served only through authenticated controller endpoints, never via a public static path
- **Payment intent system** — server-issued nonces prevent webhook replay attacks and amount manipulation (F-08 / F-09 remediation)

### ⚡ Task & Quote Workflow
```
Pending Quote → Quote Sent → Approved → Pending Deposit (opt.) → In Progress → Review → Completed
```
- Admin sends a quoted amount; client approves or rejects with one click
- Priority levels: Low / Medium / High / Urgent

### 💬 Contextual Chat
- Private message thread per task with file attachment support
- Unread message badges per task

### 📁 File Management
- Secure uploads via **Cloudflare R2** (with local fallback)
- Up to 10 files per upload, 10 MB per file
- Files scoped to individual tasks; downloads require authentication

### ⚙️ Reliability
- **Fail-safe startup** — server blocks traffic until all DB schema patches are verified
- **`DatabasePatchService`** — automatically applies schema migrations on every deploy (no manual SQL needed)
- **Clock drift mitigation** — 24-hour end-date buffering on all time-range filters

---

## 🚀 Getting Started

### Prerequisites
- Node.js v14+
- MySQL 8+ or TiDB

### 1. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ktrack

# Auth
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret

# Cloudflare R2 (or AWS S3)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name

# Email (Resend)
RESEND_API_KEY=re_your_key
ADMIN_EMAIL=your@email.com
FROM_EMAIL=noreply@yourdomain.com

# Payments (Paystack)
PAYSTACK_SECRET_KEY=sk_live_your_key
EXCHANGE_RATE_USD_KES=135.00

# CORS
CORS_ORIGIN=https://your-frontend-url.com
```

Start the server (schema patches apply automatically on first boot):
```bash
npm run dev   # development (nodemon)
npm start     # production
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start     # opens at http://localhost:3000
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_key
VITE_EXCHANGE_RATE_USD_KES=135
```

---

## 📂 Project Structure

```
my-task-tracker/
├── backend/
│   ├── config/          # DB connection, env validation
│   ├── controllers/     # auth, tasks, files, payments, analytics, notifications
│   ├── middleware/       # authenticate, requireAdmin, upload, CSRF, rate limit
│   ├── models/          # User, Task, Message, Notification, GuestClient
│   ├── routes/          # Express routers
│   ├── scripts/         # Admin utilities
│   ├── services/        # emailService, paystackService, r2Service, databasePatchService
│   ├── utils/           # logger, helpers
│   └── server.js        # App entry point
└── frontend/
    └── src/
        ├── components/  # Badges, Cards, Chat, TaskRow, TaskCard, ClientProjectCard…
        ├── context/     # AuthContext, AnalyticsContext
        ├── hooks/       # useTasks, useOnlineStatus…
        ├── pages/       # Dashboard, Projects, Files, Settings, Analytics, Payments…
        └── services/    # Axios API client
```

---

## 🗄️ Database

All tables are MySQL/TiDB. Schema is managed automatically by `DatabasePatchService` on server start — no manual migrations needed.

| Table | Purpose |
|---|---|
| `users` | Registered accounts with role & approval status |
| `tasks` | Core work items with full quote/payment lifecycle |
| `messages` | Per-task chat with optional file attachments |
| `task_files` | Files attached to tasks (R2/S3/local) |
| `notifications` | User alerts |
| `guest_clients` | Non-registered clients, upgradeable to full users |
| `payments` | Payment transaction audit log |
| `payment_intents` | Server-side payment sessions (nonce + expected amount) for secure Paystack integration |

---

## 🛠️ Admin Utilities

```bash
node scripts/create_admin.js        # Create an admin account
node scripts/list_all_users.js      # List all registered users
node scripts/seed-users.js          # Seed test users
```

---

## 📄 License

Private Property of K-Track Systems. All Rights Reserved.
