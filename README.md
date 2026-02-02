# K-Track | Commission & Task Management

**K-Track** is a specialized task management platform designed to bridge the gap between professionals and their clients. It features real-time task tracking, secure file sharing (Cloudflare R2), instant chat, and commission status management.

## ✨ Features

*   **Role-Based Dashboards**: tailored views for **Clients** (request & track) and **Admins** (manage & fulfill).
*   **Real-Time Status**: Live updates on task progress (Pending -> In Progress -> Completed).
*   **File Management**: Secure file uploads using **Cloudflare R2** with automatic local fallback.
*   **Integrated Chat**: Per-task messaging with read receipts and unread badges.
*   **Commission Tracking**: Track expected amounts, send quotes, and record payment status (Manual confirmation).
*   **Responsive Design**: Modern, mobile-friendly UI.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v14 or higher)
*   MySQL Database

### 1. Backend Setup
Navigate to the `backend` folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=task_tracker
JWT_SECRET=your_jwt_secret

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
```

Start the backend server:
```bash
npm start
# OR for development with auto-restart:
npm run dev
```

### 2. Frontend Setup
Navigate to the `frontend` folder and install dependencies:
```bash
cd frontend
npm install
```

Start the React development server:
```bash
npm start
```
The app will open at `http://localhost:3000`.

## 📂 Project Structure

*   **`backend/`**: Express.js API, Database handling, and R2 File services.
*   **`frontend/`**: React application (UI).
    *   `src/pages/`: Main views (Dashboard, Login, Landing Page).
    *   `src/components/`: Reusable UI components.
    *   `public/branding/`: Place your custom Logo and Favicon here.

## 📖 User Guide
For new clients, check out the comprehensive [User Guide](USER_GUIDE.md) which includes:
*   Step-by-step registration and approval process
*   How to create and manage tasks
*   Understanding the quote approval workflow
*   Using the chat feature
*   File upload and download instructions
*   Frequently Asked Questions

## 🛠️ Admin Utilities
The `backend/scripts/` folder contains helpful tools for server management:
*   `node scripts/list_all_users.js`: View all registered users.
*   `node scripts/reset_admin_password.js`: Emergency password reset.

## 📄 License
Private Property of K-Track Systems. All Rights Reserved.
