// ── review.js ──
// Loads quiz results from sessionStorage and renders the review page
// with filtering by all / wrong / correct, grouped by source quiz.

// ── Theme toggle (no module needed, standalone) ──
document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
});

// ── Load review data ──
const raw = sessionStorage.getItem("reviewData");

if (!raw) {
    document.getElementById("reviewMain").style.display = "none";
    document.getElementById("noData").style.display     = "flex";
} else {
    const data = JSON.parse(raw);
    render(data, "all");

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            render(data, btn.dataset.filter);
        });
    });
}

// ── Render review ──
function render(data, filter) {
    document.getElementById("reviewTitle").textContent = data.title || "Quiz Review";
    document.getElementById("reviewScore").textContent = `${data.score} / ${data.total}`;
    document.getElementById("reviewPct").textContent   = `${data.pct}%`;

    const list = document.getElementById("reviewList");
    list.innerHTML = "";

    // Filter results
    const filtered = data.results.filter(r => {
        if (filter === "wrong")   return !r.isCorrect;
        if (filter === "correct") return r.isCorrect;
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state">No questions match this filter.</div>`;
        return;
    }

    // Group by source quiz
    const groups = {};
    filtered.forEach((r, i) => {
        const src = r.sourceQuiz || "Quiz";
        if (!groups[src]) groups[src] = [];
        groups[src].push({ ...r, originalIndex: data.results.indexOf(r) });
    });

    const sourceNames = Object.keys(groups);
    const isMultiSource = sourceNames.length > 1;

    sourceNames.forEach(source => {
        // Only show divider if there are multiple source quizzes
        if (isMultiSource) {
            const divider = document.createElement("div");
            divider.className = "source-divider";
            divider.textContent = `From: ${source}`;
            list.appendChild(divider);
        }

        groups[source].forEach(r => {
            const card = document.createElement("div");
            card.className = `review-card ${r.isCorrect ? "correct" : "wrong"}`;

            const answersHTML = buildAnswerHTML(r);

            card.innerHTML = `
                <div class="review-card-header">
                    <span class="review-q-num">Question ${r.originalIndex + 1}</span>
                    <span class="review-result-badge ${r.isCorrect ? "correct" : "wrong"}">
                        ${r.isCorrect ? "✅ Correct" : "❌ Wrong"}
                    </span>
                </div>
                <div class="review-card-body">
                    <div class="review-question">${r.question}</div>
                    <div class="review-answer-row">${answersHTML}</div>
                </div>
            `;
            list.appendChild(card);
        });
    });
}

// ── Build the answer display for each question type ──
function buildAnswerHTML(r) {
    const splitAnswers = str => str.split("\\").map(a => a.trim()).filter(Boolean);

    if (r.userAnswer === null || r.userAnswer === undefined) {
        return `<span class="skipped-label">— Not answered</span>`;
    }

    if (r.type === "multipleChoice") {
        const options = splitAnswers(r.answers);
        const userAns = options[r.userAnswer] ?? "—";
        const corrAns = options[r.correct]    ?? "—";

        if (r.isCorrect) {
            return `
                <div class="review-answer-label">Your Answer</div>
                <div class="user-answer-box correct-answer">✅ ${userAns}</div>
            `;
        }
        return `
            <div class="review-answer-label">Your Answer</div>
            <div class="user-answer-box wrong-answer">❌ ${userAns}</div>
            <div class="review-answer-label" style="margin-top:8px;">Correct Answer</div>
            <div class="correct-answer-box">✅ ${corrAns}</div>
        `;
    }

    if (r.type === "multipleSelect") {
        const options  = splitAnswers(r.answers);
        const userStrs = (r.userAnswer || []).map(i => options[i]).join(", ");
        const corrStrs = r.correct.map(i => options[i]).join(", ");

        if (r.isCorrect) {
            return `
                <div class="review-answer-label">Your Answer</div>
                <div class="user-answer-box correct-answer">✅ ${userStrs}</div>
            `;
        }
        return `
            <div class="review-answer-label">Your Answer</div>
            <div class="user-answer-box wrong-answer">❌ ${userStrs}</div>
            <div class="review-answer-label" style="margin-top:8px;">Correct Answer</div>
            <div class="correct-answer-box">✅ ${corrStrs}</div>
        `;
    }

    if (r.type === "trueFalse") {
        const userStr = r.userAnswer ? "True" : "False";
        const corrStr = r.correct    ? "True" : "False";

        if (r.isCorrect) {
            return `
                <div class="review-answer-label">Your Answer</div>
                <div class="user-answer-box correct-answer">✅ ${userStr}</div>
            `;
        }
        return `
            <div class="review-answer-label">Your Answer</div>
            <div class="user-answer-box wrong-answer">❌ ${userStr}</div>
            <div class="review-answer-label" style="margin-top:8px;">Correct Answer</div>
            <div class="correct-answer-box">✅ ${corrStr}</div>
        `;
    }

    if (r.type === "fillBlank" || r.type === "word") {
        if (r.isCorrect) {
            return `
                <div class="review-answer-label">Your Answer</div>
                <div class="user-answer-box correct-answer">✅ ${r.userAnswer}</div>
            `;
        }
        return `
            <div class="review-answer-label">Your Answer</div>
            <div class="user-answer-box wrong-answer">❌ ${r.userAnswer}</div>
            <div class="review-answer-label" style="margin-top:8px;">Correct Answer</div>
            <div class="correct-answer-box">✅ ${r.correct}</div>
        `;
    }

    return "";
}