# Security Assessment Report

Date: 2026-03-30

## Executive Summary

I reviewed the `Express + React` application statically and then validated the highest-risk paths against a live local instance. The current API authorization on `tasks`, `files`, `messages`, and `users` is materially better than the older repro scripts in the repo suggest: current route handlers are checking ownership/admin role in the main CRUD paths, login uses an `HttpOnly` refresh-token cookie, and SQL access is parameterized in the code paths I inspected.

The largest remaining issues are:

1. the Socket.IO server has no authentication or room authorization,
2. chat-file uploads bypass the main file-type allowlist and can serve active content inline,
3. a tracked SQL dump contains real admin credential material,
4. HTML email templates interpolate user-controlled values without escaping, and
5. bearer access tokens are persisted in `localStorage`.

## High Severity

### F-01: Socket.IO accepts anonymous clients and arbitrary room joins

- Rule ID: SOCKET-AUTH-001
- Severity: High
- Location:
  - `backend/services/socketService.js:5-33`
  - `backend/controllers/messageController.js:69-72`
  - `backend/controllers/messageController.js:178-181`
  - `backend/controllers/messageController.js:301-303`
  - `backend/controllers/messageController.js:353-355`
  - `frontend/src/context/SocketContext.jsx:26-35`
- Evidence:
  - The server creates Socket.IO with CORS settings only, then accepts every connection.
  - `join_room` blindly calls `socket.join(room)` without authenticating the socket or checking whether the caller is allowed to join that room.
  - Message broadcasts are sent to predictable room names such as `task_<id>` and `general_<clientId>`.
- Runtime validation:
  - On 2026-03-30, two anonymous `socket.io-client` connections successfully connected to `http://localhost:3001`.
  - One client joined `task_1` and received a `user_typing` event injected by the other client without any auth token or cookie.
- Impact:
  - Any external client that can reach the Socket.IO endpoint can subscribe to or inject activity into predictable rooms.
  - A low-privilege user can likely listen to other users’ live chat traffic and typing indicators by guessing task/client IDs.
- Fix:
  - Require authentication during the socket handshake.
  - Derive room membership server-side from the authenticated user instead of trusting a client-supplied room name.
  - Reject `join_room` requests unless the server verifies ownership/admin access for the referenced task/client.
- Mitigation:
  - If a full auth refactor must wait, disable chat socket features in production and fall back to authenticated polling for now.
- False positive notes:
  - None. This was confirmed live against the running server.

### F-02: Chat attachment endpoints bypass the file allowlist and can serve attacker-controlled SVG inline

- Rule ID: FILE-UPLOAD-001
- Severity: High
- Location:
  - `backend/routes/messages.js:8-12`
  - `backend/routes/messages.js:23-24`
  - `backend/controllers/messageController.js:146-176`
  - `backend/controllers/messageController.js:232-241`
  - `backend/controllers/messageController.js:327-350`
  - `backend/middleware/upload.js:6-33` (contrast: main task-file uploads do enforce an allowlist)
- Evidence:
  - Message routes define their own `multer` instance with only a 10 MB size limit and no `fileFilter`.
  - The uploaded file’s client-supplied `mimetype` is stored and later used as the response `Content-Type`.
  - Any `image/*` type is served with `Content-Disposition: inline`.
- Runtime validation:
  - On 2026-03-30, I uploaded `pentest.svg` to `/api/messages/tasks/12/file`; the server returned `201` and stored `file_type: "image/svg+xml"`.
  - Fetching `/api/messages/file/<messageId>` returned `200`, `Content-Type: image/svg+xml`, and `Content-Disposition: inline`.
  - As a control, the same SVG upload to `/api/tasks/12/files` was rejected with `{"success":false,"message":"Invalid file type"}`.
- Impact:
  - Attackers can upload file types the primary upload policy explicitly rejects.
  - SVG and other active content create a viable client-side attack surface through chat attachments and browser rendering behavior.
- Fix:
  - Reuse `backend/middleware/upload.js` for message uploads instead of defining a weaker upload path.
  - Explicitly block SVG, HTML, and other active-content types unless there is a documented business need.
  - For risky types, force `attachment` download and never `inline`.
  - Add server-side content sniffing/magic-byte validation instead of trusting `mimetype`.
- Mitigation:
  - If SVG must stay allowed, sanitize it and serve it from an isolated download origin with `Content-Disposition: attachment`.
- False positive notes:
  - None. This was confirmed live.

### F-03: A tracked SQL dump contains real admin credential material

- Rule ID: SECRETS-REPO-001
- Severity: High
- Location:
  - `backend/ktrack_db_dump.sql:92`
- Evidence:
  - The SQL dump contains an inserted admin record with a real email address and a bcrypt password hash.
  - I confirmed locally that `backend/ktrack_db_dump.sql` is version-controlled.
- Impact:
  - Anyone with repository access gets real credential material and user data.
  - Even with bcrypt, offline cracking and credential reuse become realistic, especially if the password was reused elsewhere.
- Fix:
  - Remove the dump from the current tree and repository history.
  - Rotate the affected admin password immediately.
  - Replace real dumps with sanitized fixtures or migration seeds that use obviously fake data.
- Mitigation:
  - Treat every credential and secret present in any historical dump as compromised until rotated.
- False positive notes:
  - Severity depends on who can access the repository, but the exposure is real in the repo itself.

## Medium Severity

### F-04: HTML email templates interpolate user-controlled values without escaping

- Rule ID: HTML-OUTPUT-001
- Severity: Medium
- Location:
  - `backend/templates/emailTemplates.js:62-66`
  - `backend/templates/emailTemplates.js:80-86`
  - `backend/templates/emailTemplates.js:99-101`
  - `backend/templates/emailTemplates.js:130-135`
  - `backend/templates/emailTemplates.js:235-239`
  - `backend/templates/emailTemplates.js:261-267`
- Evidence:
  - User-controlled values such as `user.full_name`, `user.email`, `task.task_description`, `clientName`, and `messageText` are inserted directly into HTML email templates with `${...}` interpolation.
- Impact:
  - An attacker can inject arbitrary HTML into emails sent to admins or clients.
  - Most mail clients block script execution, but HTML injection still enables phishing links, deceptive layout/content, image beacons, and credential harvesting tricks.
- Fix:
  - Add a small HTML-escaping helper and apply it to every untrusted interpolated value before building the template string.
  - Keep action URLs sourced from trusted server-side constants only.
- Mitigation:
  - Until fixed, treat inbound registration names, task descriptions, and message bodies as potentially hostile when sending email notifications.
- False positive notes:
  - This is about HTML injection in email clients, not browser DOM XSS in the React UI. I did not find direct DOM XSS sinks in the frontend during this pass.

### F-05: Bearer access tokens are persisted in `localStorage`

- Rule ID: TOKEN-STORAGE-001
- Severity: Medium
- Location:
  - `backend/controllers/authController.js:158-172`
  - `backend/controllers/authController.js:237-240`
  - `frontend/src/context/AuthContext.js:15-16`
  - `frontend/src/context/AuthContext.js:50`
  - `frontend/src/context/AuthContext.js:85`
  - `frontend/src/services/api.js:40-42`
  - `frontend/src/services/api.js:57`
  - `frontend/src/services/api.js:68`
  - `frontend/src/services/api.js:101`
  - `frontend/src/services/api.js:112`
- Evidence:
  - The backend returns the access token in JSON.
  - The frontend stores and retrieves that token from `localStorage`, then injects it into `Authorization: Bearer ...` on every request.
- Impact:
  - Any future XSS bug, malicious browser extension, or compromised third-party script can exfiltrate active bearer tokens immediately.
  - Persisting the token beyond page life increases the blast radius compared with in-memory storage.
- Fix:
  - Prefer an `HttpOnly` cookie-backed session or keep the access token only in memory and refresh it as needed.
  - If you keep this design, add a strict CSP, reduce third-party script exposure, and treat every DOM/HTML sink as high risk.
- Mitigation:
  - Shorten access-token lifetime and implement refresh-token rotation/revocation if you keep bearer tokens client-side.
- False positive notes:
  - I did not find an obvious current frontend XSS sink, so this is a design-risk finding rather than proof of live token theft.

## Notes / Positive Findings

- Task, file, message, and user HTTP routes are enforcing ownership/admin checks in the current code paths I inspected.
- The main task-file upload flow already has a MIME-type and extension allowlist in `backend/middleware/upload.js`.
- Login sets the refresh token in an `HttpOnly` cookie with `SameSite=Strict`.
- Database queries in the reviewed paths use parameterized statements rather than string concatenation.

## Recommended Fix Order

1. Lock down Socket.IO authentication and room authorization.
2. Unify message uploads with the existing strict file-upload middleware and block active-content file types.
3. Remove the tracked SQL dump and rotate the admin password immediately.
4. Escape all untrusted values in HTML email templates.
5. Move away from `localStorage` for bearer-token persistence or at minimum harden the frontend with a strict CSP and minimized third-party script surface.
