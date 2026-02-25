# K-Track | Advanced Task & Commission Management

**K-Track** is a professional task management platform designed to bridge the gap between service providers and their clients. It features real-time task tracking, secure file sharing (Cloudflare R2), per-task chat, commission/quote management, and a **Hybrid Client System** supporting both registered users and guest clients.

---

## ✨ Key Features

### 👥 Hybrid Client System
- **Registered Users** — full account with approval workflow and self-service dashboard
- **Guest Clients** — admin-managed clients with no login required
- **Account Merging** — seamlessly upgrade a guest client into a registered user, transferring all task history

### 💳 Milestone Payment System
- **50% Deposit Workflow** — Optional upfront deposit requirement for quotes.
- **Paystack Integration** — Secure payments supporting Cards and Mobile Money (M-Pesa).
- **USD to KES Conversion** — Automatic currency conversion with real-time rate transparency for clients.
- **Transaction Audit** — Dedicated Admin Payments page for granular tracking of all deposits and final balances.

### 📊 Analytics & Business Intelligence
- **Executive KPIs** — Real-time tracking of Revenue, Quote Acceptance, Task Completion, and Client Growth with MoM trend analysis.
- **Financial Module** — Detailed breakdown of expected vs. actual revenue, payment status (Paid/Pending/Overdue), and client-specific revenue rankings.
- **Task Intelligence** — Status distribution, operational pipeline funnel, and performance metrics (On-time rate, Avg. completion time).
- **Storage Analytics** — Monitoring of Cloudflare R2 utilization, file type distribution, and storage growth trends.
- **Smart Charting** — Time-series visualization with "gap-filling" logic to ensure zero-activity periods are accurately represented.

### 🛡️ Resilience & Reliability
- **Clock Drift Mitigation** — 24-hour end-date buffering on all filters to ensure same-day data is captured regardless of server/client time differences.
- **Data Consistency** — Standardized SQL aggregation across all reporting modules for perfectly synchronized dashboard cards and charts.
- **Fail-Safe Startup** — Server blocks traffic until all database schema updates are verified and applied.
- **Automated Sync** — `DatabasePatchService` automatically handles schema migrations on every deployment.

### ⚡ Task & Quote Workflow
Full lifecycle from creation to payment:
```
Pending Quote → Quote Sent → Approved → Pending Deposit (Optional) → In Progress → Review → Completed
```
- Admin sends a quoted amount; client approves or rejects with one click
- Priority levels: Low / Medium / High / Urgent
- Payment toggle per task

### 💬 Contextual Chat
- Private message thread per task with file attachment support
- Unread message badges per task

### 📁 File Management
- Secure file uploads via **Cloudflare R2** (with local `/uploads` fallback)
- Up to 10 files per upload, 10MB per file
- Files scoped to individual tasks

### 🔒 Security
- JWT authentication with HttpOnly cookie refresh tokens
- CSRF protection on all mutation endpoints
- Helmet security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting: 20 req/15min on auth, 200 req/15min on API
- bcrypt password hashing (10 rounds)

---

## 🚀 Getting Started

### Prerequisites
- Node.js v14+
- MySQL (or TiDB)

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
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Cloudflare R2 (or AWS S3)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name

# CORS
CORS_ORIGIN=http://localhost:3000
```

# The system now uses an automated migration service.
# Just start the server to apply all latest schema updates automatically.
```

Start the server:
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

---

## 📂 Project Structure

```
my-task-tracker/
├── backend/
│   ├── config/          # DB connection, env validation
│   ├── controllers/     # Route handlers (auth, tasks, files, analytics…)
│   ├── middleware/       # auth, authorize, upload, validation, CSRF, rate limit
│   ├── migrations/      # SQL migration files (manual, sequential)
│   ├── models/          # User, Task, Message, Notification, GuestClient
│   ├── routes/          # Express routers
│   ├── scripts/         # Admin utilities (create_admin, list_users…)
│   ├── services/        # Email, file storage services
│   ├── utils/           # Logger, helpers
│   └── server.js        # App entry point
└── frontend/
    └── src/
        ├── components/  # Reusable UI (auth, charts, common, task cards…)
        ├── context/     # AuthContext, NavigationContext, AnalyticsContext
        ├── hooks/       # useTasks, useOnlineStatus…
        ├── pages/       # Dashboard, Projects, Files, Settings, Analytics,
        │                #   AdminDashboard, ClientDashboard, GuestClientManagement
        └── services/    # Axios API client
```

---

## 🗄️ Database Overview

Six tables, all MySQL/TiDB:

| Table | Purpose |
|---|---|
| `users` | Registered accounts with role & approval status |
| `tasks` | Core work items with quote/payment lifecycle |
| `messages` | Per-task chat with optional file attachments |
| `task_files` | Files attached to tasks (R2/S3/local) |
| `notifications` | User alerts |
| `guest_clients` | Non-registered clients, upgradeable to full users |

See `PROJECT_ANALYSIS.md` for the full schema, migration history, and API reference.

---

## 🛠️ Admin Utilities

Helpful scripts in `backend/scripts/`:

```bash
node scripts/create_admin.js        # Create an admin account
node scripts/list_all_users.js      # List all registered users
node scripts/seed-users.js          # Seed test users
```

---

## 📄 License

Private Property of K-Track Systems. All Rights Reserved.
