# K-Track (Multi-Tutor Agency Platform)

K-Track is a premium multi-tutor task and client management platform for commission-based work. It combines streamlined self-service client onboarding, automated email verification, task pooling and claiming, multi-role access (superadmin, tutor, client), per-task chat, file delivery, quoting, analytics, and Paystack-powered payments in a single app.

---

## 🛠️ The Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Lucide Icons, Axios, Socket.IO client
- **Backend**: Node.js, Express 5, Socket.IO
- **Database**: MySQL 8 / TiDB Serverless
- **Storage**: Cloudflare R2 with local fallback
- **Payments**: Paystack
- **Email**: Resend API

---

## 🔐 Core Features & Systems

### 1. K-Track Auth & Email Overhaul (Self-Service)
The platform features an advanced, fully self-service authentication workflow:
*   **Email Verification**: New client registrations start with a status of `pending` and `email_verified = 0`. An automated verification email containing a secure 32-byte hex verification token (valid for 24 hours) is immediately dispatched.
*   **Verification Activation**: Clicking the link instantly updates the user to `approved` and `email_verified = 1`, making them fully active. Concurrently, all superadmins and tutors receive an in-app notification.
*   **Forgot / Reset Password**: A robust forgot-password pipeline dispatches a secure 24-hour token. The Reset Password page contains a live password strength meter enforcing strict security:
    *   Minimum 8 characters
    *   At least one uppercase letter
    *   At least one lowercase letter
    *   At least one number
    *   At least one special character (`@$!%*?&`)
*   **Inline Resending**: If a user attempts to log in while unverified, the login page displays a custom notice and lets them request a new verification email in one click.

### 2. Tutor Onboarding System
*   **Superadmin Creation**: Superadmins can add new tutors directly from the Tutor Management dashboard.
*   **Automated Welcome Email**: The backend intercepts the temporary password before it is hashed, compiles a beautiful welcome email, and dispatches it asynchronously.
*   **First-Time Login**: The tutor logs in using the temporary credentials and is prompted to change their password via the Settings panel to maintain complete account security.

### 3. Email Optimization (Slashed Resend Usage)
To avoid unnecessary overhead, email dispatch is optimized down to exactly **5 essential business types**:
1.  **Email Verification**: Dispatched to clients upon signup or on-demand resend requests.
2.  **Password Reset**: Dispatched when requesting password recovery.
3.  **Account Onboarding**: Dispatched to tutors when manually added by superadmin.
4.  **Account Status Change**: Manual admin approvals, rejections, suspensions, and reactivations.
5.  **Admin / Paystack System Notifications**: Instant checkout, payment receipts, and quotes notifications.

*All generic event notifications (like new task uploads or payments) have been replaced with efficient, in-app `Notification` models and Socket.IO events.*

### 4. Client & Tutor Referral Program
A fully integrated, dynamic referral tracking system to incentivize word-of-mouth client acquisition:
*   **Unique Code Generation**: Every registered user and tutor is automatically assigned a unique 8-character uppercase referral code generated on signup (e.g., `KTR-X9Y1Z`).
*   **Personalized Referral Links**: Clients and tutors can copy their pre-formatted invite link (`/register?ref=CODE`) in one click from their dashboard's **Refer & Earn** or **Invite Clients** section.
*   **Tutor Scoped Invitations**: Tutors can invite their clients and maintain a real-time tracking list of their invited clients. Tutors can see their clients' details if they are the ones who referred them.
*   **Superadmin Configurable Rewards**: Superadmins can dynamically adjust the referral discount amount directly from the **Payments Settings** dashboard.
*   **Dynamic Balances & Crediting**: The database tracks `referral_discount_balance` for each client. When a referred client is approved, K-Track automatically retrieves the configured reward amount and dynamically credits the referrer's balance. Integrated hooks allow seamless discount consumption during checkout.

### 5. Automated Database Patch Service (`databasePatchService.js`)
*   **Idempotency**: A fully robust startup patcher scans the database, adding missing tables (`guest_clients`, `notifications`), executing column migrations (e.g., auth tokens and referral properties), and modifying role ENUMs dynamically on boot.
*   **Compatibility**: Designed to run flawlessly on strict serverless environments like TiDB Serverless.
*   **Safe Backfill**: Automatically sets `email_verified = 1` for all legacy tutor, superadmin, and approved accounts during initial patch migration.

---

## 🔒 Security Policies

- **Access Tokens**: Kept strictly in memory on the React client side.
- **Refresh Tokens**: Saved in secure `HttpOnly`, `SameSite: strict` (or `SameSite: none` for production cross-origin headers) cookies.
- **Rate Limiting**: Hardened limits on critical endpoints (login, register, forgot-password, checkout, file upload) to eliminate brute-force and resource-exhaustion vectors.
- **HMAC-SHA256 Timing-Safe URLs**: Guest checkout payment links are cryptographically signed. Comparing keys uses timing-safe checks (`crypto.timingSafeEqual`) to prevent side-channel timing attacks.
- **Scoped File Protection**: Tutors are strictly authorized to view, upload, or modify files only for tasks explicitly assigned to them in the database.

---

## 📂 Repository Layout

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
|-- DATABASE_SCHEMA.md
`-- README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MySQL 8+ or TiDB
- A target database (e.g., `ktrack`)

### Backend Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file inside the `backend/` folder:
   ```env
   PORT=3001
   NODE_ENV=development

   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=ktrack
   DB_PORT=3306

   JWT_SECRET=your_32_character_jwt_secret_phrase
   GUEST_PAYMENT_LINK_SECRET=your_long_cryptographic_secret

   CLIENT_URL=http://localhost:5173
   CORS_ORIGIN=http://localhost:5173

   RESEND_API_KEY=re_your_resend_api_key
   ADMIN_EMAIL=karonjipaul.w@gmail.com
   FROM_EMAIL=onboarding@resend.dev

   PAYSTACK_SECRET_KEY=sk_test_paystack_secret
   PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret
   EXCHANGE_RATE_USD_KES=135
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Create a `.env` file inside the `frontend/` folder:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_paystack_public_key
   VITE_EXCHANGE_RATE_USD_KES=135
   ```
3. Launch the development server:
   ```bash
   npm run start
   ```

---

## 🛠️ Administrative & Helper Scripts

All administrative helpers reside in `backend/scripts/` or `backend/scratch/` and should be executed with Node:
*   `node scripts/list_all_users.js` — Quick console dump of all users, roles, and verification states.
*   `node scripts/reset_admin_password.js` — Reset password for the main admin.
*   `node scripts/reset_client_password.js` — Hard reset client accounts.
*   `node scripts/verify_admin.js` — Manually trigger a mock verification callback.
*   `node scratch/verify_referral_rewards.js` — Runs programmatic end-to-end verification assertions for referral settings and balance-crediting hooks.
*   `node scratch/reset_password.js` — Reset local development credentials to a known value for testing.

---

## 📄 License

Private platform. All rights reserved.
