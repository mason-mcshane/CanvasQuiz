// ── auth.js ──
// Handles all user authentication: sign in, sign up, Google OAuth,
// sign out, session detection, and the auth/guest modal UI.

import { db, state, showToast } from "./state.js";
import { loadQuizList } from "./quiz-library.js";

// ── Init: check for existing session on page load ──
export async function initAuth() {
    const { data: { session } } = await db.auth.getSession();
    state.currentUser = session?.user ?? null;
    updateAuthUI();

    if (!currentUser) openAuth("signin");

    db.auth.onAuthStateChange((_event, session) => {
        state.currentUser = session?.user ?? null;
        updateAuthUI();
        loadQuizList();
    });
}

// Shorthand getter so other modules can reference state.currentUser cleanly
export function currentUser() { return state.currentUser; }

// ── Update header UI based on login state ──
export function updateAuthUI() {
    const authBar   = document.getElementById("authBar");
    const userBar   = document.getElementById("userBar");
    const userEmail = document.getElementById("userEmail");

    if (state.currentUser) {
        authBar.style.display = "none";
        userBar.style.display = "flex";
        userEmail.textContent = state.currentUser.email;
    } else {
        authBar.style.display = "flex";
        userBar.style.display = "none";
    }
}

// ── Open / close auth modal ──
export function openAuth(tab = "signin") {
    switchAuthTab(tab);
    document.getElementById("authModal").style.display = "flex";
    document.getElementById("authError").textContent = "";
}

export function closeAuth() {
    document.getElementById("authModal").style.display = "none";
    if (!state.currentUser) {
        document.getElementById("guestWarningModal").style.display = "flex";
    }
}

export function switchAuthTab(tab) {
    state.authTabMode = tab;
    document.getElementById("authSubmitBtn").textContent =
        tab === "signin" ? "Sign In" : "Create Account";
    document.querySelectorAll(".auth-tab").forEach((btn, i) => {
        btn.classList.toggle(
            "active",
            (i === 0 && tab === "signin") || (i === 1 && tab === "signup")
        );
    });
}

// ── Submit email/password auth ──
export async function submitAuth() {
    const email    = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const errEl    = document.getElementById("authError");
    errEl.textContent = "";

    if (!email || !password) {
        errEl.textContent = "Please enter your email and password.";
        return;
    }

    const result = state.authTabMode === "signin"
        ? await db.auth.signInWithPassword({ email, password })
        : await db.auth.signUp({ email, password });

    if (result.error) { errEl.textContent = result.error.message; return; }

    if (state.authTabMode === "signup" && !result.data.session) {
        errEl.style.color = "var(--success)";
        errEl.textContent = "Check your email to confirm your account!";
        return;
    }

    document.getElementById("authModal").style.display = "none";
    showToast(state.authTabMode === "signin" ? "Welcome back!" : "Account created!");
}

// ── Google OAuth ──
export async function signInWithGoogle() {
    const { error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
    });
    if (error) showToast("Google sign-in failed.");
}

// ── Sign out ──
export async function signOut() {
    await db.auth.signOut();
    showToast("Signed out.");
    loadQuizList();
}

// ── Guest warning ──
export function closeGuestWarning() {
    document.getElementById("guestWarningModal").style.display = "none";
}
