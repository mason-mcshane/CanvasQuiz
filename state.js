// ── state.js ──
// Shared application state and utility functions.
// Import this in any module that needs access to the current user,
// quiz data, or the database client.

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const state = {
    quizData:        [],
    currentMode:     "edit",
    currentQuizId:   null,
    currentQuizTitle: "",
    currentUser:     null,
    authTabMode:     "signin"
};

// Split a answers string by the \ separator
export function splitAnswers(str) {
    return str.split("\\").map(a => a.trim()).filter(Boolean);
}

// Show a brief toast notification at the bottom of the screen
let toastTimer;
export function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}