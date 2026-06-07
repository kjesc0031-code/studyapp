/**
 * Study App - Frontend Application (Vanilla JavaScript)
 * Manages all UI interactions and API communication
 * 
 * FIXES:
 * ① API仕様ズレを修正: /stats → /stats/overall, /stats/tags → /stats/by-tag
 * ② Question データ構造ズレを修正: text→title, options→choices
 * ③ 1問ずつ解くUXに変更
 */

// ==================== Configuration ====================

// 環境変数から読み込み。空文字は同一オリジン用なので || ではなく ?? を使う
const API_BASE_URL = window.API_BASE_URL ?? (
    window.location.protocol === "file:" ? "http://localhost:8080" : ""
);

// ==================== DOM Elements ====================

const homeBtn = document.getElementById('homeBtn');
const statsBtn = document.getElementById('statsBtn');
const backBtn = document.getElementById('backBtn');

const homeScreen = document.getElementById('homeScreen');
const quizScreen = document.getElementById('quizScreen');
const statsScreen = document.getElementById('statsScreen');

const examList = document.getElementById('examList');
const questionList = document.getElementById('questionList');
const statsCard = document.getElementById('statsCard');
const examStats = document.getElementById('examStats');
const examTitle = document.getElementById('examTitle');

const errorContainer = document.getElementById('errorContainer');

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
    
    homeBtn.classList.remove('active');
    statsBtn.classList.remove('active');
    
    if (screen === 'home') {
        homeScreen.classList.add('active');
        homeBtn.classList.add('active');
    } else if (screen === 'quiz') {
        quizScreen.classList.add('active');
    } else if (screen === 'stats') {
        statsScreen.classList.add('active');
        statsBtn.classList.add('active');
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

backBtn.addEventListener('click', () => {
    showScreen('home');
    currentExamId = null;
    currentQuestionIndex = 0;
    answeredQuestions.clear();
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

// ==================== API Functions ====================

async function fetchExams() {
    try {
        const res = await fetch(`${API_BASE_URL}/exams/`);
        if (!res.ok) throw new Error(`Failed to fetch exams: ${res.statusText}`);
        return await res.json();
    } catch (error) {
        showError(`試験の取得に失敗しました: ${error.message}`);
        return [];
    }
}

async function fetchQuestions(examId) {
    try {
        const res = await fetch(`${API_BASE_URL}/questions/?exam_id=${examId}`);
        if (!res.ok) throw new Error(`Failed to fetch questions: ${res.statusText}`);
        return await res.json();
    } catch (error) {
        showError(`問題の取得に失敗しました: ${error.message}`);
        return [];
    }
}

async function fetchStats(examId) {
    try {
        const res = await fetch(`${API_BASE_URL}/stats/overall?exam_id=${examId}`);
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
        const data = await res.json();
        
        return {
            total_questions: data.total || 0,
            correct_answers: data.correct || 0,
            correct_rate: data.accuracy || 0
        };
    } catch (error) {
        showError(`統計情報の取得に失敗しました: ${error.message}`);
        return null;
    }
}

async function fetchTagStats(examId) {
    try {
        const res = await fetch(`${API_BASE_URL}/stats/by-tag?exam_id=${examId}`);
        if (!res.ok) throw new Error(`Failed to fetch tag stats: ${res.statusText}`);
        const data = await res.json();
        
        return data.map(item => ({
            tag_name: item.tag,
            correct_rate: item.accuracy,
            correct_answers: item.correct,
            total_questions: item.total
        }));
    } catch (error) {
        showError(`分野別統計の取得に失敗しました: ${error.message}`);
        return [];
    }
}

async function submitAnswer(questionId, isCorrect) {
    try {
        const res = await fetch(`${API_BASE_URL}/answers/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_id: questionId, is_correct: isCorrect }),
        });
        if (!res.ok) throw new Error(`Failed to submit answer: ${res.statusText}`);
        return await res.json();
    } catch (error) {
        showError(`回答の送信に失敗しました: ${error.message}`);
        return null;
    }
}

// ==================== UI Rendering - Home Screen ====================

async function loadExams() {
    examList.innerHTML = '<div class="loading">試験を読込中...</div>';
    const exams = await fetchExams();
    currentExams = exams;
    
    if (exams.length === 0) {
        examList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #999;">試験がまだ登録されていません</div>';
        return;
    }
    
    examList.innerHTML = exams.map(exam => `
        <div class="exam-card" onclick="startQuiz(${exam.id})">
            <h2>${escapeHtml(exam.title)}</h2>
            <p class="exam-id">試験ID: ${exam.id}</p>
            <p class="click-hint">クリックして学習を開始</p>
        </div>
    `).join('');
}

// ==================== UI Rendering - Quiz Screen (1問ずつ) ====================

async function startQuiz(examId) {
    currentExamId = examId;
    currentQuestionIndex = 0;
    answeredQuestions.clear();
    
    const exam = currentExams.find(e => e.id === examId);
    
    if (!exam) return;
    
    examTitle.textContent = exam.title;
    showScreen('quiz');
    
    const [questions, stats] = await Promise.all([
        fetchQuestions(examId),
        fetchStats(examId),
    ]);
    
    currentQuestions = questions;
    
    if (stats) {
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
    
    if (questions.length === 0) {
        questionList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #999;">この試験に問題がまだ登録されていません</div>';
        return;
    }
    
    renderCurrentQuestion();
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
        <div style="margin-bottom: 2rem;">
            <p style="color: #999; font-size: 0.9rem;">問題 ${currentNum}/${totalQuestions}</p>
            <div class="progress-bar" style="background: #eee; height: 4px; border-radius: 2px; margin-bottom: 1rem;">
                <div style="background: #0066cc; height: 100%; width: ${(currentNum / totalQuestions) * 100}%; border-radius: 2px;"></div>
            </div>
        </div>
        
        <div class="question-card">
            <div class="question-text">${escapeHtml(q.title)}</div>
            
            <div class="options">
                ${q.choices.map((choice, idx) => `
                    <button class="option-btn" onclick="handleAnswer(${q.id}, '${escapeAttr(choice)}', '${escapeAttr(q.correct_answer)}', ${currentNum}, ${totalQuestions})">
                        <input type="radio" name="answer"> ${escapeHtml(choice)}
                    </button>
                `).join('')}
            </div>
            
            <div class="explanation" style="display: none;" id="explanation-${q.id}">
                <div class="explanation-title">正答: ${escapeHtml(q.correct_answer)}</div>
                <div class="explanation-text">${escapeHtml(q.explanation)}</div>
                ${q.tags && q.tags.length > 0 ? `
                    <div class="tags">
                        ${q.tags.map(tag => `<span class="tag">${escapeHtml(tag.name)}</span>`).join('')}
                    </div>
                ` : ''}
                <button onclick="nextQuestion()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    次の問題へ →
                </button>
            </div>
        </div>
    `;
    
    questionList.innerHTML = questionHTML;
}

async function handleAnswer(questionId, selectedAnswer, correctAnswer, questionNum, totalQuestions) {
    const isCorrect = selectedAnswer === correctAnswer;
    
    await submitAnswer(questionId, isCorrect);
    answeredQuestions.add(questionId);
    
    if (currentExamId) {
        const stats = await fetchStats(currentExamId);
        if (stats) {
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
    }
    
    const q = currentQuestions[currentQuestionIndex];
    const explanationEl = document.getElementById(`explanation-${q.id}`);
    if (explanationEl) {
        explanationEl.style.display = 'block';
    }
    
    const feedback = isCorrect ? '✔ 正解！' : '✗ 不正解です';
    alert(feedback);
}

function nextQuestion() {
    currentQuestionIndex++;
    renderCurrentQuestion();
}

function renderQuizComplete() {
    questionList.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="font-size: 1.8rem; margin-bottom: 1rem;">🎉 すべての問題が完了しました！</h2>
            <p style="color: #666; margin-bottom: 2rem;">学習お疲れ様でした。</p>
            <button onclick="startQuiz(${currentExamId})" style="padding: 0.7rem 1.5rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; margin-right: 1rem;">
                もう一度やる
            </button>
            <button onclick="showScreen('home');" style="padding: 0.7rem 1.5rem; background: #ddd; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
                ホームに戻る
            </button>
        </div>
    `;
}

// ==================== UI Rendering - Stats Screen ====================

async function loadExamStats() {
    examStats.innerHTML = '<div class="loading">統計を読込中...</div>';
    const exams = await fetchExams();
    
    if (exams.length === 0) {
        examStats.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #999;">試験がまだ登録されていません</div>';
        return;
    }
    
    const allStats = await Promise.all(
        exams.map(exam => fetchStats(exam.id).then(stats => ({ exam, stats })))
    );
    
    examStats.innerHTML = allStats
        .filter(item => item.stats !== null)
        .map(item => {
            const exam = item.exam;
            const stats = item.stats;
            const correctRate = (stats.correct_rate * 100).toFixed(1);
            
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
                </div>
            `;
        })
        .join('');
}

// ==================== Utility Functions ====================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;');
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
    loadExams();
});