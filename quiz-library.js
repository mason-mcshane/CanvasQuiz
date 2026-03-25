// ── quiz-library.js ──
// Manages the quiz library: saving, loading, deleting, locking,
// exporting, and importing quizzes from/to Supabase.

import { db, state, showToast } from "./state.js";
import { setMode } from "./ui.js";
import { openAuth } from "./auth.js";

// ── Save current quizData as a new quiz in Supabase ──
export async function saveQuiz() {
    if (!state.currentUser) {
        openAuth("signin");
        showToast("Please sign in to save quizzes.");
        return;
    }

    const title    = document.getElementById("quizTitle").value.trim();
    const isPublic = document.getElementById("isPublic").checked;

    if (!title)                   { showToast("Please enter a quiz title first."); return; }
    if (state.quizData.length === 0) { showToast("Add at least one question first."); return; }

    const { data: quizRow, error: quizErr } = await db
        .from("quizzes")
        .insert([{ title, user_id: state.currentUser.id, is_public: isPublic }])
        .select()
        .single();

    if (quizErr) { showToast("Error saving quiz."); console.error(quizErr); return; }

    const rows = state.quizData.map(q => ({
        quiz_id:  quizRow.id,
        type:     q.type,
        question: q.question,
        answers:  q.answers,
        correct:  JSON.stringify(q.correct)
    }));

    const { error: qErr } = await db.from("questions").insert(rows);
    if (qErr) { showToast("Questions failed to save."); console.error(qErr); return; }

    showToast("Quiz saved!");
    loadQuizList();
}

// ── Fetch and render the user's quiz library ──
export async function loadQuizList() {
    const list  = document.getElementById("quizList");
    const empty = document.getElementById("libraryEmpty");
    list.innerHTML = "";

    if (!state.currentUser) {
        empty.style.display  = "block";
        empty.textContent    = "Sign in to see your saved quizzes.";
        document.getElementById("examBuilderRow").style.display = "none";
        return;
    }

    const { data, error } = await db
        .from("quizzes")
        .select("id, title, created_at, is_public, is_locked")
        .eq("user_id", state.currentUser.id)
        .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
        empty.style.display = "block";
        empty.textContent   = "No saved quizzes yet — build one above and save it!";
        document.getElementById("examBuilderRow").style.display = "none";
        return;
    }

    empty.style.display = "none";
    document.getElementById("examBuilderRow").style.display =
        data.length >= 2 ? "flex" : "none";

    data.forEach(quiz => {
        const card       = document.createElement("div");
        card.className   = "quiz-card" + (quiz.is_locked ? " locked" : "");
        const date       = new Date(quiz.created_at).toLocaleDateString();
        const safeTitle  = quiz.title.replace(/'/g, "\\'");
        const publicBadge = quiz.is_public
            ? `<span class="public-badge">Public</span>` : "";
        const lockBadge   = quiz.is_locked
            ? `<span class="lock-badge">🔒 Locked</span>` : "";
        const shareBtn    = quiz.is_public
            ? `<button class="btn-icon share" data-share="${quiz.id}">Share</button>` : "";

        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                <input type="checkbox" class="exam-check"
                    data-id="${quiz.id}" data-title="${safeTitle}"
                    style="accent-color:var(--accent);width:15px;height:15px;flex-shrink:0;">
                <div style="min-width:0;">
                    <div class="quiz-card-title">${quiz.title}</div>
                    <div class="quiz-card-meta">Saved ${date} ${publicBadge} ${lockBadge}</div>
                </div>
            </div>
            <div class="quiz-card-actions">
                ${shareBtn}
                <button class="btn-icon" data-export="${quiz.id}" data-export-title="${safeTitle}">Export</button>
                <button class="btn-icon" data-load="${quiz.id}" data-load-title="${safeTitle}">Load</button>
                <button class="btn-icon" data-lock="${quiz.id}" data-locked="${quiz.is_locked}"
                    title="${quiz.is_locked ? "Unlock" : "Lock"}">
                    ${quiz.is_locked ? "🔓" : "🔒"}
                </button>
                <button class="btn-icon danger" data-delete="${quiz.id}" data-delete-title="${safeTitle}"
                    ${quiz.is_locked ? 'data-locked-del="true"' : ""}>Delete</button>
            </div>
        `;

        // Attach event listeners — no inline onclick needed
        const actions = card.querySelector(".quiz-card-actions");

        actions.querySelector("[data-load]")?.addEventListener("click", () =>
            loadQuiz(quiz.id, quiz.title));

        actions.querySelector("[data-export]")?.addEventListener("click", () =>
            exportQuiz(quiz.id, quiz.title));

        actions.querySelector("[data-lock]")?.addEventListener("click", () =>
            toggleLock(quiz.id, quiz.is_locked));

        actions.querySelector("[data-share]")?.addEventListener("click", () =>
            copyShareLink(quiz.id));

        actions.querySelector("[data-delete]")?.addEventListener("click", () => {
            if (quiz.is_locked) {
                showToast("This quiz is locked. Unlock it first.");
            } else {
                deleteQuiz(quiz.id, quiz.title);
            }
        });

        list.appendChild(card);
    });
}

// ── Load a quiz into Take mode ──
export async function loadQuiz(id, title) {
    const { data, error } = await db
        .from("questions").select("*").eq("quiz_id", id);
    if (error || !data) { showToast("Failed to load quiz."); return; }

    state.quizData = data.map(q => ({
        type:     q.type,
        question: q.question,
        answers:  q.answers,
        correct:  JSON.parse(q.correct)
    }));

    state.currentQuizId    = id;
    state.currentQuizTitle = title;

    document.getElementById("takeTitleDisplay").textContent = title;
    document.getElementById("takeSubtitle").textContent =
        `${state.quizData.length} question${state.quizData.length !== 1 ? "s" : ""}`;
    document.getElementById("results").style.display = "none";

    setMode("take");
    showToast(`Loaded "${title}"`);
}

// ── Delete a quiz ──
export async function deleteQuiz(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    await db.from("questions").delete().eq("quiz_id", id);
    await db.from("quizzes").delete().eq("id", id);
    showToast("Quiz deleted.");
    loadQuizList();
}

// ── Toggle lock on a quiz ──
export async function toggleLock(id, currentlyLocked) {
    const { error } = await db
        .from("quizzes")
        .update({ is_locked: !currentlyLocked })
        .eq("id", id);
    if (error) { showToast("Failed to update lock."); return; }
    showToast(currentlyLocked ? "Quiz unlocked." : "Quiz locked.");
    loadQuizList();
}

// ── Export a quiz as a .json file ──
export async function exportQuiz(id, title) {
    const { data, error } = await db.from("questions").select("*").eq("quiz_id", id);
    if (error || !data) { showToast("Failed to export quiz."); return; }

    const exportData = {
        title,
        exported_at: new Date().toISOString(),
        questions: data.map(q => ({
            type:     q.type,
            question: q.question,
            answers:  q.answers,
            correct:  q.correct
        }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${title}"!`);
}

// ── Trigger file picker for import ──
export function triggerImport() {
    document.getElementById("importFileInput").click();
}

// ── Handle imported .json file ──
export async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!state.currentUser) { showToast("Please sign in to import quizzes."); return; }

    let parsed;
    try { parsed = JSON.parse(await file.text()); }
    catch { showToast("Invalid file format."); return; }

    if (!parsed.title || !parsed.questions) { showToast("Invalid quiz file."); return; }

    const title = parsed.title + " (imported)";
    const { data: quizRow, error: quizErr } = await db
        .from("quizzes")
        .insert([{ title, user_id: state.currentUser.id, is_public: false }])
        .select().single();

    if (quizErr) { showToast("Import failed."); return; }

    const rows = parsed.questions.map(q => ({
        quiz_id:  quizRow.id,
        type:     q.type,
        question: q.question,
        answers:  q.answers,
        correct:  q.correct
    }));

    const { error: qErr } = await db.from("questions").insert(rows);
    if (qErr) { showToast("Questions failed to import."); return; }

    showToast(`Imported "${title}"!`);
    event.target.value = "";
    loadQuizList();
}

// ── Copy a share link for a public quiz ──
export function copyShareLink(id) {
    const url = `${window.location.origin}?quiz=${id}`;
    navigator.clipboard.writeText(url).then(() => showToast("Share link copied!"));
}

// ── Load a quiz from a ?quiz= URL param (shared links) ──
export async function checkSharedQuiz() {
    const quizId = new URLSearchParams(window.location.search).get("quiz");
    if (!quizId) return;

    const { data, error } = await db
        .from("quizzes")
        .select("id, title, is_public")
        .eq("id", quizId)
        .single();

    if (error || !data || !data.is_public) {
        showToast("Quiz not found or not public.");
        return;
    }

    loadQuiz(data.id, data.title);
}
