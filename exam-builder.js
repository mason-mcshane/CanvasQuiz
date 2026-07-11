// ── exam-builder.js ──
// Handles the combined exam builder: selecting quizzes, distributing
// questions evenly, and saving the result as a new quiz.

import { db, state, showToast } from "./state.js";
import { loadQuizList } from "./quiz-library.js";

// ── Open the exam builder modal ──
export function openExamBuilder() {
    const checked = [...document.querySelectorAll(".exam-check:checked")];
    if (checked.length < 2) {
        showToast("Select at least 2 quizzes to build an exam.");
        return;
    }

    document.getElementById("examSelectedNames").textContent =
        `Selected: ${checked.map(c => c.dataset.title).join(", ")}`;
    document.getElementById("examQuestionCount").value = "";
    document.getElementById("examTitle").value         = "";
    document.getElementById("examError").textContent   = "";
    document.getElementById("examModal").style.display = "flex";
}

export function closeExamBuilder() {
    document.getElementById("examModal").style.display = "none";
}

// ── Build and save the combined exam ──
export async function buildExam() {
    const checked = [...document.querySelectorAll(".exam-check:checked")];
    const total   = parseInt(document.getElementById("examQuestionCount").value);
    const title   = document.getElementById("examTitle").value.trim();
    const errEl   = document.getElementById("examError");
    errEl.textContent = "";

    if (!title)           { errEl.textContent = "Please enter a title for the exam."; return; }
    if (!total || total < 1) { errEl.textContent = "Please enter a valid question count."; return; }
    if (checked.length < 2)  { errEl.textContent = "Select at least 2 quizzes."; return; }

    // Load questions from each selected quiz, tagging each with source title
    const groups = [];
    for (const checkbox of checked) {
        const { data } = await db
            .from("questions").select("*").eq("quiz_id", Number(checkbox.dataset.id));
        if (data) groups.push({ title: checkbox.dataset.title, questions: data });
    }

    // Distribute as evenly as possible across groups
    // e.g. 15 questions across 4 quizzes → 4 + 4 + 4 + 3
    const n    = groups.length;
    const base = Math.floor(total / n);
    let extra  = total % n;

    const selected = [];
    for (const group of groups) {
        const count    = base + (extra > 0 ? 1 : 0);
        if (extra > 0) extra--;
        // Shuffle within each source quiz but keep groups in order
        const shuffled = [...group.questions].sort(() => Math.random() - 0.5);
        shuffled.slice(0, Math.min(count, shuffled.length)).forEach(q => {
            selected.push({ ...q, sourceQuiz: group.title });
        });
    }

    if (selected.length === 0) {
        errEl.textContent = "No questions found in selected quizzes.";
        return;
    }

    // Save as a new quiz
    const { data: quizRow, error: quizErr } = await db
        .from("quizzes")
        .insert([{ title, user_id: state.currentUser.id, is_public: false }])
        .select().single();

    if (quizErr) { errEl.textContent = "Failed to save exam."; return; }

    const rows = selected.map(q => ({
        quiz_id:   quizRow.id,
        type:      q.type,
        question:  q.question,
        answers:   q.answers,
        correct:   q.correct,
        source_quiz: q.sourceQuiz
    }));

    const { error: qErr } = await db.from("questions").insert(rows);
    if (qErr) { errEl.textContent = "Failed to save exam questions."; return; }

    closeExamBuilder();
    showToast(`Exam "${title}" created with ${selected.length} questions!`);
    loadQuizList();
}
