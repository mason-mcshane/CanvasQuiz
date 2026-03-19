// ── Supabase Init ──
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── State ──
let quizData = [];
let currentMode = "edit";
let currentQuizId = null;
let currentQuizTitle = "";

// The separator users type between answers
const SEP = "\\";

// ── DOM Refs ──
const qType    = document.getElementById("qType");
const qText    = document.getElementById("qText");
const qAnswers = document.getElementById("qAnswers");
const qCorrect = document.getElementById("qCorrect");

// Split answers by the \ separator, trimming whitespace around each
function splitAnswers(str) {
    return str.split("\\").map(a => a.trim()).filter(Boolean);
}

// ────────────────────────────────────────────────────────────
// MODE
// ────────────────────────────────────────────────────────────
function setMode(mode) {
    currentMode = mode;

    document.getElementById("editSection").style.display = mode === "edit" ? "block" : "none";
    document.getElementById("takeSection").style.display = mode === "take" ? "block" : "none";

    document.getElementById("btnEdit").classList.toggle("active", mode === "edit");
    document.getElementById("btnTake").classList.toggle("active", mode === "take");

    if (mode === "take") {
        renderQuizQuestions();
        renderAttempts();
        renderAnalytics();
    }
}

// ────────────────────────────────────────────────────────────
// ANSWER HINTS (update UI based on question type)
// ────────────────────────────────────────────────────────────
function updateAnswerHint() {
    const type = qType.value;
    const answersGroup = document.getElementById("answersGroup");
    const answerHint   = document.getElementById("answerHint");
    const correctHint  = document.getElementById("correctHint");

    if (type === "trueFalse") {
        answersGroup.style.display = "none";
        correctHint.textContent = 'Type:  true  or  false';
        qCorrect.placeholder = "true";
    } else if (type === "multipleChoice") {
        answersGroup.style.display = "block";
        answerHint.textContent = 'Separate options with \\   e.g.  Paris \\ London \\ Berlin \\ Tokyo';
        correctHint.textContent = 'Enter the NUMBER of the correct option  (1, 2, 3...)';
        qCorrect.placeholder = "1";
    } else if (type === "multipleSelect") {
        answersGroup.style.display = "block";
        answerHint.textContent = 'Separate options with \\   e.g.  Python \\ Java \\ HTML \\ CSS';
        correctHint.textContent = 'Enter the NUMBERS of ALL correct options separated by commas  e.g.  1,3';
        qCorrect.placeholder = "1,3";
    } else if (type === "fillBlank" || type === "word") {
        answersGroup.style.display = "none";
        correctHint.textContent = 'Type the exact correct answer (not case-sensitive)';
        qCorrect.placeholder = "photosynthesis";
    }
}

// ────────────────────────────────────────────────────────────
// ADD QUESTION
// ────────────────────────────────────────────────────────────
function addQuestion() {
    const errorEl = document.getElementById("addError");
    errorEl.textContent = "";

    const type     = qType.value;
    const question = qText.value.trim();
    const answers  = qAnswers.value.trim();
    let correct    = qCorrect.value.trim();

    // Basic validation
    if (!question) { errorEl.textContent = "Please enter a question."; return; }
    if (!correct)  { errorEl.textContent = "Please enter the correct answer."; return; }

    if (type === "multipleChoice" || type === "multipleSelect") {
        if (!answers) { errorEl.textContent = "Please enter the answer options."; return; }
        const parts = splitAnswers(answers);
        if (parts.length < 2) { errorEl.textContent = 'Please enter at least 2 answers separated by \\.'; return; }
    }

    // Normalize correct answer into the stored format
    if (type === "multipleChoice") {
        const num = Number(correct) - 1; // store as 0-based index
        if (isNaN(num) || num < 0) { errorEl.textContent = "Correct answer must be a number like 1, 2, 3..."; return; }
        correct = num;
    } else if (type === "multipleSelect") {
        correct = correct.split(",").map(n => Number(n.trim()) - 1); // 0-based array
    } else if (type === "trueFalse") {
        const val = correct.toLowerCase();
        if (val !== "true" && val !== "false") { errorEl.textContent = 'Please enter "true" or "false".'; return; }
        correct = val === "true";
    } else {
        correct = correct.toLowerCase();
    }

    quizData.push({ type, question, answers, correct });

    // Clear inputs
    qText.value = "";
    qAnswers.value = "";
    qCorrect.value = "";

    renderEditList();
    showToast("Question added!");
}

// ────────────────────────────────────────────────────────────
// RENDER EDIT LIST
// ────────────────────────────────────────────────────────────
function renderEditList() {
    const list    = document.getElementById("questionList");
    const saveRow = document.getElementById("saveRow");
    list.innerHTML = "";

    if (quizData.length === 0) { saveRow.style.display = "none"; return; }
    saveRow.style.display = "flex";

    const typeLabels = {
        multipleChoice: "Multiple Choice",
        multipleSelect: "Multiple Select",
        trueFalse:      "True / False",
        fillBlank:      "Fill in the Blank",
        word:           "Word Answer"
    };

    quizData.forEach((q, i) => {
        const div = document.createElement("div");
        div.className = "q-item";
        div.innerHTML = `
            <div class="q-item-left">
                <div class="q-num">Question ${i + 1}</div>
                <div class="q-text">${q.question}</div>
                <span class="q-type-tag">${typeLabels[q.type] || q.type}</span>
            </div>
            <div class="q-item-actions">
                <button class="btn-icon" onclick="editQuestion(${i})">Edit</button>
                <button class="btn-icon danger" onclick="deleteQuestion(${i})">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// ────────────────────────────────────────────────────────────
// EDIT / DELETE
// ────────────────────────────────────────────────────────────
function editQuestion(index) {
    const q = quizData[index];
    qType.value = q.type;
    updateAnswerHint();

    qText.value    = q.question;
    qAnswers.value = q.answers;

    // Convert stored format back to human-readable for the input
    if (q.type === "multipleChoice")      qCorrect.value = q.correct + 1;
    else if (q.type === "multipleSelect") qCorrect.value = q.correct.map(n => n + 1).join(",");
    else if (q.type === "trueFalse")      qCorrect.value = q.correct ? "true" : "false";
    else                                   qCorrect.value = q.correct;

    quizData.splice(index, 1);
    renderEditList();
}

function deleteQuestion(index) {
    quizData.splice(index, 1);
    renderEditList();
    showToast("Question deleted.");
}

// ────────────────────────────────────────────────────────────
// RENDER QUIZ QUESTIONS (Take Mode)
// ────────────────────────────────────────────────────────────
function renderQuizQuestions() {
    const container = document.getElementById("quiz");
    const submitRow = document.getElementById("submitRow");
    container.innerHTML = "";

    if (quizData.length === 0) {
        submitRow.style.display = "none";
        return;
    }

    submitRow.style.display = "flex";

    quizData.forEach((q, index) => {
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
        }

        else if (q.type === "multipleSelect") {
            const options = splitAnswers(q.answers);
            bodyHTML += options.map((a, i) => `
                <label class="answer-option">
                    <input type="checkbox" name="q${index}" value="${i}">
                    <span>${a}</span>
                </label>
            `).join("");
            bodyHTML += `<p class="hint" style="margin-top:8px;">Select all that apply</p>`;
        }

        else if (q.type === "trueFalse") {
            bodyHTML += `
                <label class="answer-option">
                    <input type="radio" name="q${index}" value="true">
                    <span>True</span>
                </label>
                <label class="answer-option">
                    <input type="radio" name="q${index}" value="false">
                    <span>False</span>
                </label>
            `;
        }

        else if (q.type === "fillBlank" || q.type === "word") {
            bodyHTML += `<input type="text" class="text-answer-input" id="q${index}_text" placeholder="Your answer...">`;
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

// ────────────────────────────────────────────────────────────
// SUBMIT QUIZ
// ────────────────────────────────────────────────────────────
function submitQuiz() {
    let score = 0;

    quizData.forEach((q, index) => {
        let isCorrect = false;

        if (q.type === "multipleChoice") {
            const sel = document.querySelector(`input[name="q${index}"]:checked`);
            if (sel) isCorrect = Number(sel.value) === q.correct;
        }

        else if (q.type === "multipleSelect") {
            const checked = [...document.querySelectorAll(`input[name="q${index}"]:checked`)]
                .map(el => Number(el.value));
            if (checked.length > 0) {
                const a = [...q.correct].sort().join(",");
                const b = checked.sort().join(",");
                isCorrect = a === b;
            }
        }

        else if (q.type === "trueFalse") {
            const sel = document.querySelector(`input[name="q${index}"]:checked`);
            if (sel) isCorrect = (sel.value === "true") === q.correct;
        }

        else if (q.type === "fillBlank" || q.type === "word") {
            const input = document.getElementById(`q${index}_text`);
            if (input && input.value.trim()) {
                isCorrect = input.value.trim().toLowerCase() === q.correct;
            }
        }

        if (isCorrect) score++;
    });

    const pct = quizData.length > 0 ? Math.round((score / quizData.length) * 100) : 0;
    const label = pct >= 90 ? "Excellent! 🎉"
                : pct >= 70 ? "Good job! 👍"
                : pct >= 50 ? "Keep practicing!"
                : "Keep studying!";

    const resultsEl = document.getElementById("results");
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `
        <div class="results-score">${score} / ${quizData.length}</div>
        <div class="results-label">${pct}% — ${label}</div>
    `;

    saveAttempt(score, quizData.length);
    renderAttempts();
    renderAnalytics();
    resultsEl.scrollIntoView({ behavior: "smooth" });
}

// ────────────────────────────────────────────────────────────
// SAVE QUIZ TO SUPABASE
// ────────────────────────────────────────────────────────────
async function saveQuiz() {
    const title = document.getElementById("quizTitle").value.trim();
    if (!title)              { showToast("Please enter a quiz title first."); return; }
    if (quizData.length === 0) { showToast("Add at least one question first."); return; }

    const { data: quizRow, error: quizErr } = await db
        .from("quizzes")
        .insert([{ title }])
        .select()
        .single();

    if (quizErr) { showToast("Error saving quiz — check console."); console.error(quizErr); return; }

    const rows = quizData.map(q => ({
        quiz_id:  quizRow.id,
        type:     q.type,
        question: q.question,
        answers:  q.answers,
        correct:  JSON.stringify(q.correct)
    }));

    const { error: qErr } = await db.from("questions").insert(rows);
    if (qErr) { showToast("Questions failed to save — check console."); console.error(qErr); return; }

    showToast("Quiz saved!");
    loadQuizList();
}

// ────────────────────────────────────────────────────────────
// LOAD QUIZ LIST
// ────────────────────────────────────────────────────────────
async function loadQuizList() {
    const { data, error } = await db
        .from("quizzes")
        .select("id, title, created_at")
        .order("created_at", { ascending: false });

    const list  = document.getElementById("quizList");
    const empty = document.getElementById("libraryEmpty");
    list.innerHTML = "";

    if (error || !data || data.length === 0) {
        empty.style.display = "block";
        return;
    }

    empty.style.display = "none";

    data.forEach(quiz => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        const date = new Date(quiz.created_at).toLocaleDateString();
        const safeTitle = quiz.title.replace(/'/g, "\\'");
        card.innerHTML = `
            <div>
                <div class="quiz-card-title">${quiz.title}</div>
                <div class="quiz-card-meta">Saved ${date}</div>
            </div>
            <div class="quiz-card-actions">
                <button class="btn-icon" onclick="loadQuiz(${quiz.id}, '${safeTitle}')">Load</button>
                <button class="btn-icon danger" onclick="deleteQuiz(${quiz.id})">Delete</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// ────────────────────────────────────────────────────────────
// LOAD A SINGLE QUIZ
// ────────────────────────────────────────────────────────────
async function loadQuiz(id, title) {
    const { data, error } = await db
        .from("questions")
        .select("*")
        .eq("quiz_id", id);

    if (error || !data) { showToast("Failed to load quiz."); return; }

    quizData = data.map(q => ({
        type:     q.type,
        question: q.question,
        answers:  q.answers,
        correct:  JSON.parse(q.correct)
    }));

    currentQuizId    = id;
    currentQuizTitle = title;

    document.getElementById("takeTitleDisplay").textContent = title;
    document.getElementById("takeSubtitle").textContent =
        `${quizData.length} question${quizData.length !== 1 ? "s" : ""}`;
    document.getElementById("results").style.display = "none";

    setMode("take");
    showToast(`Loaded "${title}"`);
}

// ────────────────────────────────────────────────────────────
// DELETE QUIZ
// ────────────────────────────────────────────────────────────
async function deleteQuiz(id) {
    if (!confirm("Delete this quiz and all its questions?")) return;
    await db.from("questions").delete().eq("quiz_id", id);
    await db.from("quizzes").delete().eq("id", id);
    showToast("Quiz deleted.");
    loadQuizList();
}

// ────────────────────────────────────────────────────────────
// ATTEMPTS
// ────────────────────────────────────────────────────────────
function saveAttempt(score, total) {
    const title = currentQuizTitle || "Untitled";
    let attempts = JSON.parse(localStorage.getItem("attempts")) || {};
    if (!attempts[title]) attempts[title] = [];
    attempts[title].push({ score, total, date: new Date().toLocaleString() });
    localStorage.setItem("attempts", JSON.stringify(attempts));
}

function renderAttempts() {
    const title     = currentQuizTitle || "Untitled";
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

function renderAnalytics() {
    const title     = currentQuizTitle || "Untitled";
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
        <div class="stat-row"><span class="stat-label">Best Score</span>  <span class="stat-value">${(best * 100).toFixed(1)}%</span></div>
        <div class="stat-row"><span class="stat-label">Average</span>     <span class="stat-value">${(avg * 100).toFixed(1)}%</span></div>
        <div class="stat-row"><span class="stat-label">Attempts</span>    <span class="stat-value">${scores.length}</span></div>
        <div class="stat-row"><span class="stat-label">Trend</span>       <span class="stat-value">${trend}</span></div>
    `;
}

// ────────────────────────────────────────────────────────────
// FEEDBACK MODAL
// ────────────────────────────────────────────────────────────
function openFeedback()  { document.getElementById("feedbackModal").style.display = "flex"; }
function closeFeedback() { document.getElementById("feedbackModal").style.display = "none"; }

async function submitFeedback() {
    const name    = document.getElementById("fbName").value.trim() || "Anonymous";
    const message = document.getElementById("fbMessage").value.trim();
    const errEl   = document.getElementById("fbError");

    if (!message) { errEl.textContent = "Please describe the issue."; return; }
    errEl.textContent = "";

    // Placeholder — wire up EmailJS or a Supabase feedback table here later
    console.log("Feedback:", { name, message });
    showToast("Thanks for your report!");
    closeFeedback();
    document.getElementById("fbName").value = "";
    document.getElementById("fbMessage").value = "";
}

// ────────────────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────
updateAnswerHint();
loadQuizList();
