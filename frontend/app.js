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
const csvImportForm = document.getElementById('csvImportForm');
const refreshExamsBtn = document.getElementById('refreshExamsBtn');
const tagExamSelect = document.getElementById('tagExamSelect');
const questionExamSelect = document.getElementById('questionExamSelect');
const csvExamSelect = document.getElementById('csvExamSelect');
const questionTagCheckboxes = document.getElementById('questionTagCheckboxes');
const deleteExamList = document.getElementById('deleteExamList');
const deleteExamMsg = document.getElementById('deleteExamMsg');
const deleteExamModal = document.getElementById('deleteExamModal');
const deleteExamModalBody = document.getElementById('deleteExamModalBody');
const deleteExamCancelBtn = document.getElementById('deleteExamCancelBtn');
const deleteExamConfirmBtn = document.getElementById('deleteExamConfirmBtn');
const deleteQuestionModal = document.getElementById('deleteQuestionModal');
const deleteQuestionModalTitle = document.getElementById('deleteQuestionModalTitle');
const deleteQuestionModalBody = document.getElementById('deleteQuestionModalBody');
const deleteQuestionModalWarning = document.getElementById('deleteQuestionModalWarning');
const deleteQuestionCancelBtn = document.getElementById('deleteQuestionCancelBtn');
const deleteQuestionNextBtn = document.getElementById('deleteQuestionNextBtn');
const deleteQuestionConfirmBtn = document.getElementById('deleteQuestionConfirmBtn');

// ==================== State Management ====================

let currentExamId = null;
let currentExams = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let answeredQuestions = new Set();
let pendingDeleteExam = null;
let pendingDeleteQuestion = null;
let deleteQuestionStep = 1;
let isQuestionOverviewOpen = false;

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
    const result = await apiFetch(`${API_BASE_URL}/questions/?exam_id=${examId}&order=study`);
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

async function deleteExam(examId) {
    return apiFetch(`${API_BASE_URL}/exams/${examId}`, {
        method: 'DELETE',
    });
}

async function deleteQuestion(questionId) {
    return apiFetch(`${API_BASE_URL}/questions/${questionId}`, {
        method: 'DELETE',
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

async function importQuestionsCsv(examId, file) {
    const formData = new FormData();
    formData.append('exam_id', String(examId));
    formData.append('file', file);
    return apiFetch(`${API_BASE_URL}/questions/import`, {
        method: 'POST',
        body: formData,
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
    isQuestionOverviewOpen = false;

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

function getStudyStatus(study) {
    return study?.status ?? 'unanswered';
}

function renderStudyBadge(study) {
    const status = getStudyStatus(study);
    if (status === 'mastered') {
        return '';
    }

    const labels = {
        unanswered: '未回答',
        weak: '苦手',
    };

    let detail = '';
    if (status === 'weak') {
        detail = `不正解 ${study.wrong_count}回 / ${study.attempt_count}回挑戦`;
    } else {
        detail = 'まだ回答していません';
    }

    const suffix = status === 'weak' ? ` (${study.wrong_count})` : '';
    return `
        <span class="study-badge study-badge-${status}" title="${escapeAttr(detail)}">
            ${labels[status]}${suffix}
        </span>
    `;
}

function renderQuestionOverviewItems(questions, currentIndex) {
    return questions.map((q, index) => {
        const status = getStudyStatus(q.study);
        const isCurrent = index === currentIndex;
        return `
            <div class="question-overview-item${isCurrent ? ' is-current' : ''}${status === 'weak' ? ' is-weak' : ''}${status === 'unanswered' ? ' is-unanswered' : ''}">
                <span class="question-overview-num">Q${index + 1}</span>
                ${renderStudyBadge(q.study)}
            </div>
        `;
    }).join('');
}

function getOverviewSummary(questions) {
    let unanswered = 0;
    let weak = 0;
    for (const q of questions) {
        const status = getStudyStatus(q.study);
        if (status === 'unanswered') unanswered += 1;
        else if (status === 'weak') weak += 1;
    }

    const parts = [];
    if (unanswered > 0) parts.push(`未回答 ${unanswered}`);
    if (weak > 0) parts.push(`苦手 ${weak}`);
    return parts.length > 0 ? `（${parts.join(' / ')}）` : '';
}

function renderQuestionOverview(questions, currentIndex) {
    const summary = getOverviewSummary(questions);
    return `
        <details class="question-overview"${isQuestionOverviewOpen ? ' open' : ''}>
            <summary class="question-overview-toggle">
                問題一覧${summary}
            </summary>
            <div class="question-overview-list" id="questionOverviewList">
                ${renderQuestionOverviewItems(questions, currentIndex)}
            </div>
        </details>
    `;
}

function bindQuestionOverviewToggle() {
    const details = document.querySelector('#questionOverview details');
    if (!details) return;

    details.open = isQuestionOverviewOpen;
    details.addEventListener('toggle', () => {
        isQuestionOverviewOpen = details.open;
    });
}

function updateQuestionOverview() {
    const listEl = document.getElementById('questionOverviewList');
    const summaryEl = document.querySelector('#questionOverview summary');
    if (!listEl) return;

    listEl.innerHTML = renderQuestionOverviewItems(currentQuestions, currentQuestionIndex);
    if (summaryEl) {
        summaryEl.textContent = `問題一覧${getOverviewSummary(currentQuestions)}`;
    }
}

function applyAnswerToStudy(study, isCorrect) {
    const next = {
        status: study?.status ?? 'unanswered',
        attempt_count: study?.attempt_count ?? 0,
        wrong_count: study?.wrong_count ?? 0,
        last_is_correct: study?.last_is_correct ?? null,
    };

    next.attempt_count += 1;
    if (!isCorrect) {
        next.wrong_count += 1;
    }
    next.last_is_correct = isCorrect;
    next.status = next.wrong_count > 0 ? 'weak' : 'mastered';
    return next;
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
    const studyStatus = getStudyStatus(q.study);

    const questionHTML = `
        <div id="questionOverview">${renderQuestionOverview(currentQuestions, currentQuestionIndex)}</div>

        <div class="quiz-progress">
            <p class="quiz-progress-label">問題 ${currentNum}/${totalQuestions}</p>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${(currentNum / totalQuestions) * 100}%;"></div>
            </div>
        </div>

        <div class="question-card status-${studyStatus}">
            <div class="question-card-header">
                ${renderStudyBadge(q.study)}
                ${q.study?.status === 'weak' ? `
                    <span class="study-detail">不正解 ${q.study.wrong_count}回 / ${q.study.attempt_count}回挑戦</span>
                ` : ''}
            </div>
            ${q.description ? `<div class="question-context">${escapeHtml(q.description)}</div>` : ''}
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

            <div class="question-drop-actions">
                <button type="button" class="btn-drop" onclick="openDeleteQuestionModal(${q.id})">
                    この問題をドロップ
                </button>
            </div>
        </div>
    `;

    questionList.innerHTML = questionHTML;
    bindQuestionOverviewToggle();
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

    const q = currentQuestions[currentQuestionIndex];
    q.study = applyAnswerToStudy(q.study, isCorrect);

    if (currentExamId) {
        const statsResult = await fetchStats(currentExamId);
        if (statsResult.ok && statsResult.data) {
            renderStatsCard(statsResult.data);
        }
    }

    updateQuestionOverview();

    const cardHeader = document.querySelector('.question-card-header');
    if (cardHeader) {
        cardHeader.innerHTML = `
            ${renderStudyBadge(q.study)}
            ${q.study?.status === 'weak' ? `
                <span class="study-detail">不正解 ${q.study.wrong_count}回 / ${q.study.attempt_count}回挑戦</span>
            ` : ''}
        `;
    }

    const card = document.querySelector('.question-card');
    if (card) {
        card.className = `question-card status-${getStudyStatus(q.study)}`;
    }

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
    const selects = [tagExamSelect, questionExamSelect, csvExamSelect];

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

    await loadDeleteExamList(exams);
}

async function loadDeleteExamList(exams) {
    if (!exams) {
        deleteExamList.innerHTML = '<div class="loading">試験を読込中...</div>';
        const result = await fetchExams();
        if (!result.ok) {
            deleteExamList.innerHTML = '<p class="hint-text">読み込みに失敗しました</p>';
            return;
        }
        exams = result.data;
    }

    if (exams.length === 0) {
        deleteExamList.innerHTML = '<p class="hint-text">削除できる試験がありません</p>';
        return;
    }

    deleteExamList.innerHTML = exams.map(exam => `
        <div class="delete-exam-item">
            <div class="delete-exam-info">
                <p class="delete-exam-title">${escapeHtml(exam.title)}</p>
                <p class="delete-exam-id">試験ID: ${exam.id}</p>
            </div>
            <button type="button" class="btn-danger" onclick="openDeleteExamModal(${exam.id})">削除</button>
        </div>
    `).join('');
}

function openDeleteExamModal(examId) {
    const exam = currentExams.find(e => e.id === examId);
    if (!exam) return;

    pendingDeleteExam = exam;
    deleteExamModalBody.textContent =
        `「${exam.title}（ID: ${exam.id}）」を削除します。紐づく問題・タグ・解答履歴もすべて削除されます。`;
    deleteExamModal.hidden = false;
    deleteExamConfirmBtn.disabled = false;
}

function closeDeleteExamModal() {
    deleteExamModal.hidden = true;
    pendingDeleteExam = null;
    deleteExamConfirmBtn.disabled = false;
}

async function confirmDeleteExam() {
    if (!pendingDeleteExam) return;

    const examId = pendingDeleteExam.id;
    deleteExamConfirmBtn.disabled = true;

    const result = await deleteExam(examId);
    if (result.ok) {
        closeDeleteExamModal();
        if (currentExamId === examId) {
            currentExamId = null;
            currentQuestionIndex = 0;
            answeredQuestions.clear();
        }
        showFormMsg(deleteExamMsg, '試験を削除しました', true);
        await loadExams();
        await loadAdminExamSelects();
    } else {
        closeDeleteExamModal();
        showFormMsg(deleteExamMsg, `削除に失敗しました: ${result.error}`, false);
    }
}

deleteExamCancelBtn.addEventListener('click', closeDeleteExamModal);
deleteExamConfirmBtn.addEventListener('click', confirmDeleteExam);

deleteExamModal.addEventListener('click', (e) => {
    if (e.target === deleteExamModal) {
        closeDeleteExamModal();
    }
});

function openDeleteQuestionModal(questionId) {
    const question = currentQuestions.find(q => q.id === questionId);
    if (!question) return;

    pendingDeleteQuestion = question;
    deleteQuestionStep = 1;
    renderDeleteQuestionStep();
    deleteQuestionModal.hidden = false;
}

function renderDeleteQuestionStep() {
    if (!pendingDeleteQuestion) return;

    const titlePreview = pendingDeleteQuestion.title.length > 80
        ? `${pendingDeleteQuestion.title.slice(0, 80)}…`
        : pendingDeleteQuestion.title;

    if (deleteQuestionStep === 1) {
        deleteQuestionModalTitle.textContent = 'この問題をドロップしますか？';
        deleteQuestionModalBody.textContent =
            `「${titlePreview}」（問題ID: ${pendingDeleteQuestion.id}）を問題一覧から削除します。`;
        deleteQuestionModalWarning.hidden = true;
        deleteQuestionNextBtn.hidden = false;
        deleteQuestionConfirmBtn.hidden = true;
        deleteQuestionConfirmBtn.disabled = false;
    } else {
        deleteQuestionModalTitle.textContent = '最終確認';
        deleteQuestionModalBody.textContent =
            `本当にこの問題を削除しますか？削除後は元に戻せません。`;
        deleteQuestionModalWarning.hidden = false;
        deleteQuestionNextBtn.hidden = true;
        deleteQuestionConfirmBtn.hidden = false;
        deleteQuestionConfirmBtn.disabled = false;
    }
}

function closeDeleteQuestionModal() {
    deleteQuestionModal.hidden = true;
    pendingDeleteQuestion = null;
    deleteQuestionStep = 1;
    deleteQuestionConfirmBtn.disabled = false;
}

function advanceDeleteQuestionStep() {
    if (!pendingDeleteQuestion) return;
    deleteQuestionStep = 2;
    renderDeleteQuestionStep();
}

async function confirmDeleteQuestion() {
    if (!pendingDeleteQuestion || deleteQuestionStep !== 2) return;

    const questionId = pendingDeleteQuestion.id;
    deleteQuestionConfirmBtn.disabled = true;

    const result = await deleteQuestion(questionId);
    if (!result.ok) {
        closeDeleteQuestionModal();
        showError(`問題の削除に失敗しました: ${result.error}`);
        return;
    }

    closeDeleteQuestionModal();
    answeredQuestions.delete(questionId);
    currentQuestions = currentQuestions.filter(q => q.id !== questionId);

    if (currentQuestionIndex >= currentQuestions.length) {
        currentQuestionIndex = Math.max(0, currentQuestions.length - 1);
    }

    if (currentExamId) {
        const statsResult = await fetchStats(currentExamId);
        if (statsResult.ok && statsResult.data) {
            renderStatsCard(statsResult.data);
        }
    }

    if (currentQuestions.length === 0) {
        questionList.innerHTML = `
            <div class="empty-state">
                <p>この試験には問題がありません。</p>
                <button type="button" onclick="showScreen('home');" class="btn-secondary">
                    ホームに戻る
                </button>
            </div>
        `;
        return;
    }

    renderCurrentQuestion();
}

deleteQuestionCancelBtn.addEventListener('click', closeDeleteQuestionModal);
deleteQuestionNextBtn.addEventListener('click', advanceDeleteQuestionStep);
deleteQuestionConfirmBtn.addEventListener('click', confirmDeleteQuestion);

deleteQuestionModal.addEventListener('click', (e) => {
    if (e.target === deleteQuestionModal) {
        closeDeleteQuestionModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !deleteExamModal.hidden) {
        closeDeleteExamModal();
    }
    if (e.key === 'Escape' && !deleteQuestionModal.hidden) {
        closeDeleteQuestionModal();
    }
});

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

function renderImportResult(container, data) {
    const parts = [`<p><strong>${data.imported}件</strong>を登録しました。`];
    if (data.failed > 0) {
        parts.push(` <strong>${data.failed}件</strong>は失敗しました。</p>`);
    } else {
        parts.push('</p>');
    }

    if (data.created_tags && data.created_tags.length > 0) {
        parts.push(`<p class="hint-text">新規タグ: ${data.created_tags.map(escapeHtml).join(', ')}</p>`);
    }

    if (data.errors && data.errors.length > 0) {
        parts.push('<ul class="import-error-list">');
        data.errors.forEach(err => {
            parts.push(`<li>行 ${err.row}: ${escapeHtml(err.message)}</li>`);
        });
        parts.push('</ul>');
    }

    container.innerHTML = parts.join('');
    container.hidden = false;
}

csvImportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('csvImportFormMsg');
    const resultEl = document.getElementById('csvImportResult');
    const examId = parseInt(csvExamSelect.value, 10);
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];

    if (!file) {
        showFormMsg(msgEl, 'CSVファイルを選択してください', false);
        return;
    }

    resultEl.hidden = true;
    resultEl.innerHTML = '';
    showFormMsg(msgEl, 'インポート中...', true);

    const result = await importQuestionsCsv(examId, file);
    if (result.ok) {
        const data = result.data;
        const hasErrors = data.failed > 0;
        showFormMsg(
            msgEl,
            hasErrors
                ? `${data.imported}件登録、${data.failed}件失敗`
                : `${data.imported}件の問題を登録しました`,
            !hasErrors || data.imported > 0
        );
        renderImportResult(resultEl, data);
        if (data.imported > 0) {
            csvImportForm.reset();
            if (parseInt(questionExamSelect.value, 10) === examId) {
                await loadQuestionTagCheckboxes(examId);
            }
        }
    } else {
        showFormMsg(msgEl, `インポートに失敗しました: ${result.error}`, false);
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
