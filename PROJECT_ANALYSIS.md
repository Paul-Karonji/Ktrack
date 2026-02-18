# K-Track Task Tracker — Full Project Analysis

## 1. System Architecture

K-Track is a **full-stack web application** for managing client tasks, quotes, payments, and communication between an admin (service provider) and clients.

```
┌─────────────────────────────────────────────────────┐
│                     FRONTEND                        │
│   React 19 (TypeScript) + Tailwind CSS + Vite       │
│   Deployed: Vercel (static SPA)                     │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS / REST API (Axios)
┌────────────────────▼────────────────────────────────┐
│                     BACKEND                         │
│   Node.js + Express.js                              │
│   Deployed: Render (or similar cloud)               │
└────────────────────┬────────────────────────────────┘
                     │ mysql2/promise (connection pool)
┌────────────────────▼────────────────────────────────┐
│                    DATABASE                         │
│   MySQL / TiDB (cloud-compatible)                   │
└─────────────────────────────────────────────────────┘
                     +
┌─────────────────────────────────────────────────────┐
│                  FILE STORAGE                       │
│   Cloudflare R2 / AWS S3 (local /uploads fallback)  │
└─────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (Full — Post All Migrations)

### Table: `users`
Core authentication and identity table.

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `email` | VARCHAR(255) UNIQUE | Login identifier |
| `password_hash` | VARCHAR(255) | bcrypt (10 rounds) |
| `role` | ENUM('admin','client') | Default: 'client' |
| `full_name` | VARCHAR(255) | |
| `phone_number` | VARCHAR(20) | |
| `course` | VARCHAR(255) | Client's field of study/work |
| `status` | ENUM('pending','approved','rejected','suspended') | Default: 'pending' |
| `created_at` | TIMESTAMP | |
| `approved_at` | TIMESTAMP NULL | Set when admin approves |
| `approved_by` | INT FK → users(id) | Self-referential FK |
| `updated_at` | TIMESTAMP | Auto-updated |

**Indexes:** `idx_email`, `idx_status`, `idx_role`

> New clients register with `status='pending'` and must be **manually approved** by an admin before they can access the system.

---

### Table: `tasks`
The central entity of the application.

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `client_id` | INT FK → users(id) NULL | Registered client link |
| `guest_client_id` | INT FK → guest_clients(id) NULL | Guest client link |
| `client_name` | VARCHAR(255) | Legacy string name (fallback) |
| `task_name` | VARCHAR(255) | Short task title |
| `task_description` | TEXT | Full description |
| `date_commissioned` | DATE | |
| `date_delivered` | DATE | |
| `expected_amount` | DECIMAL(10,2) | Admin's internal cost estimate |
| `quoted_amount` | DECIMAL(10,2) | Amount sent to client as quote |
| `quantity` | INT | Default: 1 |
| `is_paid` | TINYINT(1) | Boolean payment flag |
| `priority` | ENUM('low','medium','high','urgent') | Default: 'medium' |
| `status` | ENUM('not_started','in_progress','review','completed') | Default: 'not_started' |
| `quote_status` | ENUM('pending_quote','quote_sent','approved','rejected','in_progress','completed','cancelled') | Default: 'pending_quote' |
| `notes` | TEXT | Admin internal notes |
| `has_file` | TINYINT(1) | Computed/cached flag |
| `last_message_at` | TIMESTAMP NULL | Updated on new message |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Indexes:** `idx_priority`, `idx_status`, `fk_task_client`

> A task can belong to a **registered user** (`client_id`), a **guest client** (`guest_client_id`), or be a **legacy record** (only `client_name` string). `Task.findAll()` uses `COALESCE` to resolve the display name across all three types.

---

### Table: `messages`
Task-specific chat between admin and client.

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `task_id` | INT FK → tasks(id) CASCADE | |
| `sender_id` | INT FK → users(id) CASCADE | |
| `message` | TEXT | |
| `file_url` | VARCHAR(500) NULL | Added via `add_message_files.sql` |
| `file_name` | VARCHAR(255) NULL | Added via `add_message_files.sql` |
| `file_size` | INT NULL | Added via `add_message_files.sql` |
| `file_type` | VARCHAR(50) NULL | Added via `add_message_files.sql` |
| `read_at` | TIMESTAMP NULL | NULL = unread |
| `created_at` | TIMESTAMP | |

> Messages cascade-delete when their parent task is deleted.

---

### Table: `task_files`
Files attached to tasks (stored in R2/S3 or local `/uploads`).

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `task_id` | INT FK → tasks(id) CASCADE | |
| `original_filename` | VARCHAR(255) | Original user filename |
| `stored_filename` | VARCHAR(255) | UUID-based stored name |
| `file_path` | VARCHAR(500) | S3/R2 key or local path |
| `file_type` | VARCHAR(255) | MIME type |
| `file_size` | INT | Bytes |
| `uploaded_by` | INT FK → users(id) SET NULL | |
| `uploaded_at` | TIMESTAMP | |

---

### Table: `notifications`
User notification records.

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `user_id` | INT FK → users(id) CASCADE | |
| `type` | VARCHAR(50) | Notification category |
| `message` | TEXT | |
| `read_at` | TIMESTAMP NULL | NULL = unread |
| `created_at` | TIMESTAMP | |

> ⚠️ **Schema Mismatch**: `Notification.js` queries columns (`recipient_id`, `recipient_type`, `notification_type`, `title`, `is_read`) that don't exist in the migration. The model silently swallows errors with a temporary workaround.

---

### Table: `guest_clients`
Clients who have tasks but no registered account.

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(255) | |
| `email` | VARCHAR(255) NULL | |
| `phone` | VARCHAR(50) NULL | |
| `course` | VARCHAR(255) NULL | |
| `notes` | TEXT NULL | |
| `password_hash` | VARCHAR(255) NULL | For optional login access |
| `has_login_access` | BOOLEAN | Default: FALSE |
| `upgraded_to_user_id` | INT FK → users(id) SET NULL | Set when guest registers |
| `upgraded_at` | TIMESTAMP NULL | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

> Guest clients can be **upgraded/merged** into full registered users. When merged, all their tasks are transferred via `Task.transferGuestTasks()`.

---

## 3. Database Migration History

Migrations are **manual SQL files** — no ORM or automated migration tracker (no `schema_migrations` table).

| # | File | What It Does |
|---|---|---|
| Baseline | `ktrack_db_dump.sql` | Creates `users`, `tasks`, `messages`, `task_files` + seeds admin user |
| 002 | `002_add_task_enhancements.sql` | Adds `priority`, `status`, `notes` columns to `tasks` |
| 003 | `003_create_users_table.sql` | Creates `users` table (superseded by baseline) |
| 004 | `004_create_task_files_table.sql` | Creates `task_files`, adds `has_file` + `client_id` to `tasks` via stored procedure |
| 005 | `005_create_notifications_table.sql` | Creates `notifications` table |
| 006 | `006_create_guest_clients.sql` | Creates `guest_clients`, adds `guest_client_id` to `tasks`, migrates legacy data |
| Ad-hoc | `add_message_files.sql` | Adds `file_url`, `file_name`, `file_size`, `file_type` to `messages` |

> ⚠️ **Risk**: No migration tracking table means migrations can be accidentally re-run. `run_migration.js` is hardcoded to only run `add_message_files.sql`.

---

## 4. Backend API

### Middleware Stack (in order)
1. **Global Debug Logger** — logs all requests to `debug_global_top.log`
2. **Request ID** — attaches unique ID to each request for tracing
3. **Helmet** — security headers (CSP, HSTS, X-Frame-Options, etc.)
4. **CORS** — restricted to `CORS_ORIGIN` env var
5. **Trust Proxy** — for Render/Heroku/Vercel deployments
6. **Rate Limiter** — 200 req/15min general; 20 req/15min for auth endpoints
7. **Body Parser** — JSON + URL-encoded (10mb limit)
8. **Cookie Parser** — for JWT refresh tokens and CSRF
9. **CSRF Protection** — `csurf` middleware; token served at `GET /api/csrf-token`

### API Routes

| Route | Auth | Role | Description |
|---|---|---|---|
| `GET /api/csrf-token` | No | Any | Get CSRF token |
| `GET /health` | No | Any | Health check |
| `POST /api/auth/register` | No | Any | Register (rate limited) |
| `POST /api/auth/login` | No | Any | Login (rate limited) |
| `POST /api/auth/logout` | No | Any | Logout (clears cookie) |
| `POST /api/auth/refresh` | No | Any | Refresh JWT |
| `GET /api/auth/me` | Yes | Any | Get current user |
| `PUT /api/auth/profile` | Yes | Any | Update profile |
| `PUT /api/auth/password` | Yes | Any | Change password |
| `PUT /api/auth/email` | Yes | Any | Change email |
| `GET /api/tasks` | Yes | Any | Get tasks (filtered by role) |
| `POST /api/tasks` | Yes | Any | Create task |
| `PUT /api/tasks/:id` | Yes | Any | Update task |
| `PATCH /api/tasks/:id/toggle-payment` | Yes | Any | Toggle paid status |
| `DELETE /api/tasks/:id` | Yes | Any | Delete task |
| `POST /api/tasks/:id/quote` | Yes | Admin | Send quote to client |
| `POST /api/tasks/:id/quote/respond` | Yes | Any | Client approves/rejects quote |
| `POST /api/tasks/:taskId/files` | Yes | Any | Upload files (max 10) |
| `GET /api/tasks/:taskId/files` | Yes | Any | List task files |
| `GET /api/files/:id` | Yes | Any | Download file |
| `DELETE /api/files/:id` | Yes | Any | Delete file |
| `GET /api/users` | Yes | Admin | List all users |
| `POST /api/users/:id/approve` | Yes | Admin | Approve user |
| `POST /api/users/:id/reject` | Yes | Admin | Reject user |
| `POST /api/users/:id/suspend` | Yes | Admin | Suspend user |
| `GET /api/messages/:taskId` | Yes | Any | Get task messages |
| `POST /api/messages/:taskId` | Yes | Any | Send message |
| `GET /api/notifications` | Yes | Any | Get notifications |
| `PATCH /api/notifications/:id/read` | Yes | Any | Mark notification read |
| `GET /api/analytics/*` | Yes | Admin | Revenue/task/user analytics |
| `GET /api/guest-clients` | Yes | Admin | List guest clients |
| `POST /api/guest-clients` | Yes | Admin | Create guest client |
| `PUT /api/guest-clients/:id` | Yes | Admin | Update guest client |
| `DELETE /api/guest-clients/:id` | Yes | Admin | Delete guest client |
| `POST /api/guest-clients/:id/upgrade` | Yes | Admin | Merge guest → registered user |
| `GET /api/public/stats` | No | Any | Public stats (no rate limit) |

### Authentication Flow
```
Register → status='pending' → Admin approves → status='approved'
Login    → JWT access token (short-lived) + HttpOnly Cookie (refresh token)
         → Axios interceptor catches 401 → POST /api/auth/refresh → new token
Logout   → clears cookie + invalidates token
```

---

## 5. Frontend Structure

### Pages & Routes

| Path | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/dashboard` | `Dashboard` (role-aware) | Auth required |
| `/client/dashboard` | `Dashboard` | Client only |
| `/admin/dashboard` | `Dashboard` | Admin only |
| `/admin/users` | `UserManagement` | Admin only |
| `/admin/guests` | `GuestClientManagement` | Admin only |
| `/projects` | `Projects` | Auth required |
| `/files` | `Files` | Auth required |
| `/settings` | `Settings` | Auth required |
| `/analytics` | `Analytics` | Admin only |

### State Management

| Context | Purpose |
|---|---|
| `AuthContext` | User session, login/logout, token management |
| `NavigationContext` | Sidebar/navigation state |
| `AnalyticsContext` | Admin analytics data fetching and caching |

### Dashboard Logic
`Dashboard.jsx` renders either `AdminDashboard` or `ClientDashboard` based on `user.role` from `AuthContext`.

- **AdminDashboard**: Full task CRUD, user approvals, quote sending, file management, analytics charts
- **ClientDashboard**: Read-only project view, quote approval/rejection, messaging

---

## 6. Key Business Logic

### Quote Workflow
```
Admin creates task  → quote_status: 'pending_quote'
Admin sends quote   → quote_status: 'quote_sent', quoted_amount set
Client approves     → quote_status: 'approved'
Client rejects      → quote_status: 'rejected'
Work completes      → quote_status: 'completed'
```

### Client Type Resolution
Tasks support three client types, resolved in order:
1. **Registered** — `client_id` links to `users` table
2. **Guest** — `guest_client_id` links to `guest_clients` table
3. **Legacy** — only `client_name` string (pre-user-system data)

### Guest Client Upgrade
When a guest client registers as a full user, the admin can merge them:
1. `guest_clients.upgraded_to_user_id` is set
2. All tasks with `guest_client_id` are transferred to `client_id` via `Task.transferGuestTasks()`

---

## 7. Known Issues & Technical Debt

| Issue | Severity | Location |
|---|---|---|
| **Notification schema mismatch** — model queries columns that don't exist in the migration | 🔴 High | `Notification.js` vs `005_create_notifications_table.sql` |
| **No migration tracking** — no `schema_migrations` table; migrations can be re-run | 🔴 High | `backend/migrations/` |
| **`task_name` column** — used in `Task.js` INSERT but absent from baseline `ktrack_db_dump.sql` | 🟡 Medium | `Task.js` vs `ktrack_db_dump.sql` |
| **Debug logs in production** — `debug_global_top.log` and `debug_global.log` grow unboundedly | 🟡 Medium | `server.js` |
| **`run_migration.js` hardcoded** — only runs `add_message_files.sql`, not a general runner | 🟡 Medium | `backend/run_migration.js` |
| **`Message.getUnreadCount()` stub** — always returns 0, not implemented | 🟢 Low | `Message.js` |
| **CSRF + SPA friction** — frontend must fetch `/api/csrf-token` before every mutation | 🟢 Low | `server.js` |
