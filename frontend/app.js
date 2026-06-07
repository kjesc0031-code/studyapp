/**
 * Study App - Frontend Application (Vanilla JavaScript)
 */

// ==================== Configuration ====================

const API_BASE_URL = window.API_BASE_URL ?? (
    window.location.protocol === "file:" ? "http://localhost:8080" : ""
);

// ==================== DOM Elements ====================

const homeBtn = document.getElementById('homeBtn');
const statsBtn = document.getElementById('statsBtn');
const adminBtn = document.getElementById('adminBtn');
const backBtn = document.getElementById('backBtn');

const homeScreen = document.getElementById('homeScreen');
const quizScreen = document.getElementById('quizScreen');
const statsScreen = document.getElementById('statsScreen');
const adminScreen = document.getElementById('adminScreen');

const examList = document.getElementById('examList');
const questionList = document.getElementById('questionList');
const statsCard = document.getElementById('statsCard');
const examStats = document.getElementById('examStats');
const examTitle = document.getElementById('examTitle');

const errorContainer = document.getElementById('errorContainer');

const examForm = document.getElementById('examForm');
const tagForm = document.getElementById('tagForm');
const questionForm = document.getElementById('questionForm');
const refreshExamsBtn = document.getElementById('refreshExamsBtn');
const tagExamSelect = document.getElementById('tagExamSelect');
const questionExamSelect = document.getElementById('questionExamSelect');
const questionTagCheckboxes = document.getElementById('questionTagCheckboxes');

// ==================== State Management ====================

let currentExamId = null;
let currentExams = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let answeredQuestions = new Set();

// ==================== Navigation ====================

function showScreen(screen) {
    homeScreen.classList.remove('active');
    quizScreen.classList.remove('active');
    statsScreen.classList.remove('active');
    adminScreen.classList.remove('active');

    homeBtn.classList.remove('active');
    statsBtn.classList.remove('active');
    adminBtn.classList.remove('active');

    if (screen === 'home') {
        homeScreen.classList.add('active');
        homeBtn.classList.add('active');
    } else if (screen === 'quiz') {
        quizScreen.classList.add('active');
    } else if (screen === 'stats') {
        statsScreen.classList.add('active');
        statsBtn.classList.add('active');
    } else if (screen === 'admin') {
        adminScreen.classList.add('active');
        adminBtn.classList.add('active');
    }
}

homeBtn.addEventListener('click', () => {
    showScreen('home');
    currentExamId = null;
    currentQuestionIndex = 0;
    answeredQuestions.clear();
});

statsBtn.addEventListener('click', () => {
    showScreen('stats');
    loadExamStats();
});

adminBtn.addEventListener('click', () => {
    showScreen('admin');
    loadAdminExamSelects();
});

backBtn.addEventListener('click', () => {
    showScreen('home');
    currentExamId = null;
    currentQuestionIndex = 0;
    answeredQuestions.clear();
});

refreshExamsBtn.addEventListener('click', () => {
    loadExams();
    loadAdminExamSelects();
});

// ==================== Error Handling ====================

function showError(message) {
    console.error(message);
    errorContainer.textContent = message;
    errorContainer.classList.add('show');

    setTimeout(() => {
        errorContainer.classList.remove('show');
    }, 5000);
}

function showFormMsg(element, message, isSuccess) {
    element.textContent = message;
    element.className = isSuccess ? 'form-msg success' : 'form-msg error';
}

// ==================== API Helpers ====================

async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            let detail = res.statusText;
            try {
                const body = await res.json();
                detail = body.detail || detail;
                if (Array.isArray(detail)) {
                    detail = detail.map(d => d.msg || JSON.stringify(d)).join(', ');
                }
            } catch (_) { /* ignore */ }
            return { ok: false, error: detail };
        }
        if (res.status === 204) {
            return { ok: true, data: null };
        }
        const data = await res.json();
        return { ok: true, data };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

// ==================== API Functions ====================

async function fetchExams() {
    const result = await apiFetch(`${API_BASE_URL}/exams/`);
    if (!result.ok) {
        showError(`試験の取得に失敗しました: ${result.error}`);
    }
    return result;
}

async function fetchQuestions(examId) {
    const result = await apiFetch(`${API_BASE_URL}/questions/?exam_id=${examId}`);
    if (!result.ok) {
        showError(`問題の取得に失敗しました: ${result.error}`);
    }
    return result;
}

async function fetchStats(examId) {
    const result = await apiFetch(`${API_BASE_URL}/stats/overall?exam_id=${examId}`);
    if (!result.ok) {
        showError(`統計情報の取得に失敗しました: ${result.error}`);
        return result;
    }
    const data = result.data;
    return {
        ok: true,
        data: {
            total_questions: data.total || 0,
            correct_answers: data.correct || 0,
            correct_rate: data.accuracy || 0
        }
    };
}

async function fetchTagStats(examId) {
    const result = await apiFetch(`${API_BASE_URL}/stats/by-tag?exam_id=${examId}`);
    if (!result.ok) {
        showError(`分野別統計の取得に失敗しました: ${result.error}`);
        return result;
    }
    const data = result.data.map(item => ({
        tag_name: item.tag,
        correct_rate: item.accuracy,
        correct_answers: item.correct,
        total_questions: item.total
    }));
    return { ok: true, data };
}

async function fetchTags(examId) {
    const result = await apiFetch(`${API_BASE_URL}/tags/?exam_id=${examId}`);
    if (!result.ok) {
        showError(`タグの取得に失敗しました: ${result.error}`);
    }
    return result;
}

async function submitAnswer(questionId, selectedAnswer) {
    const result = await apiFetch(`${API_BASE_URL}/answers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer }),
    });
    if (!result.ok) {
        showError(`回答の送信に失敗しました: ${result.error}`);
    }
    return result;
}

async function createExam(title, description) {
    return apiFetch(`${API_BASE_URL}/exams/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null }),
    });
}

async function createTag(examId, name) {
    return apiFetch(`${API_BASE_URL}/tags/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId, name }),
    });
}

async function createQuestion(payload) {
    return apiFetch(`${API_BASE_URL}/questions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

// ==================== UI Rendering - Home Screen ====================

async function loadExams() {
    examList.innerHTML = '<div class="loading">試験を読込中...</div>';
    const result = await fetchExams();

    if (!result.ok) {
        examList.innerHTML = '<div class="error-state">読み込みに失敗しました。再読み込みしてください。</div>';
        return;
    }

    const exams = result.data;
    currentExams = exams;

    if (exams.length === 0) {
        examList.innerHTML = '<div class="empty-state">試験がまだ登録されていません</div>';
        return;
    }

    examList.innerHTML = exams.map(exam => `
        <button type="button" class="exam-card" onclick="startQuiz(${exam.id})">
            <h2>${escapeHtml(exam.title)}</h2>
            <p class="exam-id">試験ID: ${exam.id}</p>
            <p class="click-hint">クリックして学習を開始</p>
        </button>
    `).join('');
}

// ==================== UI Rendering - Quiz Screen ====================

async function startQuiz(examId) {
    currentExamId = examId;
    currentQuestionIndex = 0;
    answeredQuestions.clear();

    const exam = currentExams.find(e => e.id === examId);
    if (!exam) return;

    examTitle.textContent = exam.title;
    showScreen('quiz');

    const [questionsResult, statsResult] = await Promise.all([
        fetchQuestions(examId),
        fetchStats(examId),
    ]);

    if (!questionsResult.ok) {
        questionList.innerHTML = '<div class="error-state">読み込みに失敗しました。再読み込みしてください。</div>';
        return;
    }

    currentQuestions = questionsResult.data;

    if (statsResult.ok && statsResult.data) {
        renderStatsCard(statsResult.data);
    }

    if (currentQuestions.length === 0) {
        questionList.innerHTML = '<div class="empty-state">この試験に問題がまだ登録されていません</div>';
        return;
    }

    renderCurrentQuestion();
}

function renderStatsCard(stats) {
    const correctRate = (stats.correct_rate * 100).toFixed(1);
    statsCard.innerHTML = `
        <div class="stats-card-content">
            正答率: ${correctRate}% (${stats.correct_answers}/${stats.total_questions})
        </div>
        <div class="stats-card-detail">
            ${stats.total_questions}問中${stats.correct_answers}問正解
        </div>
    `;
}

function renderCurrentQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        renderQuizComplete();
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    const totalQuestions = currentQuestions.length;
    const currentNum = currentQuestionIndex + 1;

    const questionHTML = `
        <div class="quiz-progress">
            <p class="quiz-progress-label">問題 ${currentNum}/${totalQuestions}</p>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${(currentNum / totalQuestions) * 100}%;"></div>
            </div>
        </div>

        <div class="question-card">
            <div class="question-text">${escapeHtml(q.title)}</div>

            <div class="options" id="options-${q.id}">
                ${q.choices.map((choice) => `
                    <button type="button" class="option-btn" data-choice="${escapeAttr(choice)}"
                        onclick="handleAnswer(${q.id}, this)">
                        ${escapeHtml(choice)}
                    </button>
                `).join('')}
            </div>

            <div class="explanation" style="display: none;" id="explanation-${q.id}">
                <div id="feedback-${q.id}" class="feedback" aria-live="polite"></div>
                <div class="explanation-title">正答: ${escapeHtml(q.correct_answer)}</div>
                <div class="explanation-text">${escapeHtml(q.explanation)}</div>
                ${q.tags && q.tags.length > 0 ? `
                    <div class="tags">
                        ${q.tags.map(tag => `<span class="tag">${escapeHtml(tag.name)}</span>`).join('')}
                    </div>
                ` : ''}
                <button type="button" onclick="nextQuestion()" class="btn-primary next-btn">
                    次の問題へ →
                </button>
            </div>
        </div>
    `;

    questionList.innerHTML = questionHTML;
}

async function handleAnswer(questionId, buttonEl) {
    if (answeredQuestions.has(questionId)) return;

    const selectedAnswer = buttonEl.dataset.choice;
    const result = await submitAnswer(questionId, selectedAnswer);

    if (!result.ok) return;

    answeredQuestions.add(questionId);
    const isCorrect = result.data.is_correct;

    document.querySelectorAll(`#options-${questionId} .option-btn`).forEach(btn => {
        btn.disabled = true;
        btn.classList.add('answered');
        if (btn.dataset.choice === selectedAnswer) {
            btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
    });

    if (currentExamId) {
        const statsResult = await fetchStats(currentExamId);
        if (statsResult.ok && statsResult.data) {
            renderStatsCard(statsResult.data);
        }
    }

    const q = currentQuestions[currentQuestionIndex];
    const explanationEl = document.getElementById(`explanation-${q.id}`);
    const feedbackEl = document.getElementById(`feedback-${q.id}`);

    if (explanationEl) {
        explanationEl.style.display = 'block';
    }
    if (feedbackEl) {
        feedbackEl.className = isCorrect ? 'feedback feedback-correct' : 'feedback feedback-incorrect';
        feedbackEl.textContent = isCorrect ? '✔ 正解！' : '✗ 不正解です';
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    renderCurrentQuestion();
}

function renderQuizComplete() {
    questionList.innerHTML = `
        <div class="quiz-complete">
            <h2>すべての問題が完了しました！</h2>
            <p>学習お疲れ様でした。</p>
            <div class="quiz-complete-actions">
                <button type="button" onclick="startQuiz(${currentExamId})" class="btn-primary">
                    もう一度やる
                </button>
                <button type="button" onclick="showScreen('home');" class="btn-secondary">
                    ホームに戻る
                </button>
            </div>
        </div>
    `;
}

// ==================== UI Rendering - Stats Screen ====================

async function loadExamStats() {
    examStats.innerHTML = '<div class="loading">統計を読込中...</div>';
    const examsResult = await fetchExams();

    if (!examsResult.ok) {
        examStats.innerHTML = '<div class="error-state">読み込みに失敗しました。再読み込みしてください。</div>';
        return;
    }

    const exams = examsResult.data;
    if (exams.length === 0) {
        examStats.innerHTML = '<div class="empty-state">試験がまだ登録されていません</div>';
        return;
    }

    const allData = await Promise.all(
        exams.map(async (exam) => {
            const [statsResult, tagStatsResult] = await Promise.all([
                fetchStats(exam.id),
                fetchTagStats(exam.id),
            ]);
            return { exam, statsResult, tagStatsResult };
        })
    );

    const validData = allData.filter(item => item.statsResult.ok && item.statsResult.data !== null);

    if (validData.length === 0) {
        examStats.innerHTML = '<div class="error-state">統計の読み込みに失敗しました。</div>';
        return;
    }

    examStats.innerHTML = validData.map(item => {
        const { exam, statsResult, tagStatsResult } = item;
        const stats = statsResult.data;
        const correctRate = (stats.correct_rate * 100).toFixed(1);
        const tagStats = tagStatsResult.ok ? tagStatsResult.data : [];

        const tagTable = tagStats.length > 0
            ? `
                <table class="tag-stats-table">
                    <thead>
                        <tr>
                            <th>タグ</th>
                            <th>正答率</th>
                            <th>正解数</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tagStats.map(tag => `
                            <tr>
                                <td>${escapeHtml(tag.tag_name)}</td>
                                <td>${(tag.correct_rate * 100).toFixed(1)}%</td>
                                <td>${tag.correct_answers}/${tag.total_questions}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `
            : '<p class="tag-stats-empty">タグ別データなし</p>';

        return `
            <div class="stat-card">
                <div class="stat-title">${escapeHtml(exam.title)}</div>
                <div class="stat-content">
                    <div class="stat-row">
                        <span class="stat-label">正答率</span>
                        <span class="stat-value">${correctRate}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">正解数</span>
                        <span class="stat-value">${stats.correct_answers}/${stats.total_questions}</span>
                    </div>
                </div>
                <div class="tag-stats-section">
                    <h3 class="tag-stats-heading">タグ別正答率</h3>
                    ${tagTable}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== Admin Screen ====================

async function loadAdminExamSelects() {
    const result = await fetchExams();
    const selects = [tagExamSelect, questionExamSelect];

    if (!result.ok) {
        selects.forEach(sel => {
            sel.innerHTML = '<option value="">読み込み失敗</option>';
        });
        return;
    }

    const exams = result.data;
    currentExams = exams;

    const options = exams.length === 0
        ? '<option value="">試験がありません</option>'
        : exams.map(e => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('');

    selects.forEach(sel => {
        sel.innerHTML = options;
    });

    if (exams.length > 0) {
        await loadQuestionTagCheckboxes(parseInt(questionExamSelect.value, 10));
    } else {
        questionTagCheckboxes.innerHTML = '<p class="hint-text">先に試験を作成してください</p>';
    }
}

async function loadQuestionTagCheckboxes(examId) {
    if (!examId) {
        questionTagCheckboxes.innerHTML = '<p class="hint-text">試験を選択するとタグが表示されます</p>';
        return;
    }

    const result = await fetchTags(examId);
    if (!result.ok) {
        questionTagCheckboxes.innerHTML = '<p class="hint-text">タグの読み込みに失敗しました</p>';
        return;
    }

    const tags = result.data;
    if (tags.length === 0) {
        questionTagCheckboxes.innerHTML = '<p class="hint-text">この試験にタグがありません</p>';
        return;
    }

    questionTagCheckboxes.innerHTML = tags.map(tag => `
        <label class="tag-checkbox-label">
            <input type="checkbox" name="questionTags" value="${tag.id}">
            ${escapeHtml(tag.name)}
        </label>
    `).join('');
}

questionExamSelect.addEventListener('change', () => {
    const examId = parseInt(questionExamSelect.value, 10);
    loadQuestionTagCheckboxes(examId);
});

examForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('examFormMsg');
    const title = document.getElementById('examTitleInput').value.trim();
    const description = document.getElementById('examDescInput').value.trim();

    const result = await createExam(title, description);
    if (result.ok) {
        showFormMsg(msgEl, '試験を作成しました', true);
        examForm.reset();
        await loadAdminExamSelects();
        await loadExams();
    } else {
        showFormMsg(msgEl, `作成に失敗しました: ${result.error}`, false);
    }
});

tagForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('tagFormMsg');
    const examId = parseInt(tagExamSelect.value, 10);
    const name = document.getElementById('tagNameInput').value.trim();

    const result = await createTag(examId, name);
    if (result.ok) {
        showFormMsg(msgEl, 'タグを作成しました', true);
        tagForm.reset();
        if (parseInt(questionExamSelect.value, 10) === examId) {
            await loadQuestionTagCheckboxes(examId);
        }
    } else {
        showFormMsg(msgEl, `作成に失敗しました: ${result.error}`, false);
    }
});

questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('questionFormMsg');
    const examId = parseInt(questionExamSelect.value, 10);
    const title = document.getElementById('questionTitleInput').value.trim();
    const choicesText = document.getElementById('questionChoicesInput').value.trim();
    const correctAnswer = document.getElementById('questionCorrectInput').value.trim();
    const explanation = document.getElementById('questionExplanationInput').value.trim();

    const choices = choicesText.split('\n').map(c => c.trim()).filter(c => c.length > 0);
    if (choices.length < 2) {
        showFormMsg(msgEl, '選択肢は2つ以上入力してください', false);
        return;
    }

    const tagIds = Array.from(
        questionTagCheckboxes.querySelectorAll('input[name="questionTags"]:checked')
    ).map(cb => parseInt(cb.value, 10));

    const result = await createQuestion({
        exam_id: examId,
        title,
        choices,
        correct_answer: correctAnswer,
        explanation,
        tag_ids: tagIds,
    });

    if (result.ok) {
        showFormMsg(msgEl, '問題を作成しました', true);
        questionForm.reset();
        await loadQuestionTagCheckboxes(examId);
    } else {
        showFormMsg(msgEl, `作成に失敗しました: ${result.error}`, false);
    }
});

// ==================== Utility Functions ====================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;');
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
    loadExams();
});
