// ── ui.js ──
// Handles UI state that doesn't belong to a specific feature:
// edit/take mode toggling, the changelog modal, and the feedback modal.

import { state } from "./state.js";
import { renderQuizQuestions } from "./quiz-taker.js";
import { renderAttempts, renderAnalytics } from "./analytics.js";

// ── Switch between Edit and Take modes ──
export function setMode(mode) {
    state.currentMode = mode;

    document.getElementById("editSection").style.display =
        mode === "edit" ? "block" : "none";
    document.getElementById("takeSection").style.display =
        mode === "take" ? "block" : "none";

    document.getElementById("btnEdit").classList.toggle("active", mode === "edit");
    document.getElementById("btnTake").classList.toggle("active", mode === "take");

    if (mode === "take") {
        renderQuizQuestions();
        renderAttempts();
        renderAnalytics();
    }
}

// ── Changelog modal ──
export function openChangelog()  {
    document.getElementById("changelogModal").style.display = "flex";
}
export function closeChangelog() {
    document.getElementById("changelogModal").style.display = "none";
}

// ── Feedback modal ──
export function openFeedback()  {
    document.getElementById("feedbackModal").style.display = "flex";
}
export function closeFeedback() {
    document.getElementById("feedbackModal").style.display = "none";
}
