SUN SPY - Firebase Auth Update

Files:
- index.html
- style.css
- script.js

Firebase project:
- sun-spy
- authDomain: sun-spy.firebaseapp.com
- GitHub Pages domain: sithu85092-ui.github.io

IMPORTANT:
1. Firebase Authentication -> Sign-in method -> Google must be Enabled.
2. If Email/Password login and signup are wanted, enable Email/Password too.
3. Authorized domains must include sithu85092-ui.github.io.
4. Google login uses the Firebase Auth account; fake Gmail + arbitrary password will no longer work.
5. The current browser-side admin gate recognizes sithu85092@gmail.com. For production-grade admin security, move admin authorization to Firebase custom claims / a trusted backend and verify ID tokens server-side.
6. Do not put Firebase service-account private keys in the website.
