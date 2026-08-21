// ── app.js ──
// Entry point. Imports all modules and wires up event listeners.
// Nothing complex lives here — just initialization and DOM bindings.

import { updateAnswerHint, addQuestion }   from "./quiz-builder.js";
import { submitQuiz }                       from "./quiz-taker.js";
import { saveQuiz, loadQuizList,
         triggerImport, handleImport,
         checkSharedQuiz }                  from "./quiz-library.js";
import { openExamBuilder, closeExamBuilder,
         buildExam }                        from "./exam-builder.js";
import { initAuth, openAuth, closeAuth,
         switchAuthTab, submitAuth,
         signInWithGoogle, signOut,
         closeGuestWarning }                from "./auth.js";
import { setMode, openChangelog,
         closeChangelog, openFeedback,
         closeFeedback }                    from "./ui.js";

// DOM EVENT LISTENERS
// Replace all onclick="" attributes with proper listeners here

// Header — mode toggle
document.getElementById("btnEdit").addEventListener("click", () => setMode("edit"));
document.getElementById("btnTake").addEventListener("click", () => setMode("take"));

// Header — theme toggle
document.querySelector(".theme-toggle").addEventListener("click", () =>
    document.body.classList.toggle("dark"));

// Header — auth
document.getElementById("signInBtn").addEventListener("click", () => openAuth("signin"));
document.getElementById("signOutBtn").addEventListener("click", signOut);

// Auth modal
document.getElementById("authSubmitBtn").addEventListener("click", submitAuth);
document.getElementById("googleSignInBtn").addEventListener("click", signInWithGoogle);
document.getElementById("closeAuthBtn").addEventListener("click", closeAuth);
document.querySelectorAll(".auth-tab").forEach((btn, i) => {
    btn.addEventListener("click", () => switchAuthTab(i === 0 ? "signin" : "signup"));
});

// Guest warning modal
document.getElementById("continueGuestBtn").addEventListener("click", closeGuestWarning);
document.getElementById("guestSignInBtn").addEventListener("click", () => {
    closeGuestWarning();
    openAuth("signin");
});

// Quiz builder
document.getElementById("qType").addEventListener("change", updateAnswerHint);
document.getElementById("addQuestionBtn").addEventListener("click", addQuestion);
document.getElementById("saveQuizBtn").addEventListener("click", saveQuiz);

// Take mode
document.getElementById("submitQuizBtn").addEventListener("click", submitQuiz);

// Library — import
document.getElementById("importBtn").addEventListener("click", triggerImport);
document.getElementById("importFileInput").addEventListener("change", handleImport);

// Exam builder
document.getElementById("buildExamBtn").addEventListener("click", openExamBuilder);
document.getElementById("buildExamSubmitBtn").addEventListener("click", buildExam);
document.getElementById("closeExamBtn").addEventListener("click", closeExamBuilder);

// Changelog
document.getElementById("changelogBtn").addEventListener("click", openChangelog);
document.getElementById("closeChangelogBtn").addEventListener("click", closeChangelog);
document.querySelector(".version-badge").addEventListener("click", openChangelog);

// Feedback
document.getElementById("feedbackBtn").addEventListener("click", openFeedback);
document.getElementById("closeFeedbackBtn").addEventListener("click", closeFeedback);

// INIT
updateAnswerHint();
initAuth();
checkSharedQuiz();
loadQuizList();
