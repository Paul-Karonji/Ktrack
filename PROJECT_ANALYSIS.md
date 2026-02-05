# Project Analysis: K-Track Task Tracker

## 1. System Architecture
The K-Track Task Tracker is a full-stack web application designed for managing tasks, payments, and client-admin interactions. It follows a client-server architecture:
- **Frontend**: React-based Single Page Application (SPA).
- **Backend**: Node.js/Express API server.
- **Database**: MySQL for structured data storage.
- **Storage**: AWS S3 (or compatible) for file uploads/attachments.

---

## 2. Backend Analysis

### Core Technologies
- **Framework**: Express.js
- **Database**: MySQL (via `mysql2/promise`)
- **Authentication**: JWT (JSON Web Tokens) with Cookie-based refresh tokens.
- **Encryption**: Bcrypt for password hashing.
- **File Handling**: Multer (processing) and AWS SDK (storage).
- **Validation**: Joi (schema validation).

### Data Models
- **User**: Manage client and admin profiles, statuses (pending/approved), and roles.
- **Task**: Core entity for tracking work, quotes, amounts, and payment status.
- **Message**: Internal chat system for task-specific communication.
- **Notification**: Real-time (or polling-based) alerts for user actions.

### API Breakdown
- `/api/auth`: Login, Register, Logout, Refresh Token, and User Profile.
- `/api/tasks`: CRUD operations, file uploads, quote management, and payment toggles.
- `/api/users`: Admin-only user management (approvals, stats).
- `/api/messages`: Task-specific chat functionality.
- `/api/files`: File download/delete operations.

---

## 3. Frontend Analysis

### Core Technologies
- **Library**: React 19 (TypeScript).
- **State Management**: React Context (`AuthContext`) and custom hooks (`useTasks`, `useOnlineStatus`).
- **Styling**: Tailwind CSS for responsive and premium design.
- **Icons**: Lucide React.
- **Charts**: Recharts for business analytics.
- **API Client**: Axios with interceptors for token handling.

### Routing System
- **Public**: Landing Page, Login, Register.
- **Protected**: 
  - `/dashboard`: Universal entry point (routes to role-specific view).
  - `/admin/dashboard`: Extensive control over all tasks and users.
  - `/client/dashboard`: Focused view for project tracking and quotes.
  - `/admin/users`: Dedicated user management interface.

---

## 4. Dashboard Deep Dive

### Admin Dashboard
- **Analytics**: Revenue tracking, task volume, and user growth charts.
- **Task Management**: Full CRUD, duplication, and quote sending.
- **User Approvals**: Approval workflow for new client registrations.
- **File Control**: Direct upload/download of project assets.

### Client Dashboard
- **Welcome Center**: Personalized experience with quick stats.
- **Project Tracking**: Categorized views (Active, Quotes, History).
- **Interaction**: Directly approve or reject quotes sent by the admin.
- **Support**: Integrated Help Guide for new users.

---

## 5. Security & Integration
- **Auth Flow**: JWT-based with auto-refresh mechanism via Axios interceptors.
- **Rate Limiting**: Protection against brute force (strict on auth, lenient on API).
- **CORS/Helmet**: Standard security headers and origin control.
- **File Security**: Presigned URLs (planned or implemented) for S3 access.
