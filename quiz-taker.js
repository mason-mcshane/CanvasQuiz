// ── quiz-taker.js ──
// Handles rendering quiz questions in Take mode and grading submissions.

import { state, splitAnswers, showToast } from "./state.js";
import { saveAttempt, renderAttempts, renderAnalytics } from "./analytics.js";

// ── Render all questions for the currently loaded quiz ──
export function renderQuizQuestions() {
    const container = document.getElementById("quiz");
    const submitRow = document.getElementById("submitRow");
    container.innerHTML = "";

    if (state.quizData.length === 0) {
        submitRow.style.display = "none";
        return;
    }

    submitRow.style.display = "flex";

    state.quizData.forEach((q, index) => {
        const card = document.createElement("div");
        card.className = "question-card";

        let bodyHTML = `<div class="q-text">${q.question}</div>`;

        if (q.type === "multipleChoice") {
            const options = splitAnswers(q.answers);
            bodyHTML += options.map((a, i) => `
                <label class="answer-option">
                    <input type="radio" name="q${index}" value="${i}">
                    <span>${a}</span>
                </label>
            `).join("");

        } else if (q.type === "multipleSelect") {
            const options = splitAnswers(q.answers);
            bodyHTML += options.map((a, i) => `
                <label class="answer-option">
                    <input type="checkbox" name="q${index}" value="${i}">
                    <span>${a}</span>
                </label>
            `).join("");
            bodyHTML += `<p class="hint" style="margin-top:8px;">Select all that apply</p>`;

        } else if (q.type === "trueFalse") {
            bodyHTML += `
                <label class="answer-option">
                    <input type="radio" name="q${index}" value="true"><span>True</span>
                </label>
                <label class="answer-option">
                    <input type="radio" name="q${index}" value="false"><span>False</span>
                </label>
            `;

        } else if (q.type === "fillBlank" || q.type === "word") {
            bodyHTML += `
                <input type="text" class="text-answer-input"
                    id="q${index}_text" placeholder="Your answer...">
            `;
        }

        card.innerHTML = `
            <div class="question-card-header">
                <div class="q-num">Question ${index + 1}</div>
            </div>
            <div class="question-card-body">${bodyHTML}</div>
        `;
        container.appendChild(card);
    });
}

// ── Grade the quiz, store results, and display review button ──
export function submitQuiz() {
    let score   = 0;
    const results = [];

    state.quizData.forEach((q, index) => {
        let isCorrect   = false;
        let userAnswer  = null;

        if (q.type === "multipleChoice") {
            const sel = document.querySelector(`input[name="q${index}"]:checked`);
            if (sel) {
                userAnswer = Number(sel.value);
                isCorrect  = userAnswer === q.correct;
            }

        } else if (q.type === "multipleSelect") {
            const checked = [...document.querySelectorAll(`input[name="q${index}"]:checked`)]
                .map(el => Number(el.value));
            if (checked.length > 0) {
                userAnswer = checked;
                isCorrect  = [...q.correct].sort().join(",") === checked.sort().join(",");
            }

        } else if (q.type === "trueFalse") {
            const sel = document.querySelector(`input[name="q${index}"]:checked`);
            if (sel) {
                userAnswer = sel.value === "true";
                isCorrect  = userAnswer === q.correct;
            }

        } else if (q.type === "fillBlank" || q.type === "word") {
            const input = document.getElementById(`q${index}_text`);
            if (input?.value.trim()) {
                userAnswer = input.value.trim();
                isCorrect  = userAnswer.toLowerCase() === q.correct;
            }
        }

        if (isCorrect) score++;

        results.push({
            question:   q.question,
            type:       q.type,
            answers:    q.answers,
            correct:    q.correct,
            userAnswer,
            isCorrect,
            sourceQuiz: q.sourceQuiz || state.currentQuizTitle
        });
    });

    const pct   = state.quizData.length > 0
        ? Math.round((score / state.quizData.length) * 100) : 0;
    const label = pct >= 90 ? "Excellent! 🎉"
                : pct >= 70 ? "Good job! 👍"
                : pct >= 50 ? "Keep practicing!"
                : "Keep studying!";

    // Store results in sessionStorage for the review page
    sessionStorage.setItem("reviewData", JSON.stringify({
        title:   state.currentQuizTitle,
        score,
        total:   state.quizData.length,
        pct,
        results
    }));

    const resultsEl = document.getElementById("results");
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `
        <div class="results-score">${score} / ${state.quizData.length}</div>
        <div class="results-label">${pct}% — ${label}</div>
        <button class="btn-primary" id="reviewBtn" style="margin-top:16px;">
            📋 Review Answers
        </button>
    `;

    document.getElementById("reviewBtn").addEventListener("click", () => {
        window.open("review.html", "_blank");
    });

    saveAttempt(score, state.quizData.length);
    renderAttempts();
    renderAnalytics();
    resultsEl.scrollIntoView({ behavior: "smooth" });
}
