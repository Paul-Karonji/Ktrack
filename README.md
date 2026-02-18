# K-Track | Advanced Task & Commission Management

**K-Track** is a professional task management platform designed to bridge the gap between service providers and their clients. It features real-time task tracking, secure file sharing (Cloudflare R2), per-task chat, commission/quote management, and a **Hybrid Client System** supporting both registered users and guest clients.

---

## ✨ Key Features

### 👥 Hybrid Client System
- **Registered Users** — full account with approval workflow and self-service dashboard
- **Guest Clients** — admin-managed clients with no login required
- **Account Merging** — seamlessly upgrade a guest client into a registered user, transferring all task history

### 📊 Analytics & Insights
- Revenue trends, task distribution, and priority breakdown charts (Recharts)
- Client growth tracking (Registered vs. Guest) over time
- Financial reports: expected vs. actual revenue with monthly breakdowns

### ⚡ Task & Quote Workflow
Full lifecycle from creation to payment:
```
Pending Quote → Quote Sent → Approved / Rejected → In Progress → Review → Completed
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

Initialize the database:
```bash
# Apply the baseline schema
mysql -u root -p < ktrack_db_dump.sql

# Apply incremental migrations in order
mysql -u root -p ktrack < migrations/002_add_task_enhancements.sql
mysql -u root -p ktrack < migrations/004_create_task_files_table.sql
mysql -u root -p ktrack < migrations/005_create_notifications_table.sql
mysql -u root -p ktrack < migrations/006_create_guest_clients.sql
mysql -u root -p ktrack < migrations/add_message_files.sql
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
