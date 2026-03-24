// 1. AYARLAR: Checkbox 'value' değerleri ile dosya isimleri birebir eşleşmeli
const fileMappings = {
    "Medu-4": "medu4.json",
    "Medu-9": "medu9.json",
    "Medu-3": "medu3.json",
    "Medu-6": "medu6.json",
    "Medu-7": "medu7.json"
};

// 2. ELEMENTLER
const mainMenu = document.getElementById('main-menu');
const quizArea = document.getElementById('quiz-area');
const endScreen = document.getElementById('end-screen');
const fileCheckboxes = document.querySelectorAll('.file-checkbox');
const startQuizBtn = document.getElementById('start-quiz-btn');
const reviewWrongBtn = document.getElementById('review-wrong-btn');
const wrongAnswersSummary = document.getElementById('wrong-answers-summary');
const wrongAnswersList = document.getElementById('wrong-answers-list');
const wrongCountSpan = document.getElementById('wrong-count');
const clearWrongBtn = document.getElementById('clear-wrong-btn');
const questionCounter = document.getElementById('question-counter');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackDiv = document.getElementById('feedback');
const explanationDiv = document.getElementById('explanation');
const nextQuestionBtn = document.getElementById('next-question-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const finalScorePara = document.getElementById('final-score');

// 3. DEĞİŞKENLER
let allQuestions = []; 
let quizPool = []; 
let currentLoopQuestions = []; 
let currentQuestionIndex = 0; 
let correctCountInCurrentQuiz = 0; 
let wrongAnswerIds = JSON.parse(localStorage.getItem('wrongAnswerIds') || '[]');

// --- YARDIMCI FONKSİYONLAR ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function saveWrongAnswers() {
    const uniqueWrongIds = [...new Set(wrongAnswerIds)];
    localStorage.setItem('wrongAnswerIds', JSON.stringify(uniqueWrongIds));
    updateWrongAnswersList();
}

function updateWrongAnswersList() {
    wrongAnswersList.innerHTML = ''; 
    const uniqueWrongIds = [...new Set(wrongAnswerIds)];
    wrongCountSpan.textContent = uniqueWrongIds.length;

    if (uniqueWrongIds.length === 0) {
        wrongAnswersSummary.style.display = 'none';
        reviewWrongBtn.style.display = 'none';
        clearWrongBtn.style.display = 'none';
        return;
    }

    wrongAnswersSummary.style.display = 'block';
    reviewWrongBtn.style.display = 'block';
    clearWrongBtn.style.display = 'inline-block';

    uniqueWrongIds.forEach(qId => {
        const question = allQuestions.find(q => q.uniqueId === qId);
        if (question) {
            const listItem = document.createElement('li');
            listItem.textContent = `${question.question.substring(0, 80)}... [${question.sourceFile}]`;
            wrongAnswersList.appendChild(listItem);
        }
    });
}

// --- VERİ YÜKLEME ---

async function loadQuestions() {
    allQuestions = []; // Önce temizle
    const fetchPromises = Object.keys(fileMappings).map(async key => {
        try {
            const response = await fetch(fileMappings[key] + '?v=' + new Date().getTime()); // Cache koruması
            if (!response.ok) return [];
            const data = await response.json();
            
            // Her soruya benzersiz bir ID ve kaynak dosya ismi veriyoruz
            return data.map(q => ({
                ...q,
                sourceFile: key,
                uniqueId: key + "_" + q.id // Çakışmaları önlemek içinSubject_ID yapıyoruz
            }));
        } catch (e) { return []; }
    });

    const results = await Promise.all(fetchPromises);
    allQuestions = results.flat();
    console.log("Toplam Yüklenen Soru:", allQuestions.length);
    updateWrongAnswersList();
}

// --- QUIZ MANTIĞI ---

function getQuestionNumber(q) {
    // Soru numarasını hem 'question_number' alanından hem de ID'den çekmeye çalış
    if (q.question_number) return parseInt(q.question_number);
    const parts = q.id.split('_q');
    return parts.length === 2 ? parseInt(parts[1]) : NaN;
}

async function initializeQuiz(isReviewingWrong = false) {
    if (allQuestions.length === 0) await loadQuestions();

    const selectedFiles = Array.from(fileCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    
    if (selectedFiles.length === 0 && !isReviewingWrong) {
        alert('Lütfen bir konu seçin.');
        return;
    }

    const range = document.querySelector('input[name="question-range"]:checked').value;
    const mode = document.querySelector('input[name="quiz-mode"]:checked').value;

    // 1. ADIM: Dosya filtresi
    let pool = isReviewingWrong ? allQuestions : allQuestions.filter(q => selectedFiles.includes(q.sourceFile));

    // 2. ADIM: Soru Aralığı filtresi
    if (range !== 'all' && !isReviewingWrong) {
        pool = pool.filter(q => {
            const num = getQuestionNumber(q);
            if (range === '1-25') return num >= 1 && num <= 25;
            if (range === '26-50') return num >= 26 && num <= 50;
            if (range === '51-75') return num >= 51 && num <= 75;
            if (range === '76+') return num >= 76;
            return true;
        });
    }

    // 3. ADIM: Yanlışlar modundaysa sadece yanlışları al
    if (isReviewingWrong) {
        pool = pool.filter(q => wrongAnswerIds.includes(q.uniqueId));
    }

    if (pool.length === 0) {
        alert('Seçilen kriterlerde soru bulunamadı.');
        return;
    }

    quizPool = pool;
    currentLoopQuestions = [...quizPool];
    shuffleArray(currentLoopQuestions);
    currentQuestionIndex = 0;
    correctCountInCurrentQuiz = 0;
    quizArea.dataset.isReviewingWrong = isReviewingWrong;

    console.log("Quiz Başladı. Soru Sayısı:", quizPool.length);

    showQuizArea();
    displayCurrentQuestion();
}

function displayCurrentQuestion() {
    const mode = document.querySelector('input[name="quiz-mode"]:checked').value;
    const isReview = quizArea.dataset.isReviewingWrong === 'true';

    if (currentLoopQuestions.length === 0) {
        if (mode === 'infinite' && !isReview) {
            currentLoopQuestions = [...quizPool];
            shuffleArray(currentLoopQuestions);
        } else {
            showEndScreen(correctCountInCurrentQuiz, quizPool.length);
            return;
        }
    }

    const question = currentLoopQuestions.shift();
    currentQuestionIndex++;

    questionCounter.textContent = `Soru: ${currentQuestionIndex} / ${quizPool.length}`;
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    feedbackDiv.textContent = '';
    explanationDiv.style.display = 'none';
    nextQuestionBtn.style.display = 'none';

    // Şıkları hazırla
    const opts = Object.keys(question.options).map(k => ({ key: k, text: question.options[k] }));
    shuffleArray(opts);

    const labels = ['A', 'B', 'C', 'D', 'E'];
    opts.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.classList.add('option-button');
        btn.textContent = `${labels[i]}) ${opt.text}`;
        btn.onclick = () => {
            Array.from(optionsContainer.children).forEach(b => b.disabled = true);
            if (opt.key === question.correct_answer) {
                btn.classList.add('correct');
                feedbackDiv.textContent = 'Doğru!';
                feedbackDiv.style.color = 'green';
                correctCountInCurrentQuiz++;
                wrongAnswerIds = wrongAnswerIds.filter(id => id !== question.uniqueId);
            } else {
                btn.classList.add('wrong');
                feedbackDiv.textContent = 'Yanlış!';
                feedbackDiv.style.color = 'red';
                // Doğru şıkkı göster
                Array.from(optionsContainer.children).forEach(b => {
                    if (opts[Array.from(optionsContainer.children).indexOf(b)].key === question.correct_answer) b.classList.add('correct');
                });
                if (!wrongAnswerIds.includes(question.uniqueId)) wrongAnswerIds.push(question.uniqueId);
            }
            saveWrongAnswers();
            if (question.explanation) {
                explanationDiv.textContent = "Açıklama: " + question.explanation;
                explanationDiv.style.display = 'block';
            }
            nextQuestionBtn.style.display = 'block';
        };
        optionsContainer.appendChild(btn);
    });
}

// --- ARAYÜZ ---

function showMainMenu() {
    mainMenu.style.display = 'block';
    quizArea.style.display = 'none';
    endScreen.style.display = 'none';
    loadQuestions();
}

function showQuizArea() {
    mainMenu.style.display = 'none';
    quizArea.style.display = 'block';
}

function showEndScreen(correct, total) {
    quizArea.style.display = 'none';
    endScreen.style.display = 'block';
    finalScorePara.textContent = `${total} soruda ${correct} doğru yaptınız.`;
}

// --- LISTENERS ---
startQuizBtn.onclick = () => initializeQuiz(false);
reviewWrongBtn.onclick = () => initializeQuiz(true);
nextQuestionBtn.onclick = () => displayCurrentQuestion();
backToMenuBtn.onclick = showMainMenu;
document.getElementById('back-to-menu-from-end-btn').onclick = showMainMenu;
document.getElementById('restart-from-end-btn').onclick = () => initializeQuiz(false);
clearWrongBtn.onclick = () => { wrongAnswerIds = []; saveWrongAnswers(); alert('Temizlendi'); };

document.addEventListener('DOMContentLoaded', showMainMenu);
