SUN SPY — Secure Firebase Admin + Render API
============================================

This package keeps normal User features and Random Chat, while adding a server-side Admin role.

FILES
-----
index.html
style.css
script.js
server.js
package.json
README-ADMIN-SECURE.txt

1) FIREBASE AUTH
----------------
Keep these Firebase providers enabled:
- Google
- Email/Password

Authorized domain:
- sithu85092-ui.github.io

2) CREATE FIREBASE SERVICE ACCOUNT
----------------------------------
Firebase Console -> Project settings -> Service accounts -> Firebase Admin SDK -> Generate new private key.
Download the JSON only for your own setup. NEVER put this private JSON inside index.html or script.js.

3) RENDER ENVIRONMENT VARIABLES
--------------------------------
For the existing Render service `sun-spy-signaling`, add:

FIREBASE_SERVICE_ACCOUNT_JSON = paste the COMPLETE service-account JSON on one line
ADMIN_EMAIL = sithu85092@gmail.com
FRONTEND_ORIGIN = https://sithu85092-ui.github.io

Do not commit the service-account JSON to GitHub.

4) RENDER BUILD / START
-----------------------
Build command:
npm install

Start command:
npm start

The new server still exposes:
https://sun-spy-signaling.onrender.com/health
wss://sun-spy-signaling.onrender.com/ws

It also exposes secure API routes under /api/.

5) ADMIN CLAIM
--------------
When the Render server starts, it finds ADMIN_EMAIL in Firebase Authentication and gives that user:
admin: true

After the claim is added, log out and log in again (or refresh the Firebase token).
The browser no longer treats a matching email as sufficient admin proof.

6) ADMIN API
------------
GET  /api/admin/me
GET  /api/admin/stats
GET  /api/admin/users?q=...
POST /api/admin/users/:uid/coins
POST /api/admin/users/:uid/status
GET  /api/admin/reports
GET  /api/admin/audit

All /api/admin/* routes require a valid Firebase ID token with admin=true.

7) FIRESTORE COLLECTIONS USED
-----------------------------
users/{uid}
coinTransactions/{autoId}
reports/{autoId}
auditLogs/{autoId}

Coin changes are performed by the Render server with Firebase Admin SDK and are written to an audit log.

8) PRIVATE MEDIA / CHAT
-----------------------
The frontend does NOT expose all private photos or private chats to admins.
Those features require a defined moderation case and server-side authorization. Random Chat is peer-to-peer WebRTC, so there is no automatic server-side video archive.

9) IMPORTANT
------------
Firebase Web API keys in the frontend are normal for Firebase web apps. The Firebase service-account private key is different and must remain server-side only.
