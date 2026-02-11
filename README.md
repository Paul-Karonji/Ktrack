# K-Track | Advanced Task & Commission Management

**K-Track** is a professional task management platform designed to bridge the gap between service providers and their clients. It features real-time task tracking, secure file sharing (Cloudflare R2), instant chat, commission management, and a unique **Hybrid Client System** supporting both registered users and guest clients.

## ✨ Key Features

### 👥 Client Management
*   **Hybrid Client System**: Seamlessly manage **Registered Users** (full access) and **Guest Clients** (admin-managed) in one unified dashboard.
*   **Account Merging**: Powerful workflow to merge a Guest Client's history into a Registered User account when they sign up.
*   **Admin Dashboard**: comprehensive view of all clients with "Edit," "New Task," and "View Profile" actions.

### 📊 Analytics & Insights
*   **Interactive Dashboard**: Real-time charts for Revenue Trends, Task Distribution, and Priority Breakdown.
*   **Client Growth Tracking**: Visualize client acquisition rates (Registered vs. Guest) over time.
*   **Financial Reports**: Track expected vs. actual revenue with monthly breakdowns.

### ⚡ Task & Workflow
*   **Real-Time Tracking**: Live status updates with complete workflow:
    *   **Pending Quote** → Admin reviews and sends quote
    *   **Quote Sent** → Client approves/rejects via one-click buttons
    *   **In Progress** → Work is being done
    *   **Review** → Client reviews deliverables
    *   **Completed** → Task finished
*   **Quote Approval System**: Clients can approve or reject quotes with dedicated Accept/Reject buttons directly in the dashboard.
*   **File Management**: Secure, task-specific file uploads using **Cloudflare R2** with local storage fallback (10MB per file limit).
*   **Contextual Chat**: Private messaging thread for every task with unread message badges and real-time updates.
*   **Mobile Responsive**: Fully optimized for mobile devices with adaptive layouts, card views, and touch-friendly interfaces.

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
    *   **`models/`**: `User`, `Task`, `GuestClient` (New!)
    *   **`controllers/`**: Logic for task flow, guest management, and analytics.
*   **`frontend/`**: React application (UI).
    *   **`src/pages/`**: 
        *   `AdminDashboard.jsx`: The command center for admins.
        *   `GuestClientManagement.jsx`: Dedicated guest handling.
    *   **`src/components/charts/`**: Recharts visualizations (`AnalyticsCharts`, `ClientGrowthChart`).

## 🛠️ Admin Utilities
The `backend/scripts/` folder contains helpful tools for server management:
*   `node scripts/create_admin.js`: Create an initial admin account.
*   `node scripts/list_all_users.js`: View all registered users.

## 📄 License
Private Property of K-Track Systems. All Rights Reserved.
