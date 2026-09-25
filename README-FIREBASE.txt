SUN SPY — Firebase Auth + Admin Control Center

Included:
- Firebase Email/Password authentication
- Firebase Google authentication
- Normal user app remains available to the admin account
- Admin-only Control Center button (🛡️ ADMIN)
- Responsive dark Admin Dashboard UI
- User search shell
- Coin/Wallet management UI
- Users, Private Media, Chats, Reports, Moderation, Payments, Live, Verification, Support, Audit, Security and Settings sections
- Admin back-to-app button

IMPORTANT:
1. Enable Firebase Authentication > Email/Password and Google.
2. Add sithu85092-ui.github.io to Firebase Authentication > Settings > Authorized domains.
3. Current frontend admin identity is sithu85092@gmail.com. This is NOT production-grade authorization by itself.
4. Coin buttons currently affect the currently connected local account only. Global user coin control requires a secured backend/Firestore admin API.
5. The current Random Chat is peer-to-peer WebRTC. There is no server-side archive of private video/chat content. Admin chat/media review requires a backend with explicit authorization, storage and audit logging.
6. Never put a Firebase service-account private key in the website.

Deploy:
- Replace index.html, style.css and script.js in the GitHub Pages repository.
- Commit/push.
- Open the GitHub Pages site and hard refresh the browser.
