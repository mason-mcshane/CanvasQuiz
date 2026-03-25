// ── quiz-builder.js ──
// Handles the question builder form: adding, editing, and deleting
// questions from the in-progress quiz, and rendering the edit list.

import { state, splitAnswers, showToast } from "./state.js";

// ── Update answer field hints based on selected question type ──
export function updateAnswerHint() {
    const type         = document.getElementById("qType").value;
    const answersGroup = document.getElementById("answersGroup");
    const correctHint  = document.getElementById("correctHint");
    const answerHint   = document.getElementById("answerHint");
    const qCorrect     = document.getElementById("qCorrect");
    const qAnswers     = document.getElementById("qAnswers");

    if (type === "trueFalse") {
        answersGroup.style.display = "none";
        correctHint.textContent    = "Type:  true  or  false";
        qCorrect.placeholder       = "true";
    } else if (type === "multipleChoice") {
        answersGroup.style.display = "block";
        answerHint.textContent     = "Separate options with \\   e.g.  Paris \\ London \\ Berlin \\ Tokyo";
        correctHint.textContent    = "Enter the NUMBER of the correct option  (1, 2, 3...)";
        qCorrect.placeholder       = "1";
        qAnswers.placeholder       = "Paris \\ London \\ Berlin \\ Tokyo";
    } else if (type === "multipleSelect") {
        answersGroup.style.display = "block";
        answerHint.textContent     = "Separate options with \\   e.g.  Python \\ Java \\ HTML \\ CSS";
        correctHint.textContent    = "Enter the NUMBERS of ALL correct options separated by commas  e.g.  1,3";
        qCorrect.placeholder       = "1,3";
        qAnswers.placeholder       = "Python \\ Java \\ HTML \\ CSS";
    } else if (type === "fillBlank") {
        answersGroup.style.display = "none";
        correctHint.textContent    = "Type the exact correct answer (not case-sensitive)";
        qCorrect.placeholder       = "e.g. photosynthesis";
    } else if (type === "word") {
        answersGroup.style.display = "none";
        correctHint.textContent    = "Type the exact correct word or phrase (not case-sensitive)";
        qCorrect.placeholder       = "e.g. mitochondria";
    }
}

// ── Add a new question to quizData ──
export function addQuestion() {
    const errorEl  = document.getElementById("addError");
    const qType    = document.getElementById("qType");
    const qText    = document.getElementById("qText");
    const qAnswers = document.getElementById("qAnswers");
    const qCorrect = document.getElementById("qCorrect");
    errorEl.textContent = "";

    const type     = qType.value;
    const question = qText.value.trim();
    const answers  = qAnswers.value.trim();
    let   correct  = qCorrect.value.trim();

    if (!question) { errorEl.textContent = "Please enter a question."; return; }
    if (!correct)  { errorEl.textContent = "Please enter the correct answer."; return; }

    if (type === "multipleChoice" || type === "multipleSelect") {
        if (!answers) { errorEl.textContent = "Please enter the answer options."; return; }
        if (splitAnswers(answers).length < 2) {
            errorEl.textContent = "Please enter at least 2 answers separated by \\.";
            return;
        }
    }

    if (type === "multipleChoice") {
        const num = Number(correct) - 1;
        if (isNaN(num) || num < 0) { errorEl.textContent = "Correct answer must be a number."; return; }
        correct = num;
    } else if (type === "multipleSelect") {
        correct = correct.split(",").map(n => Number(n.trim()) - 1);
    } else if (type === "trueFalse") {
        const val = correct.toLowerCase();
        if (val !== "true" && val !== "false") {
            errorEl.textContent = "Please enter \"true\" or \"false\".";
            return;
        }
        correct = val === "true";
    } else {
        correct = correct.toLowerCase();
    }

    state.quizData.push({ type, question, answers, correct });

    qText.value    = "";
    qAnswers.value = "";
    qCorrect.value = "";

    renderEditList();
    showToast("Question added!");
}

// ── Pull a question back into the form for editing ──
export function editQuestion(index) {
    const q        = state.quizData[index];
    const qType    = document.getElementById("qType");
    const qText    = document.getElementById("qText");
    const qAnswers = document.getElementById("qAnswers");
    const qCorrect = document.getElementById("qCorrect");

    qType.value    = q.type;
    updateAnswerHint();
    qText.value    = q.question;
    qAnswers.value = q.answers;

    if (q.type === "multipleChoice")      qCorrect.value = q.correct + 1;
    else if (q.type === "multipleSelect") qCorrect.value = q.correct.map(n => n + 1).join(",");
    else if (q.type === "trueFalse")      qCorrect.value = q.correct ? "true" : "false";
    else                                   qCorrect.value = q.correct;

    state.quizData.splice(index, 1);
    renderEditList();
}

// ── Remove a question ──
export function deleteQuestion(index) {
    state.quizData.splice(index, 1);
    renderEditList();
    showToast("Question deleted.");
}

// ── Render the list of added questions in Edit mode ──
export function renderEditList() {
    const list    = document.getElementById("questionList");
    const saveRow = document.getElementById("saveRow");
    list.innerHTML = "";

    if (state.quizData.length === 0) { saveRow.style.display = "none"; return; }
    saveRow.style.display = "flex";

    const typeLabels = {
        multipleChoice: "Multiple Choice",
        multipleSelect: "Multiple Select",
        trueFalse:      "True / False",
        fillBlank:      "Fill in the Blank",
        word:           "Word Answer"
    };

    state.quizData.forEach((q, i) => {
        const div = document.createElement("div");
        div.className = "q-item";
        div.innerHTML = `
            <div class="q-item-left">
                <div class="q-num">Question ${i + 1}</div>
                <div class="q-text">${q.question}</div>
                <span class="q-type-tag">${typeLabels[q.type] || q.type}</span>
            </div>
            <div class="q-item-actions">
                <button class="btn-icon" data-edit="${i}">Edit</button>
                <button class="btn-icon danger" data-delete="${i}">Delete</button>
            </div>
        `;
        // Use event listeners instead of inline onclick
        div.querySelector("[data-edit]").addEventListener("click", () => editQuestion(i));
        div.querySelector("[data-delete]").addEventListener("click", () => deleteQuestion(i));
        list.appendChild(div);
    });
}
