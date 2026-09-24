/* =========================================================
   SUN SPY — script.js
   Frontend/demo behavior for the supplied index.html.

   Includes:
   - Authentication
   - Navigation
   - Coin wallet
   - Transaction history
   - Gift shop
   - Gift amount
   - Multi-account recipient selection
   - Total cost calculation
   - Coin deduction
   - Profile editing
   - Profile photo
   - Random chat demo
   - Media inputs

   Backend authentication, payments, WebRTC matching and
   authorization must be implemented server-side for production.
   ========================================================= */

// @ts-nocheck

(() => {

  "use strict";


  /* =========================================================
     HELPERS
     ========================================================= */

  const $ = (s, root = document) =>
    root.querySelector(s);

  const $$ = (s, root = document) =>
    [...root.querySelectorAll(s)];

  const STORAGE =
    "SUN_SPY_STATE_V2";


  /* =========================================================
     STATE
     ========================================================= */

  const state = {

    user: null,

    coins: 0,

    plan: "Free",

    transactions: [],

    otp: null,

    pendingSignup: null,

    stream: null,

    matchingTimer: null,

    selectedFeed: "recommended",

    selectedGift: null,

    selectedRecipients: [],

    giftAmount: 1,

    ...loadState()

  };


  /* =========================================================
     LOAD STATE
     ========================================================= */

  function loadState() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(STORAGE)
        ) || {};

      if (!Array.isArray(saved.transactions)) {
        saved.transactions = [];
      }

      if (!Array.isArray(saved.selectedRecipients)) {
        saved.selectedRecipients = [];
      }

      if (
        !Number.isFinite(
          Number(saved.giftAmount)
        ) ||
        Number(saved.giftAmount) < 1
      ) {
        saved.giftAmount = 1;
      }

      return saved;

    } catch {

      return {};

    }

  }


  /* =========================================================
     SAVE STATE
     ========================================================= */

  function saveState() {

    localStorage.setItem(

      STORAGE,

      JSON.stringify({

        user: state.user,

        coins: Number(state.coins || 0),

        plan: state.plan || "Free",

        transactions:
          Array.isArray(state.transactions)
            ? state.transactions
            : []

      })

    );

  }


  /* =========================================================
     TOAST
     ========================================================= */

  function toast(
    message,
    type = "info"
  ) {

    let el =
      $("#sunSpyToast");


    if (!el) {

      el =
        document.createElement("div");

      el.id =
        "sunSpyToast";

      el.className =
        "toast";

      document.body.appendChild(el);

    }


    el.textContent =
      message;

    el.dataset.type =
      type;

    el.classList.add("show");


    clearTimeout(
      toast._timer
    );


    toast._timer =
      setTimeout(() => {

        el.classList.remove("show");

      }, 2400);

  }


  /* =========================================================
     ESCAPE HTML
     ========================================================= */

  function escapeHTML(value) {

    return String(
      value ?? ""
    ).replace(
      /[&<>"']/g,
      ch => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[ch])

    );

  }


  /* =========================================================
     CAPITALIZE
     ========================================================= */

  function capitalize(value) {

    const text =
      String(value || "");

    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );

  }


  /* =========================================================
     TRANSACTION SYSTEM
     ========================================================= */

  function addCoinTransaction(
    amount,
    type = "purchase",
    description = ""
  ) {

    if (
      !Array.isArray(
        state.transactions
      )
    ) {

      state.transactions = [];

    }


    const transaction = {

      id:
        Date.now() +
        Math.random(),

      amount:
        Number(amount || 0),

      type,

      description:
        description ||
        `${type} ${Number(
          amount || 0
        ).toLocaleString()} Coins`,

      date:
        new Date().toISOString()

    };


    state.transactions.unshift(
      transaction
    );


    /* Keep latest 100 */

    state.transactions =
      state.transactions.slice(
        0,
        100
      );


    saveState();

    renderTransactions();

  }


  /* =========================================================
     TRANSACTION HISTORY
     ========================================================= */

  function renderTransactions() {

    const list =
      $("#transactionList");

    if (!list) return;


    if (
      !Array.isArray(
        state.transactions
      )
    ) {

      state.transactions = [];

    }


    if (
      state.transactions.length === 0
    ) {

      list.innerHTML = `

        <div class="transaction-empty">

          <div class="transaction-empty-icon">
            🪙
          </div>

          <strong>
            No transactions yet
          </strong>

          <small>
            Your coin and gift activity
            will appear here.
          </small>

        </div>

      `;

      return;

    }


    list.innerHTML =
      state.transactions.map(
        transaction => {

          const amount =
            Number(
              transaction.amount || 0
            );


          const positive =
            amount >= 0;


          let icon =
            "💰";


          if (
            transaction.type ===
            "purchase"
          ) {

            icon = "🪙";

          }

          else if (
            transaction.type ===
            "gift"
          ) {

            icon = "🎁";

          }


          const sign =
            positive
              ? "+"
              : "";


          const date =
            transaction.date

              ? new Date(
                  transaction.date
                ).toLocaleString()

              : "";


          return `

            <div class="transaction-item">

              <div class="transaction-icon">
                ${icon}
              </div>

              <div class="transaction-info">

                <strong>
                  ${escapeHTML(
                    transaction.description ||
                    "Coin Transaction"
                  )}
                </strong>

                <small>
                  ${escapeHTML(date)}
                </small>

              </div>

              <div class="transaction-amount ${
                positive
                  ? "positive"
                  : "negative"
              }">

                ${sign}${amount.toLocaleString()}
                🪙

              </div>

            </div>

          `;

        }

      ).join("");

  }


  /* =========================================================
     SCREEN
     ========================================================= */

  function showOnlyScreen(id) {

    $$(".screen")
      .forEach(screen =>
        screen.classList.add("hidden")
      );


    const target =
      document.getElementById(id);


    if (target) {

      target.classList.remove(
        "hidden"
      );

    }

  }


  /* =========================================================
     AUTH
     ========================================================= */

  function setupAuth() {

    const loginForm = $("#loginForm");
    const signupForm = $("#signupForm");

    $("#showSignupBtn")?.addEventListener("click", () => {
      loginForm?.classList.add("hidden");
      signupForm?.classList.remove("hidden");
    });

    $("#showLoginBtn")?.addEventListener("click", () => {
      signupForm?.classList.add("hidden");
      loginForm?.classList.remove("hidden");
    });

    loginForm?.addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("#loginEmail")?.value.trim().toLowerCase();
      const password = $("#loginPassword")?.value || "";
      if (!email || !password) return toast("Email and password are required.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Please enter a valid email.");

      try {
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);
        await completeFirebaseLogin(result.user);
      } catch (err) {
        console.error(err);
        const map = {
          "auth/user-not-found": "No account exists with this email.",
          "auth/wrong-password": "Incorrect password.",
          "auth/invalid-credential": "Incorrect email or password.",
          "auth/invalid-email": "Please enter a valid email.",
          "auth/too-many-requests": "Too many attempts. Try again later."
        };
        toast(map[err.code] || err.message || "Login failed.");
      }
    });

    $("#googleLoginBtn")?.addEventListener("click", signInWithGoogle);

    signupForm?.addEventListener("submit", async e => {
      e.preventDefault();
      await handleFirebaseSignup();
    });

    $("#forgotPasswordBtn")?.addEventListener("click", async () => {
      const email = $("#loginEmail")?.value.trim().toLowerCase();
      if (!email) return toast("Enter your email first.");
      try {
        await firebase.auth().sendPasswordResetEmail(email);
        toast("Password reset email sent.", "success");
      } catch (err) {
        const map = { "auth/user-not-found": "No account exists with this email." };
        toast(map[err.code] || "Could not send reset email.");
      }
    });

    $("#verifyOtpBtn")?.addEventListener("click", verifyOtp);
    $("#resendOtpBtn")?.addEventListener("click", resendOtp);

    $("#backToLoginBtn")?.addEventListener("click", () => {
      showOnlyScreen("authScreen");
      $("#signupForm")?.classList.add("hidden");
      $("#loginForm")?.classList.remove("hidden");
    });

    $("#logoutBtn")?.addEventListener("click", logout);
    $("#adminLogoutBtn")?.addEventListener("click", logout);
    setupAdminDashboard();

    if (window.firebase?.auth) {
      firebase.auth().onAuthStateChanged(async user => {
        if (!user) {
          state.user = null;
          showOnlyScreen("authScreen");
          return;
        }
        await completeFirebaseLogin(user, true);
      });
    }
  }

  async function signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await firebase.auth().signInWithPopup(provider);
      await completeFirebaseLogin(result.user);
    } catch (err) {
      console.error(err);
      toast(err.code === "auth/popup-closed-by-user" ? "Google login cancelled." : (err.message || "Google login failed."));
    }
  }

  async function handleFirebaseSignup() {
    const username = $("#signupUsername")?.value.trim();
    const email = $("#signupEmail")?.value.trim().toLowerCase();
    const dob = $("#signupDob")?.value;
    const password = $("#signupPassword")?.value || "";
    const confirm = $("#signupConfirmPassword")?.value || "";
    const identity = $("#signupIdentity")?.value || "";
    const terms = $("#termsCheck")?.checked;

    if (!username || !email || !dob || !password || !confirm) return toast("Please complete all required fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Please enter a valid email.");
    if (password.length < 6) return toast("Password must be at least 6 characters.");
    if (password !== confirm) return toast("Passwords do not match.");
    if (!terms) return toast("Please agree to the terms.");

    try {
      const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await result.user.updateProfile({ displayName: username });
      state.user = { username, email, dob, identity, uid: result.user.uid };
      saveState();
      await result.user.sendEmailVerification();
      toast("Account created. Check your email to verify your account.", "success");
      await completeFirebaseLogin(result.user, false);
    } catch (err) {
      console.error(err);
      const map = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Password must be at least 6 characters."
      };
      toast(map[err.code] || err.message || "Sign up failed.");
    }
  }

  async function completeFirebaseLogin(user, silent = false) {
    if (!user) return;
    const adminEmail = "sithu85092@gmail.com";
    const isAdmin = String(user.email || "").toLowerCase() === adminEmail.toLowerCase();

    state.user = {
      uid: user.uid,
      username: user.displayName || (user.email || "user").split("@")[0],
      email: user.email || "",
      identity: "",
      photoURL: user.photoURL || "",
      emailVerified: !!user.emailVerified,
      isAdmin
    };
    saveState();

    if (isAdmin) {
      openApp();
      showAdminQuickAccess(true);
      if (!silent) toast("Admin login successful. Admin Dashboard is available from the 🛡️ button.", "success");
    } else {
      openApp();
      showAdminQuickAccess(false);
      if (!silent) toast("Login successful.", "success");
    }
  }

  function showAdminQuickAccess(show) {
    const btn = $("#adminQuickBtn");
    if (!btn) return;
    btn.classList.toggle("hidden", !show);
  }

  function openAdmin() {
    if (!state.user?.isAdmin) {
      return toast("Admin access denied.");
    }
    showOnlyScreen("adminScreen");
    setupAdminDashboard();
    updateAdminStats();
  }

  function updateAdminStats() {
    const users = $("#statUsers");
    const coins = $("#statCoins");
    const reports = $("#statReports");
    const live = $("#statLive");
    if (users) users.textContent = "1+";
    if (coins) coins.textContent = Number(state.coins || 0).toLocaleString();
    if (reports) reports.textContent = "—";
    if (live) live.textContent = randomChatPeer ? "1" : "0";
  }

  let adminDashboardReady = false;

  function setupAdminDashboard() {
    if (adminDashboardReady) return;
    adminDashboardReady = true;

    $("#adminQuickBtn")?.addEventListener("click", openAdmin);
    $("#adminBackBtn")?.addEventListener("click", () => {
      showOnlyScreen("appScreen");
      showAdminQuickAccess(true);
      navigateToPage("homePage", false);
    });
    $("#adminDetailClose")?.addEventListener("click", () => {
      $("#adminDetailPanel")?.classList.add("hidden");
    });

    document.addEventListener("click", e => {
      const card = e.target.closest("[data-admin-page]");
      if (!card) return;
      if (!state.user?.isAdmin) return toast("Admin access denied.");
      openAdminTool(card.dataset.adminPage || "users");
    });

    $("#searchUserBtn")?.addEventListener("click", searchAdminUser);
    $("#userSearch")?.addEventListener("keydown", e => {
      if (e.key === "Enter") searchAdminUser();
    });
  }

  function searchAdminUser() {
    const list = $("#adminUserList");
    if (!list) return;
    const q = ($("#userSearch")?.value || "").trim().toLowerCase();
    const u = state.user || {};
    const matches = !q || [u.username, u.email, u.uid].some(v => String(v || "").toLowerCase().includes(q));
    if (!matches) {
      list.innerHTML = '<div class="admin-tool-note">No user found in the currently connected admin session. A Firestore/backend user index is required for global user search.</div>';
      return;
    }
    list.innerHTML = `
      <div class="admin-user-card">
        <div><strong>${escapeHTML(u.username || "User")}</strong><small>${escapeHTML(u.email || "")} · UID: ${escapeHTML(u.uid || "—")}</small></div>
        <div class="admin-user-actions"><button type="button" data-admin-page="coins">Coins</button><button type="button" data-admin-page="users">Manage</button></div>
      </div>`;
  }

  function openAdminTool(page) {
    const panel = $("#adminDetailPanel");
    const title = $("#adminDetailTitle");
    const body = $("#adminDetailBody");
    if (!panel || !title || !body) return;
    const names = {
      users:"Users", coins:"Coins & Wallets", media:"Private Media", chats:"Chats", reports:"Reports", moderation:"Moderation", payments:"Payments", live:"Live Management", verification:"Verification", support:"Support", audit:"Audit Logs", security:"Security", settings:"Settings"
    };
    title.textContent = names[page] || "Admin Tool";

    const current = state.user || {};
    if (page === "coins") {
      body.innerHTML = `
        <div class="admin-tool-note">Current user wallet: <strong>${Number(state.coins || 0).toLocaleString()} Coins</strong>. Global coin changes must be performed by the secured backend/Firestore rules, not trusted frontend code.</div>
        <div class="admin-tool-grid"><button class="admin-tool-btn success" type="button" data-admin-coin="add">+ Add 100</button><button class="admin-tool-btn danger" type="button" data-admin-coin="remove">− Remove 100</button><button class="admin-tool-btn" type="button" data-admin-coin="freeze">Freeze Wallet</button><button class="admin-tool-btn" type="button" data-admin-coin="history">View History</button></div>`;
      body.querySelectorAll("[data-admin-coin]").forEach(btn => btn.addEventListener("click", () => {
        const action = btn.dataset.adminCoin;
        if (action === "add") { state.coins = Number(state.coins || 0) + 100; addCoinTransaction(100, "admin", "Admin coin adjustment"); updateUserUI(); updateAdminStats(); toast("+100 Coins applied to the current local account.", "success"); }
        else if (action === "remove") { state.coins = Math.max(0, Number(state.coins || 0) - 100); addCoinTransaction(-100, "admin", "Admin coin adjustment"); updateUserUI(); updateAdminStats(); toast("100 Coins removed from the current local account.", "success"); }
        else toast("This control needs the secure backend/Firestore admin API.");
      }));
    } else if (page === "users") {
      body.innerHTML = `<div class="admin-tool-note"><strong>Current admin:</strong> ${escapeHTML(current.email || "")}<br><br>User management should include account status, plan, verification, coin balance, reports, moderation actions and session controls. Global user records require a server-side user index.</div><div class="admin-tool-grid"><button class="admin-tool-btn" type="button">View Profile</button><button class="admin-tool-btn danger" type="button">Suspend User</button><button class="admin-tool-btn" type="button">Reset Password</button><button class="admin-tool-btn" type="button">Logout Devices</button></div>`;
      body.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => toast("Secure backend action required.")));
    } else if (page === "media") {
      body.innerHTML = '<div class="admin-tool-note">Private photos/media are intentionally not exposed by the frontend. The production version should show only media attached to a valid report/moderation case, with reason, admin identity and audit log. Firebase Storage + server-side authorization is required.</div>';
    } else if (page === "chats") {
      body.innerHTML = '<div class="admin-tool-note">Chat moderation can show reported conversations and safety metadata. The current Random Chat uses peer-to-peer WebRTC, so there is no server-side message/video archive for an admin to read. To support admin chat review, messaging must be persisted through an authorized backend.</div>';
    } else {
      body.innerHTML = `<div class="admin-tool-note"><strong>${escapeHTML(names[page] || "Admin Tool")}</strong><br><br>This control center is ready for the secured backend data source. Actions that affect other users should be authenticated with Firebase ID tokens, authorized server-side and written to an audit log.</div>`;
    }
    panel.classList.remove("hidden");
    panel.scrollIntoView({behavior:"smooth", block:"start"});
  }

  async function logout() {
    try {
      if (window.firebase?.auth) await firebase.auth().signOut();
    } catch (err) { console.error(err); }
    state.user = null;
    saveState();
    showAdminQuickAccess(false);
    showOnlyScreen("authScreen");
    $("#loginForm")?.classList.remove("hidden");
    $("#signupForm")?.classList.add("hidden");
    toast("Logged out.");
  }

  // Legacy demo-auth functions intentionally disabled.
  function readDemoAccount() { return null; }
  function handleSignup() { return handleFirebaseSignup(); }
  function verifyOtp() { toast("Email verification is now handled by Firebase."); }
  function resendOtp() { toast("Email verification is now handled by Firebase."); }


  function openApp() {

    showOnlyScreen(
      "appScreen"
    );


    updateUserUI();


    navigateToPage(
      "homePage",
      false
    );

  }


  /* =========================================================
     NAVIGATION
     ========================================================= */

  function setupNavigation() {

    document.addEventListener(
      "click",
      e => {

        const trigger =
          e.target.closest(
            "[data-page]"
          );


        if (!trigger) return;


        const page =
          trigger.getAttribute(
            "data-page"
          );


        if (!page) return;


        e.preventDefault();


        navigateToPage(
          page
        );

      }
    );

  }


  function navigateToPage(
    pageId,
    scroll = true
  ) {

    const id =
      String(pageId || "")
        .replace(/^#/, "");


    const target =
      document.getElementById(id);


    if (
      !target ||
      !target.classList.contains(
        "page"
      )
    ) {

      console.warn(
        "SUN SPY: page not found:",
        id
      );

      return false;

    }


    $$(".page")
      .forEach(page => {

        page.classList.remove(
          "active"
        );

        page.classList.add(
          "hidden"
        );

        page.setAttribute(
          "aria-hidden",
          "true"
        );

      });


    target.classList.remove(
      "hidden"
    );


    target.classList.add(
      "active"
    );


    target.setAttribute(
      "aria-hidden",
      "false"
    );


    $$("[data-page]")
      .forEach(btn => {

        btn.classList.toggle(
          "active",
          btn.getAttribute(
            "data-page"
          ) === id
        );

      });


    if (scroll) {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }


    /* Gift page refresh */

    if (
      id ===
      "giftRecipientPage"
    ) {

      updateSelectedGiftUI();

      updateGiftAmountUI();

      updateSelectedRecipientsUI();

      updateGiftConfirmButton();

      renderGiftRecipientList(
        $("#giftRecipientSearch")
          ?.value || ""
      );

    }


    /* Transactions refresh */

    if (
      id ===
      "transactionsPage"
    ) {

      renderTransactions();

    }


    return true;

  }


  /* =========================================================
     GLOBAL BUTTONS
     ========================================================= */

  function setupGlobalButtons() {


    /* ---------------- FEED ---------------- */

    $("#feedRefreshBtn")
      ?.addEventListener(
        "click",
        () => {

          toast(
            "Feed refreshed."
          );

        }
      );


    $$(".feed-tab")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            $$(".feed-tab")
              .forEach(
                b =>
                  b.classList.remove(
                    "active"
                  )
              );


            btn.classList.add(
              "active"
            );


            state.selectedFeed =
              btn.dataset.feed ||
              "recommended";


            toast(
              `${capitalize(
                state.selectedFeed
              )} feed selected.`
            );

          }
        );

      });


    /* ---------------- PROFILE TABS ---------------- */

    $$(".profile-tabs button")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            $$(".profile-tabs button")
              .forEach(
                b =>
                  b.classList.remove(
                    "active"
                  )
              );


            btn.classList.add(
              "active"
            );


            toast(
              `${capitalize(
                btn.dataset.profileTab ||
                "posts"
              )} selected.`
            );

          }
        );

      });


    /* ---------------- LIVE TABS ---------------- */

    $$(".live-tabs button")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            $$(".live-tabs button")
              .forEach(
                b =>
                  b.classList.remove(
                    "active"
                  )
              );


            btn.classList.add(
              "active"
            );


            toast(
              `${capitalize(
                btn.dataset.liveFilter ||
                "recommended"
              )} live rooms.`
            );

          }
        );

      });


    /* =====================================================
       PLANS
       ===================================================== */

    $$(".plan-select")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            const plan =
              btn.dataset.plan ||
              "Free";


            if (
              plan === "Free"
            ) {

              return toast(
                "Free is your current plan."
              );

            }


            state.plan =
              plan;


            saveState();

            updateUserUI();


            toast(
              `${plan} plan selected. Backend payment is required in production.`
            );

          }
        );

      });


    /* =====================================================
       COIN SHOP
       ===================================================== */

    $$(".coin-package")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            const amount =
              Number(
                btn.dataset.coins ||
                0
              );


            if (!amount) {

              return toast(
                "Invalid coin package."
              );

            }


            /*
             * DEMO:
             * Coins are added immediately.
             *
             * Production:
             * Payment must be verified
             * server-side.
             */

            state.coins =
              Number(
                state.coins || 0
              ) + amount;


            addCoinTransaction(

              amount,

              "purchase",

              `Purchased ${amount.toLocaleString()} Coins`

            );


            updateUserUI();


            toast(
              `🪙 ${amount.toLocaleString()} Coins added.`
            );

          }
        );

      });


    /* =====================================================
       GIFT SHOP
       ===================================================== */

    $$(".gift-item")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            const gift =
              btn.dataset.gift ||
              "gift";


            const price =
              Number(

                btn.dataset.price ||

                btn.dataset.coins ||

                btn.getAttribute(
                  "data-cost"
                ) ||

                0

              );


            if (
              price <= 0
            ) {

              return toast(
                "Invalid gift price."
              );

            }


            /*
             * Save selected gift
             */

            state.selectedGift = {

              name: gift,

              price: price,

              icon:
                btn.dataset.icon ||
                btn.textContent
                  .trim()
                  .split(/\s+/)[0] ||
                "🎁"

            };


            /*
             * Reset amount
             */

            state.giftAmount =
              1;


            /*
             * Reset accounts
             */

            state.selectedRecipients =
              [];


            /*
             * Update UI
             */

            updateSelectedGiftUI();

            updateGiftAmountUI();

            updateSelectedRecipientsUI();

            updateGiftConfirmButton();


            toast(
              `${capitalize(gift)} selected — choose account(s).`
            );


            /*
             * Open recipient page
             */

            navigateToPage(
              "giftRecipientPage"
            );

          }
        );

      });


    /* =====================================================
       GIFT AMOUNT — MINUS
       ===================================================== */

    $("#giftAmountMinus")
      ?.addEventListener(
        "click",
        () => {

          const current =
            Number(
              state.giftAmount || 1
            );


          if (
            current <= 1
          ) {

            return;

          }


          state.giftAmount =
            current - 1;


          updateGiftAmountUI();

          updateGiftConfirmButton();

        }
      );


    /* =====================================================
       GIFT AMOUNT — PLUS
       ===================================================== */

    $("#giftAmountPlus")
      ?.addEventListener(
        "click",
        () => {

          const current =
            Number(
              state.giftAmount || 1
            );


          /*
           * Maximum 100 gifts
           * per recipient in demo.
           */

          if (
            current >= 100
          ) {

            return toast(
              "Maximum gift amount is 100."
            );

          }


          state.giftAmount =
            current + 1;


          updateGiftAmountUI();

          updateGiftConfirmButton();

        }
      );


    /* =====================================================
       RECIPIENT SEARCH
       ===================================================== */

    $("#giftRecipientSearch")
      ?.addEventListener(
        "input",
        e => {

          renderGiftRecipientList(
            e.target.value
          );

        }
      );


    /* =====================================================
       CONFIRM GIFT
       ===================================================== */

    $("#confirmGiftBtn")
      ?.addEventListener(
        "click",
        sendSelectedGifts
      );


    /* =====================================================
       CUSTOMIZATION
       ===================================================== */

    $$(".custom-item")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            const premium =
              btn.classList.contains(
                "premium-item"
              ) ||

              [
                "premium",
                "vip"
              ].includes(
                btn.dataset.frame
              );


            if (
              premium &&
              state.plan === "Free"
            ) {

              return toast(
                "This customization requires an eligible plan."
              );

            }


            toast(
              "Customization selected."
            );

          }
        );

      });


    /* =====================================================
       DISCOVER SEARCH
       ===================================================== */

    $("#discoverSearchBtn")
      ?.addEventListener(
        "click",
        () => {

          const q =
            $("#discoverSearch")
              ?.value
              .trim();


          toast(
            q

              ? `Searching for "${q}"...`

              : "Enter something to search."

          );

        }
      );


    /* =====================================================
       VERIFICATION
       ===================================================== */

    $("#startVerificationBtn")
      ?.addEventListener(
        "click",
        () => {

          toast(
            "Verification request started. Secure backend verification is required."
          );

        }
      );


    /* =====================================================
       FOLLOW
       ===================================================== */

    $("#followProfileBtn")
      ?.addEventListener(
        "click",
        e => {

          e.currentTarget.textContent =
            "✓ Following";


          toast(
            "Follow status changed."
          );

        }
      );


    /* =====================================================
       MESSAGE
       ===================================================== */

    $("#messageProfileBtn")
      ?.addEventListener(
        "click",
        () => {

          navigateToPage(
            "messagesPage"
          );

        }
      );


    /* =====================================================
       OTHER SYSTEMS
       ===================================================== */

    setupCreatePost();

    setupProfile();

    setupRandomChat();

    setupMediaInputs();


    /* =====================================================
       TRANSACTIONS
       ===================================================== */

    renderTransactions();

  }


  /* =========================================================
     SELECTED GIFT UI
     ========================================================= */

  function updateSelectedGiftUI() {

    const gift =
      state.selectedGift;


    const nameEl =
      $("#selectedGiftName");


    const priceEl =
      $("#selectedGiftPrice");


    const iconEl =
      $("#selectedGiftCard .selected-gift-icon");


    if (!gift) {

      if (nameEl) {

        nameEl.textContent =
          "No gift selected";

      }


      if (priceEl) {

        priceEl.textContent =
          "0";

      }


      if (iconEl) {

        iconEl.textContent =
          "🎁";

      }


      return;

    }


    if (nameEl) {

      nameEl.textContent =
        capitalize(
          gift.name
        );

    }


    if (priceEl) {

      priceEl.textContent =
        Number(
          gift.price || 0
        ).toLocaleString();

    }


    if (iconEl) {

      iconEl.textContent =
        gift.icon || "🎁";

    }

  }


  /* =========================================================
     GIFT AMOUNT UI
     ========================================================= */

  function updateGiftAmountUI() {

    let amount =
      Number(
        state.giftAmount || 1
      );


    if (
      amount < 1
    ) {

      amount = 1;

    }


    if (
      amount > 100
    ) {

      amount = 100;

    }


    state.giftAmount =
      amount;


    const value =
      $("#giftAmountValue");


    if (value) {

      value.textContent =
        amount.toLocaleString();

    }


    updateGiftTotalUI();

  }


  /* =========================================================
     GIFT TOTAL COST
     ========================================================= */

  function getGiftTotalCost() {

    const gift =
      state.selectedGift;


    const recipients =
      Array.isArray(
        state.selectedRecipients
      )

        ? state.selectedRecipients

        : [];


    const price =
      Number(
        gift?.price || 0
      );


    const amount =
      Math.max(
        1,
        Number(
          state.giftAmount || 1
        )
      );


    const recipientCount =
      recipients.length;


    return (
      price *
      amount *
      recipientCount
    );

  }


  function updateGiftTotalUI() {

    const total =
      getGiftTotalCost();


    const totalEl =
      $("#giftTotalPrice");


    if (totalEl) {

      totalEl.textContent =
        `${total.toLocaleString()} 🪙`;

    }

  }


  /* =========================================================
     DEMO RECIPIENT ACCOUNTS
     ========================================================= */

  function getGiftRecipients() {

    return [

      {
        id:
          "demo_user_01",

        username:
          "sunspy_user",

        name:
          "SUN SPY User",

        avatar:
          "👤"

      },

      {
        id:
          "demo_user_02",

        username:
          "moon_user",

        name:
          "Moon User",

        avatar:
          "🌙"

      },

      {
        id:
          "demo_user_03",

        username:
          "star_user",

        name:
          "Star User",

        avatar:
          "⭐"

      },

      {
        id:
          "demo_user_04",

        username:
          "dragon_user",

        name:
          "Dragon User",

        avatar:
          "🐉"

      },

      {
        id:
          "demo_user_05",

        username:
          "sky_user",

        name:
          "Sky User",

        avatar:
          "🌌"

      }

    ];

  }


  /* =========================================================
     RENDER RECIPIENT LIST
     ========================================================= */

  function renderGiftRecipientList(
    searchText = ""
  ) {

    const list =
      $("#giftRecipientList");


    if (!list) return;


    const recipients =
      getGiftRecipients();


    const query =
      String(
        searchText || ""
      )
        .trim()
        .toLowerCase();


    const filtered =
      recipients.filter(
        user =>

          user.name
            .toLowerCase()
            .includes(query)

          ||

          user.username
            .toLowerCase()
            .includes(query)

      );


    if (
      !filtered.length
    ) {

      list.innerHTML = `

        <div class="empty-state">

          No users found.

        </div>

      `;

      return;

    }


    if (
      !Array.isArray(
        state.selectedRecipients
      )
    ) {

      state.selectedRecipients =
        [];

    }


    list.innerHTML =

      filtered
        .map(user => {

          const selected =
            state.selectedRecipients
              .some(
                r =>
                  r.id === user.id
              );


          return `

            <button

              type="button"

              class="gift-recipient-item ${
                selected
                  ? "selected"
                  : ""
              }"

              data-recipient-id="${escapeHTML(
                user.id
              )}"

            >

              <span
                class="gift-recipient-avatar"
              >
                ${escapeHTML(
                  user.avatar
                )}
              </span>


              <span
                class="gift-recipient-info"
              >

                <strong>
                  ${escapeHTML(
                    user.name
                  )}
                </strong>

                <small>
                  @${escapeHTML(
                    user.username
                  )}
                </small>

              </span>


              <span
                class="gift-recipient-select"
              >

                ${
                  selected
                    ? "✓ Selected"
                    : "Select"
                }

              </span>

            </button>

          `;

        })
        .join("");


    /* =====================================================
       ACCOUNT SELECT
       ===================================================== */

    $$(".gift-recipient-item", list)
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            const recipientId =
              btn.dataset
                .recipientId;


            const recipient =
              recipients.find(
                user =>
                  user.id ===
                  recipientId
              );


            if (!recipient) {

              return toast(
                "Account not found."
              );

            }


            if (
              !Array.isArray(
                state.selectedRecipients
              )
            ) {

              state.selectedRecipients =
                [];

            }


            const existingIndex =
              state.selectedRecipients
                .findIndex(
                  r =>
                    r.id ===
                    recipient.id
                );


            /* -------------------------
               REMOVE ACCOUNT
               ------------------------- */

            if (
              existingIndex !== -1
            ) {

              state.selectedRecipients
                .splice(
                  existingIndex,
                  1
                );

            }


            /* -------------------------
               ADD ACCOUNT
               ------------------------- */

            else {

              state.selectedRecipients
                .push({

                  id:
                    recipient.id,

                  username:
                    recipient.username,

                  name:
                    recipient.name,

                  avatar:
                    recipient.avatar

                });

            }


            updateSelectedRecipientsUI();

            updateGiftTotalUI();

            updateGiftConfirmButton();


            /*
             * Re-render so selected
             * accounts show ✓
             */

            renderGiftRecipientList(
              $("#giftRecipientSearch")
                ?.value || ""
            );

          }
        );

      });

  }


  /* =========================================================
     SELECTED RECIPIENT UI
     ========================================================= */

  function updateSelectedRecipientsUI() {

    const card =
      $("#selectedRecipientCard");


    if (!card) return;


    const recipients =
      Array.isArray(
        state.selectedRecipients
      )

        ? state.selectedRecipients

        : [];


    if (
      recipients.length === 0
    ) {

      card.hidden =
        true;

      return;

    }


    card.hidden =
      false;


    const first =
      recipients[0];


    const avatar =
      $("#selectedRecipientAvatar");


    const name =
      $("#selectedRecipientName");


    const username =
      $("#selectedRecipientUsername");


    if (avatar) {

      avatar.textContent =
        first.avatar ||
        "👤";

    }


    if (name) {

      name.textContent =

        recipients.length === 1

          ? first.name

          : `${recipients.length} Accounts Selected`;

    }


    if (username) {

      username.textContent =

        recipients.length === 1

          ? `@${first.username}`

          : recipients
              .map(
                r =>
                  `@${r.username}`
              )
              .join(", ");

    }


    const badge =
      card.querySelector(
        ".recipient-selected-badge"
      );


    if (badge) {

      badge.textContent =
        `✓ ${recipients.length} Selected`;

    }


    updateGiftTotalUI();

  }


  /* =========================================================
     CONFIRM BUTTON
     ========================================================= */

  function updateGiftConfirmButton() {

    const btn =
      $("#confirmGiftBtn");


    if (!btn) return;


    const gift =
      state.selectedGift;


    const recipients =
      Array.isArray(
        state.selectedRecipients
      )

        ? state.selectedRecipients

        : [];


    const amount =
      Math.max(
        1,
        Number(
          state.giftAmount || 1
        )
      );


    /* -------------------------
       NO GIFT
       ------------------------- */

    if (!gift) {

      btn.disabled =
        true;


      btn.textContent =
        "🎁 Select a Gift";


      updateGiftTotalUI();

      return;

    }


    /* -------------------------
       NO ACCOUNT
       ------------------------- */

    if (
      recipients.length === 0
    ) {

      btn.disabled =
        true;


      btn.textContent =
        "👤 Select Account(s)";


      updateGiftTotalUI();

      return;

    }


    const price =
      Number(
        gift.price || 0
      );


    const total =
      price *
      amount *
      recipients.length;


    btn.disabled =
      total <= 0;


    btn.textContent =
      `🎁 Send ${amount} ` +
      `${capitalize(gift.name)}` +
      `${amount > 1 ? "s" : ""} ` +
      `to ${recipients.length} ` +
      `Account${
        recipients.length > 1
          ? "s"
          : ""
      } — ` +
      `${total.toLocaleString()} 🪙`;


    updateGiftTotalUI();

  }


  /* =========================================================
     SEND SELECTED GIFTS
     ========================================================= */

  function sendSelectedGifts() {

    const gift =
      state.selectedGift;


    const recipients =
      Array.isArray(
        state.selectedRecipients
      )

        ? state.selectedRecipients

        : [];


    const amount =
      Math.max(
        1,
        Number(
          state.giftAmount || 1
        )
      );


    /* =====================================================
       GIFT REQUIRED
       ===================================================== */

    if (!gift) {

      return toast(
        "Please select a gift first."
      );

    }


    /* =====================================================
       ACCOUNT REQUIRED
       ===================================================== */

    if (
      recipients.length === 0
    ) {

      return toast(
        "Please select at least one account."
      );

    }


    /* =====================================================
       PRICE
       ===================================================== */

    const price =
      Number(
        gift.price || 0
      );


    if (
      price <= 0
    ) {

      return toast(
        "Invalid gift price."
      );

    }


    /* =====================================================
       TOTAL
       ===================================================== */

    const total =
      price *
      amount *
      recipients.length;


    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {

      return toast(
        "Invalid total gift cost."
      );

    }


    /* =====================================================
       BALANCE
       ===================================================== */

    const balance =
      Number(
        state.coins || 0
      );


    if (
      balance < total
    ) {

      return toast(

        `Not enough Coins. ` +

        `You need ${total.toLocaleString()} Coins.`

      );

    }


    /* =====================================================
       RECIPIENT NAMES
       ===================================================== */

    const recipientNames =
      recipients
        .map(
          r =>
            `@${r.username}`
        )
        .join(", ");


    /* =====================================================
       CONFIRM
       ===================================================== */

    const confirmed =
      window.confirm(

        `Send ${amount} ` +

        `${capitalize(
          gift.name
        )}${amount > 1 ? "s" : ""} ` +

        `to ${recipients.length} account` +

        `${
          recipients.length > 1
            ? "s"
            : ""
        }?\n\n` +

        `${recipientNames}\n\n` +

        `Price per gift: ` +

        `${price.toLocaleString()} Coins\n` +

        `Gift amount per account: ` +

        `${amount}\n\n` +

        `Total: ` +

        `${total.toLocaleString()} Coins`

      );


    if (!confirmed) {

      return;

    }


    /* =====================================================
       DEDUCT COINS
       ===================================================== */

    state.coins =
      balance - total;


    /* =====================================================
       TRANSACTION
       ===================================================== */

    addCoinTransaction(

      -total,

      "gift",

      `Sent ${amount} ${capitalize(
        gift.name
      )}${amount > 1 ? "s" : ""} to ${
        recipients.length
      } account${
        recipients.length > 1
          ? "s"
          : ""
      }`

    );


    /* =====================================================
       UPDATE WALLET
       ===================================================== */

    updateUserUI();


    /* =====================================================
       SUCCESS
       ===================================================== */

    toast(

      `🎁 ${amount} ${capitalize(
        gift.name
      )}${amount > 1 ? "s" : ""} sent to ` +

      `${recipients.length} account` +

      `${
        recipients.length > 1
          ? "s"
          : ""
      }`

    );


    /* =====================================================
       RESET
       ===================================================== */

    state.selectedGift =
      null;


    state.selectedRecipients =
      [];


    state.giftAmount =
      1;


    updateSelectedGiftUI();

    updateGiftAmountUI();

    updateSelectedRecipientsUI();

    updateGiftConfirmButton();


    /* Clear search */

    const search =
      $("#giftRecipientSearch");


    if (search) {

      search.value =
        "";

    }


    /* =====================================================
       LEAVE PAGE
       ===================================================== */

    navigateToPage(
      "coinsPage"
    );

  }


  /* =========================================================
     CREATE POST
     ========================================================= */

  function setupCreatePost() {

    $("#createPostForm")
      ?.addEventListener(
        "submit",
        e => {

          e.preventDefault();


          const content =
            $("#postContent")
              ?.value
              .trim();


          if (!content) {

            return toast(
              "Write something before publishing."
            );

          }


          const list =
            $("#feedList");


          if (list) {

            const article =
              document.createElement(
                "article"
              );


            article.className =
              "post-card";


            article.innerHTML = `

              <header class="post-header">

                <div class="post-user">

                  <div class="post-avatar">
                    👤
                  </div>

                  <div>

                    <strong>
                      ${escapeHTML(
                        state.user
                          ?.username ||
                        "You"
                      )}
                    </strong>

                    <small>
                      Just now
                    </small>

                  </div>

                </div>

              </header>


              <div class="post-body">

                <p>
                  ${escapeHTML(
                    content
                  )}
                </p>

              </div>


              <footer class="post-actions">

                <button type="button">
                  ❤️ <span>0</span>
                </button>

                <button type="button">
                  💬 <span>0</span>
                </button>

                <button type="button">
                  ↗ Share
                </button>

                <button type="button">
                  🔖
                </button>

              </footer>

            `;


            list.prepend(
              article
            );

          }


          if (
            $("#postContent")
          ) {

            $("#postContent")
              .value = "";

          }


          if (
            $("#postHashtags")
          ) {

            $("#postHashtags")
              .value = "";

          }


          if (
            $("#postMention")
          ) {

            $("#postMention")
              .value = "";

          }


          navigateToPage(
            "homePage"
          );


          toast(
            "Post published locally."
          );

        }
      );

  }


  /* =========================================================
     PROFILE
     ========================================================= */

  function setupProfile() {

    const form =
      $("#editProfileForm");


    const photoInput =
      $("#profilePhotoInput");


    const editAvatar =
      $("#editProfileAvatar");


    editAvatar
      ?.addEventListener(
        "click",
        () => {

          photoInput?.click();

        }
      );


    photoInput
      ?.addEventListener(
        "change",
        e => {

          const file =
            e.target.files?.[0];


          if (!file) return;


          if (
            !file.type.startsWith(
              "image/"
            )
          ) {

            return toast(
              "Please select an image."
            );

          }


          if (
            file.size >
            5 * 1024 * 1024
          ) {

            return toast(
              "Image must be smaller than 5MB."
            );

          }


          const reader =
            new FileReader();


          reader.onload =
            event => {

              const imageData =
                event.target.result;


              if (!state.user) {

                state.user =
                  {};

              }


              state.user.avatar =
                imageData;


              applyProfileAvatar(
                imageData
              );


              saveState();


              toast(
                "Profile photo updated."
              );

            };


          reader.readAsDataURL(
            file
          );

        }
      );


    form
      ?.addEventListener(
        "submit",
        e => {

          e.preventDefault();


          if (!state.user) {

            state.user =
              {};

          }


          const username =
            $("#editUsername")
              ?.value
              .trim();


          const displayName =
            $("#editDisplayName")
              ?.value
              .trim();


          const bio =
            $("#editBio")
              ?.value
              .trim();


          const identity =
            $("#editIdentity")
              ?.value || "";


          const country =
            $("#editCountry")
              ?.value || "";


          const language =
            $("#editLanguage")
              ?.value || "en";


          state.user.username =
            username ||
            state.user.username ||
            "User";


          state.user.displayName =
            displayName ||
            state.user.displayName ||
            state.user.username;


          state.user.bio =
            bio || "";


          state.user.identity =
            identity;


          state.user.country =
            country;


          state.user.language =
            language;


          saveState();


          updateUserUI();


          applyProfileAvatar(
            state.user.avatar
          );


          navigateToPage(
            "profilePage"
          );


          toast(
            "Profile saved successfully."
          );

        }
      );


    applyProfileAvatar(
      state.user?.avatar
    );

  }


  /* =========================================================
     PROFILE AVATAR
     ========================================================= */

  function applyProfileAvatar(
    imageData
  ) {

    const avatarIds = [

      "homeAvatar",

      "feedComposerAvatar",

      "editProfileAvatar",

      "profileAvatar"

    ];


    avatarIds.forEach(
      id => {

        const el =
          document.getElementById(
            id
          );


        if (!el) return;


        if (imageData) {

          el.style.backgroundImage =
            `url("${imageData}")`;


          el.style.backgroundSize =
            "cover";


          el.style.backgroundPosition =
            "center";


          el.style.backgroundRepeat =
            "no-repeat";


          el.textContent =
            "";


          el.classList.add(
            "has-profile-photo"
          );

        }

        else {

          el.style.backgroundImage =
            "";


          el.style.backgroundSize =
            "";


          el.style.backgroundPosition =
            "";


          el.style.backgroundRepeat =
            "";


          el.textContent =
            "👤";


          el.classList.remove(
            "has-profile-photo"
          );

        }

      }
    );

  }


  /* =========================================================
     UPDATE USER UI
     ========================================================= */

  function updateUserUI() {

    const u =
      state.user || {};


    const username =
      u.displayName ||
      u.username ||
      "SUN SPY";


    const email =
      u.email || "";


    [
      "welcomeUsername",
      "profileUsername"
    ].forEach(
      id => {

        const el =
          document.getElementById(
            id
          );


        if (el) {

          el.textContent =
            username;

        }

      }
    );


    if (
      $("#profileEmail")
    ) {

      $("#profileEmail")
        .textContent =
        email;

    }


    if (
      $("#profileBio")
    ) {

      $("#profileBio")
        .textContent =
        u.bio ||
        "Add a bio to tell people about yourself.";

    }


    if (
      $("#profilePlan")
    ) {

      $("#profilePlan")
        .textContent =
        `${state.plan || "Free"} Plan`;

    }


    if (
      $("#profileCoins")
    ) {

      $("#profileCoins")
        .textContent =
        `${Number(
          state.coins || 0
        ).toLocaleString()} Coins`;

    }


    if (
      $("#walletCoins")
    ) {

      $("#walletCoins")
        .textContent =
        `🪙 ${Number(
          state.coins || 0
        ).toLocaleString()}`;

    }


    if (
      $("#coinDisplay")
    ) {

      $("#coinDisplay")
        .innerHTML =
        `🪙 ${Number(
          state.coins || 0
        ).toLocaleString()}`;

    }


    const usernameInput =
      $("#editUsername");


    const displayInput =
      $("#editDisplayName");


    if (
      usernameInput
    ) {

      usernameInput.value =
        u.username || "";

    }


    if (
      displayInput
    ) {

      displayInput.value =
        u.displayName ||
        u.username ||
        "";

    }


    if (
      $("#editBio")
    ) {

      $("#editBio")
        .value =
        u.bio || "";

    }


    if (
      $("#editIdentity")
    ) {

      $("#editIdentity")
        .value =
        u.identity || "";

    }


    if (
      $("#editCountry")
    ) {

      $("#editCountry")
        .value =
        u.country || "";

    }


    if (
      $("#editLanguage")
    ) {

      $("#editLanguage")
        .value =
        u.language || "en";

    }


    applyProfileAvatar(
      u.avatar
    );

  }

/* =========================================================
   RANDOM CHAT — WEBRTC CLIENT
   Frontend client for a WebSocket signaling server.

   Configure the signaling server by setting:
   window.SUNSPY_CONFIG = { signalingUrl: "wss://YOUR-SERVER/ws" };
   before this script loads, or set localStorage key:
   SUN_SPY_SIGNALING_URL
   ========================================================= */

let randomChatControlsTimer = null;
let randomChatSocket = null;
let randomChatPeer = null;
let randomChatRemoteId = null;
let randomChatIsInitiator = false;
let randomChatManualClose = false;
let randomChatReconnectTimer = null;

const SUNSPY_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" }
];

function getSignalingUrl() {
  const configured =
    window.SUNSPY_CONFIG?.signalingUrl ||
    localStorage.getItem("SUN_SPY_SIGNALING_URL") ||
    "";
  return String(configured).trim();
}

function setRandomChatStatus(message) {
  const el = $("#callStatus");
  if (el) el.textContent = message;
}

function setupRandomChat() {
  const startBtn = $("#startMatchBtn");
  const cancelBtn = $("#cancelMatchBtn");
  const endBtn = $("#endMatchBtn");
  const nextBtn = $("#nextMatchBtn");
  const micBtn = $("#toggleMicBtn");
  const cameraBtn = $("#toggleCameraBtn");
  const layoutBtn = $("#chatLayoutBtn");
  const fullScreenBtn = $("#fullScreenBtn");
  const reportBtn = $("#reportMatchBtn");
  const room = $("#videoChatRoom");

  room?.classList.add("hidden");
  room?.classList.remove("split-layout", "messenger-layout");
  setRandomChatStatus("Ready");

  startBtn?.addEventListener("click", startRandomMatch);
  cancelBtn?.addEventListener("click", cancelMatch);
  endBtn?.addEventListener("click", endMatch);

  nextBtn?.addEventListener("click", () => {
    endMatch(false);
    setTimeout(() => startRandomMatch(), 120);
  });

  micBtn?.addEventListener("click", e => {
    const track = state.stream?.getAudioTracks()?.[0];
    if (!track) return toast("Microphone is not available.");
    track.enabled = !track.enabled;
    e.currentTarget.textContent = track.enabled ? "🎙️" : "🔇";
    showRandomChatControls();
  });

  cameraBtn?.addEventListener("click", e => {
    const track = state.stream?.getVideoTracks()?.[0];
    if (!track) return toast("Camera is not available.");
    track.enabled = !track.enabled;
    e.currentTarget.textContent = track.enabled ? "📷" : "🚫";
    showRandomChatControls();
  });

  layoutBtn?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggleRandomChatLayout();
    showRandomChatControls();
  });

  fullScreenBtn?.addEventListener("click", async e => {
    e.preventDefault();
    showRandomChatControls();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (room?.requestFullscreen) {
        await room.requestFullscreen();
      } else {
        toast("Full screen is not supported here.");
      }
    } catch (error) {
      console.warn("Fullscreen error:", error);
      toast("Full screen permission was not granted.");
    }
  });

  reportBtn?.addEventListener("click", () => {
    sendSignal({
      type: "report",
      peerId: randomChatRemoteId || null,
      reason: "user_report"
    });
    toast("Report submitted.");
    showRandomChatControls();
  });

  room?.addEventListener("click", e => {
    if (!e.target.closest(".video-controls")) showRandomChatControls();
  });

  room?.addEventListener("touchstart", e => {
    if (!e.target.closest(".video-controls")) showRandomChatControls();
  }, { passive: true });

  setRandomChatLayout("split");
}

async function startRandomMatch() {
  const startBtn = $("#startMatchBtn");
  const matchingBox = $("#matchingBox");
  const room = $("#videoChatRoom");

  clearTimeout(state.matchingTimer);
  randomChatManualClose = false;
  randomChatRemoteId = null;
  randomChatIsInitiator = false;

  room?.classList.add("hidden");
  matchingBox?.classList.remove("hidden");
  setRandomChatStatus("Finding someone...");
  if (startBtn) startBtn.disabled = true;

  try {
    await startLocalCamera();
    await connectSignaling();
    sendSignal({ type: "match:join" });
    toast("Looking for someone...");
  } catch (error) {
    console.error("Match start error:", error);
    matchingBox?.classList.add("hidden");
    if (startBtn) startBtn.disabled = false;
    setRandomChatStatus("Ready");
  }
}

async function connectSignaling() {
  const url = getSignalingUrl();
  if (!url) {
    setRandomChatStatus("Signaling server not configured");
    toast("Add your WebSocket signaling URL first.");
    throw new Error("SUNSPY signaling URL is empty.");
  }

  if (randomChatSocket?.readyState === WebSocket.OPEN) return;

  if (randomChatSocket) {
    try { randomChatSocket.close(); } catch (_) {}
  }

  await new Promise((resolve, reject) => {
    let settled = false;
    const socket = new WebSocket(url);
    randomChatSocket = socket;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { socket.close(); } catch (_) {}
      reject(new Error("Signaling connection timeout."));
    }, 10000);

    socket.onopen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };

    socket.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); }
      catch (_) { return; }
      handleSignalingMessage(message);
    };

    socket.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error("Signaling connection failed."));
      }
      setRandomChatStatus("Signaling connection error");
    };

    socket.onclose = () => {
      if (!randomChatManualClose && randomChatPeer) {
        setRandomChatStatus("Connection closed");
        randomChatPeer.close();
        randomChatPeer = null;
      }
    };
  });
}

function sendSignal(message) {
  if (randomChatSocket?.readyState !== WebSocket.OPEN) return false;
  try {
    randomChatSocket.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.warn("Signal send failed:", error);
    return false;
  }
}

async function handleSignalingMessage(message) {
  const type = String(message?.type || "").toLowerCase();

  if (["match:found", "match_found", "matched", "matchfound"].includes(type)) {
    await handleMatchFound(message);
    return;
  }

  if (["signal:offer", "offer"].includes(type)) {
    await handleRemoteOffer(message.offer || message.sdp || message.data);
    return;
  }

  if (["signal:answer", "answer"].includes(type)) {
    await handleRemoteAnswer(message.answer || message.sdp || message.data);
    return;
  }

  if (["signal:ice", "ice", "candidate", "ice_candidate"].includes(type)) {
    await handleRemoteIce(message.candidate || message.data);
    return;
  }

  if (["match:left", "peer_left", "peer:left", "disconnected"].includes(type)) {
    handleRemoteLeft();
    return;
  }

  if (["error", "match:error"].includes(type)) {
    toast(message.message || "Matching server error.");
    setRandomChatStatus("Server error");
  }
}

async function handleMatchFound(message) {
  randomChatRemoteId = message.peerId || message.remoteId || message.userId || null;
  randomChatIsInitiator = Boolean(
    message.initiator ?? message.isInitiator ?? message.shouldOffer
  );

  $("#matchingBox")?.classList.add("hidden");
  $("#videoChatRoom")?.classList.remove("hidden");
  setRandomChatLayout("split");
  showRandomChatControls();
  setRandomChatStatus("Connected to a partner");

  await createPeerConnection();

  if (randomChatIsInitiator) {
    const offer = await randomChatPeer.createOffer();
    await randomChatPeer.setLocalDescription(offer);
    sendSignal({
      type: "signal:offer",
      peerId: randomChatRemoteId,
      offer: randomChatPeer.localDescription
    });
  }

  $("#videoChatRoom")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function createPeerConnection() {
  if (randomChatPeer) {
    try { randomChatPeer.close(); } catch (_) {}
  }

  randomChatPeer = new RTCPeerConnection({
    iceServers: SUNSPY_ICE_SERVERS
  });

  state.stream?.getTracks().forEach(track => {
    randomChatPeer.addTrack(track, state.stream);
  });

  randomChatPeer.onicecandidate = event => {
    if (!event.candidate) return;
    sendSignal({
      type: "signal:ice",
      peerId: randomChatRemoteId,
      candidate: event.candidate
    });
  };

  randomChatPeer.ontrack = event => {
    const video = $("#remoteVideo");
    const stream = event.streams?.[0];
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  };

  randomChatPeer.onconnectionstatechange = () => {
    const status = randomChatPeer?.connectionState;
    if (status === "connected") setRandomChatStatus("Live");
    else if (status === "connecting") setRandomChatStatus("Connecting...");
    else if (status === "disconnected") setRandomChatStatus("Disconnected");
    else if (status === "failed") setRandomChatStatus("Connection failed");
  };

  randomChatPeer.oniceconnectionstatechange = () => {
    if (randomChatPeer?.iceConnectionState === "failed") {
      randomChatPeer.restartIce?.();
    }
  };
}

async function handleRemoteOffer(offer) {
  if (!offer) return;
  if (!randomChatPeer) await createPeerConnection();
  await randomChatPeer.setRemoteDescription(offer);
  const answer = await randomChatPeer.createAnswer();
  await randomChatPeer.setLocalDescription(answer);
  sendSignal({
    type: "signal:answer",
    peerId: randomChatRemoteId,
    answer: randomChatPeer.localDescription
  });
}

async function handleRemoteAnswer(answer) {
  if (!answer || !randomChatPeer) return;
  await randomChatPeer.setRemoteDescription(answer);
}

async function handleRemoteIce(candidate) {
  if (!candidate || !randomChatPeer) return;
  try {
    await randomChatPeer.addIceCandidate(candidate);
  } catch (error) {
    console.warn("ICE candidate failed:", error);
  }
}

function handleRemoteLeft() {
  setRandomChatStatus("Partner left");
  toast("Your partner left the chat.");
  if (randomChatPeer) {
    try { randomChatPeer.close(); } catch (_) {}
    randomChatPeer = null;
  }
  randomChatRemoteId = null;
  $("#videoChatRoom")?.classList.add("hidden");
  hideRandomChatControls();
  $("#startMatchBtn")?.removeAttribute("disabled");
}

function setRandomChatLayout(mode = "split") {
  const room = $("#videoChatRoom");
  const button = $("#chatLayoutBtn");
  if (!room) return;

  room.classList.remove("split-layout", "messenger-layout");

  if (mode === "messenger") {
    room.classList.add("messenger-layout");
    if (button) {
      button.textContent = "↙";
      button.title = "Switch to OmeTV layout";
      button.setAttribute("aria-label", "Switch to OmeTV layout");
    }
  } else {
    room.classList.add("split-layout");
    if (button) {
      button.textContent = "⛶";
      button.title = "Switch to Messenger layout";
      button.setAttribute("aria-label", "Switch to Messenger layout");
    }
  }
}

function toggleRandomChatLayout() {
  const room = $("#videoChatRoom");
  if (!room) return;
  setRandomChatLayout(
    room.classList.contains("messenger-layout") ? "split" : "messenger"
  );
}

function showRandomChatControls() {
  const controls = $("#videoChatRoom")?.querySelector(".video-controls");
  if (!controls) return;
  controls.classList.add("controls-visible");
  clearTimeout(randomChatControlsTimer);
  randomChatControlsTimer = setTimeout(() => {
    controls.classList.remove("controls-visible");
  }, 3500);
}

function hideRandomChatControls() {
  const controls = $("#videoChatRoom")?.querySelector(".video-controls");
  controls?.classList.remove("controls-visible");
  clearTimeout(randomChatControlsTimer);
}

async function startLocalCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast("Camera API is not available. Use HTTPS or localhost.");
    throw new Error("getUserMedia unavailable");
  }

  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }

  state.stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  });

  const video = $("#localVideo");
  if (video) {
    video.srcObject = state.stream;
    await video.play().catch(() => {});
  }
}

function cancelMatch() {
  clearTimeout(state.matchingTimer);
  sendSignal({ type: "match:cancel" });
  randomChatManualClose = true;
  try { randomChatSocket?.close(); } catch (_) {}
  randomChatSocket = null;
  closeRandomPeer();
  stopLocalMedia();
  $("#matchingBox")?.classList.add("hidden");
  $("#videoChatRoom")?.classList.add("hidden");
  $("#startMatchBtn")?.removeAttribute("disabled");
  hideRandomChatControls();
  setRandomChatStatus("Ready");
  toast("Matching cancelled.");
}

function endMatch(showToast = true) {
  clearTimeout(state.matchingTimer);
  sendSignal({ type: "match:end", peerId: randomChatRemoteId });
  randomChatManualClose = true;
  try { randomChatSocket?.close(); } catch (_) {}
  randomChatSocket = null;
  closeRandomPeer();
  stopLocalMedia();
  randomChatRemoteId = null;
  randomChatIsInitiator = false;

  $("#matchingBox")?.classList.add("hidden");
  $("#videoChatRoom")?.classList.add("hidden");
  $("#startMatchBtn")?.removeAttribute("disabled");
  hideRandomChatControls();
  setRandomChatLayout("split");
  setRandomChatStatus("Ready");

  if (showToast) toast("Call ended.");
}

function closeRandomPeer() {
  if (randomChatPeer) {
    try { randomChatPeer.close(); } catch (_) {}
    randomChatPeer = null;
  }
}

function stopLocalMedia() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
  const local = $("#localVideo");
  if (local) local.srcObject = null;
  const remote = $("#remoteVideo");
  if (remote) remote.srcObject = null;

  const mic = $("#toggleMicBtn");
  const cam = $("#toggleCameraBtn");
  if (mic) mic.textContent = "🎙️";
  if (cam) cam.textContent = "📷";
}

/* =========================================================
   MEDIA INPUTS
   ========================================================= */

  function setupMediaInputs() {

    $("#postPhotoInput")
      ?.addEventListener(
        "change",
        e => {

          const n =
            e.target.files
              ?.length || 0;


          if (n) {

            toast(
              `${n} photo${
                n > 1
                  ? "s"
                  : ""
              } selected.`
            );

          }

        }
      );


    $("#postVideoInput")
      ?.addEventListener(
        "change",
        e => {

          if (
            e.target.files
              ?.length
          ) {

            toast(
              "Video selected."
            );

          }

        }
      );


    $("#profilePhotoInput")
      ?.addEventListener(
        "change",
        e => {

          if (
            e.target.files
              ?.length
          ) {

            toast(
              "Profile photo selected."
            );

          }

        }
      );


    $("#privatePhotoInput")
      ?.addEventListener(
        "change",
        e => {

          const files =
            [
              ...(e.target.files || [])
            ];


          if (!files.length) {
            return;
          }


          const grid =
            $("#privatePhotoGrid");


          if (!grid) return;


          files.forEach(
            file => {

              if (
                !file.type
                  .startsWith(
                    "image/"
                  )
              ) {

                return;

              }


              const img =
                document.createElement(
                  "img"
                );


              img.src =
                URL.createObjectURL(
                  file
                );


              img.alt =
                "Private photo";


              img.style.cssText =
                "width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px;border:1px solid var(--border)";


              grid.appendChild(
                img
              );

            }
          );


          toast(
            "Private photos added locally."
          );

        }
      );


    $("#backgroundPhotoInput")
      ?.addEventListener(
        "change",
        e => {

          if (
            e.target.files
              ?.length
          ) {

            toast(
              "Background photo selected."
            );

          }

        }
      );


    $("#changeBackgroundBtn")
      ?.addEventListener(
        "click",
        () =>
          navigateToPage(
            "customizationPage"
          )
      );

  }


  /* =========================================================
     INITIALIZE
     ========================================================= */

  function init() {

    setupAuth();

    setupNavigation();

    setupGlobalButtons();


    /* Initial Gift UI */

    updateSelectedGiftUI();

    updateGiftAmountUI();

    updateSelectedRecipientsUI();

    updateGiftConfirmButton();

    renderTransactions();


    /*
     * Make page visibility deterministic
     * even if CSS is cached.
     */

    $$(".page")
      .forEach(page => {

        if (
          page.id ===
          "homePage"
        ) {

          page.classList.add(
            "active"
          );


          page.classList.remove(
            "hidden"
          );

        }

        else {

          page.classList.remove(
            "active"
          );


          page.classList.add(
            "hidden"
          );

        }


        page.setAttribute(
          "aria-hidden",

          page.id ===
          "homePage"

            ? "false"

            : "true"

        );

      });


    // Firebase Auth is the source of truth.
    // Do not restore authentication from localStorage.
    if (!window.firebase?.auth) {
      showOnlyScreen("authScreen");
    }

  }


  /* =========================================================
     GLOBAL API
     ========================================================= */

  window.SUNSPY = {

    state,

    navigateToPage,

    openApp,

    logout,

    toast,

    sendSelectedGifts,

    renderTransactions,
    startRandomMatch,
    cancelMatch,
    endMatch,
    toggleRandomChatLayout

  };


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  }

  else {

    init();

  }


})();

/* =========================================================
   SUN SPY — RANDOM CHAT START SAFETY BOOT
   Ensures Start Matching still works if another initialization
   block fails before setupRandomChat() is reached.
   ========================================================= */
(function () {
  "use strict";

  function bindRandomChatSafety() {
    const btn = document.querySelector("#startMatchBtn");
    if (!btn || btn.dataset.randomChatSafetyBound === "1") return;

    btn.dataset.randomChatSafetyBound = "1";

    btn.addEventListener("click", function () {
      const matching = document.querySelector("#matchingBox");
      const room = document.querySelector("#videoChatRoom");

      if (matching) matching.classList.remove("hidden");
      if (room) room.classList.add("hidden");

      const api = window.SUNSPY;
      if (api && typeof api.startRandomMatch === "function") {
        api.startRandomMatch().catch(function (err) {
          console.error("Random Chat safety start failed:", err);
        });
      } else {
        const status = document.querySelector("#callStatus");
        if (status) status.textContent = "Random Chat is loading...";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindRandomChatSafety, { once: true });
  } else {
    bindRandomChatSafety();
  }
})();
