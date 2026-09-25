SUN SPY RANDOM CHAT — VIP + ADMIN V2

This package upgrades the existing Firebase + Render build.

FILES
- index.html / style.css / script.js: GitHub Pages frontend
- server.js / package.json: Render signaling + secure Admin API
- firestore.rules: recommended baseline rules

NEW FRONTEND
- VIP avatar frames: Gold, Neon, Fire, Diamond, Sakura, Shadow Mask
- Coin-priced frames and matching/entrance effects
- Matching effect button (Mask, Crown, Sparkle, Hearts, Lightning, Galaxy)
- VIP profile collection and received-gift display
- VIP Studio
- Admin dashboard loads all Firebase users automatically; search remains optional
- Click a user to open Admin Control Mode
- Admin Gmail re-authentication is required before sensitive control actions and is refreshed every 10 minutes
- Admin can update VIP level, plan, avatar frame and effects; coins and account status remain server-side

SECURITY
- Admin routes require Firebase ID token with admin=true
- Service account JSON stays on Render only
- Admin control mode is NOT a password-revealing login as the user. Firebase passwords are never exposed. It is audited server-side management of the selected account.
- Private photos/chats are not magically accessible: this build provides the secure control surface, while actual Storage/chat records must exist before they can be reviewed.
- Random Chat remains peer-to-peer WebRTC and is not automatically recorded.

RENDER
Build: npm install
Start: npm start
Keep existing env vars:
FIREBASE_SERVICE_ACCOUNT_JSON
ADMIN_EMAIL=sithu85092@gmail.com
FRONTEND_ORIGIN=https://sithu85092-ui.github.io

GITHUB PAGES
Replace index.html, style.css and script.js in SUN-SPY-RANDOM-CHAT and push.

IMPORTANT
Never commit the Firebase service-account private JSON.
