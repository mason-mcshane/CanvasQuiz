// ── analytics.js ──
// Tracks quiz attempt history in localStorage and renders
// the attempt history and analytics panels.

import { state } from "./state.js";

// ── Save a new attempt to localStorage ──
export function saveAttempt(score, total) {
    const title    = state.currentQuizTitle || "Untitled";
    const attempts = JSON.parse(localStorage.getItem("attempts")) || {};
    if (!attempts[title]) attempts[title] = [];
    attempts[title].push({ score, total, date: new Date().toLocaleString() });
    localStorage.setItem("attempts", JSON.stringify(attempts));
}

// ── Render attempt history for the current quiz ──
export function renderAttempts() {
    const title     = state.currentQuizTitle || "Untitled";
    const container = document.getElementById("attemptHistory");
    const attempts  = JSON.parse(localStorage.getItem("attempts")) || {};
    const list      = attempts[title] || [];

    if (list.length === 0) { container.innerHTML = ""; return; }

    container.innerHTML = `<h3>Attempt History</h3>`;
    list.slice().reverse().forEach(a => {
        const pct = Math.round((a.score / a.total) * 100);
        container.innerHTML += `
            <div class="attempt-row">
                <span class="attempt-score">${a.score}/${a.total} (${pct}%)</span>
                <span>${a.date}</span>
            </div>
        `;
    });
}

// ── Render analytics summary for the current quiz ──
export function renderAnalytics() {
    const title     = state.currentQuizTitle || "Untitled";
    const container = document.getElementById("analytics");
    const attempts  = JSON.parse(localStorage.getItem("attempts")) || {};
    const list      = attempts[title] || [];

    if (list.length === 0) { container.innerHTML = ""; return; }

    const scores = list.map(a => a.score / a.total);
    const best   = Math.max(...scores);
    const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
    const trend  = scores[scores.length - 1] > scores[0] ? "📈 Improving"
                 : scores[scores.length - 1] < scores[0] ? "📉 Declining"
                 : "➡️ Stable";

    container.innerHTML = `
        <h3>Analytics</h3>
        <div class="stat-row">
            <span class="stat-label">Best Score</span>
            <span class="stat-value">${(best * 100).toFixed(1)}%</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Average</span>
            <span class="stat-value">${(avg * 100).toFixed(1)}%</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Attempts</span>
            <span class="stat-value">${scores.length}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Trend</span>
            <span class="stat-value">${trend}</span>
        </div>
    `;
}
