// HTML checkbox value'ları ile JSON dosya yolları
const fileMappings = {
    "Medu-4": { filePath: "medu4.json" },
    "Medu-9": { filePath: "medu9.json" },
    "Medu-3": { filePath: "medu3.json" },
    "Medu-6": { filePath: "medu6.json" },
    "Medu-7": { filePath: "medu7.json" }
};

// HTML elementlerini seçme
const mainMenu = document.getElementById('main-menu');
const quizArea = document.getElementById('quiz-area');
const endScreen = document.getElementById('end-screen');
const fileCheckboxes = document.querySelectorAll('.file-checkbox');
const rangeRadios = document.querySelectorAll('input[name="question-range"]');
const modeRadios = document.querySelectorAll('input[name="quiz-mode"]');
const startQuizBtn = document.getElementById('start-quiz-btn');
const reviewWrongBtn = document.getElementById('review-wrong-btn');
const wrongAnswersSummary = document.getElementById('wrong-answers-summary');
const wrongAnswersList = document.getElementById('wrong-answers-list');
const wrongCountSpan = document.getElementById('wrong-count');
const clearWrongBtn = document.getElementById('clear-wrong-btn');
const questionCounter = document.getElementById('question-counter');
const currentQSpan = document.getElementById('current-q');
const totalQSpan = document.getElementById('total-q');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackDiv = document.getElementById('feedback');
const explanationDiv = document.getElementById('explanation');
const nextQuestionBtn = document.getElementById('next-question-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const finalScorePara = document.getElementById('final-score');

let allQuestions = []; 
let quizPool = []; 
let currentLoopQuestions = []; 
let currentQuestionIndex = 0; 
let correctCountInCurrentQuiz = 0; 

// localStorage'dan yanlış yapılanları yükle
let wrongAnswerIds = JSON.parse(localStorage.getItem('wrongAnswerIds') || '[]');

// --- Yardımcı Fonksiyonlar ---

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

function loadWrongAnswers() {
    wrongAnswerIds = JSON.parse(localStorage.getItem('wrongAnswerIds') || '[]');
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
        const question = allQuestions.find(q => q.id === qId);
        if (question) {
            const listItem = document.createElement('li');
            const displayQuestionText = question.question.length > 100 ?
                                        question.question.substring(0, 100) + '...' :
                                        question.question;
            listItem.textContent = `${displayQuestionText} [${question.sourceFileKey}]`;
            wrongAnswersList.appendChild(listItem);
        }
    });
}

function clearWrongAnswers() {
     wrongAnswerIds = [];
     saveWrongAnswers();
     alert('Yanlış yapılan sorular temizlendi.');
}

// --- Arayüz Durumu Yönetimi ---

function showMainMenu() {
    mainMenu.style.display = 'block';
    quizArea.style.display = 'none';
    endScreen.style.display = 'none';
    feedbackDiv.textContent = '';
    explanationDiv.style.display = 'none';
    nextQuestionBtn.style.display = 'none';
    optionsContainer.innerHTML = '';
    questionText.textContent = '';
    currentQuestionIndex = 0;
    correctCountInCurrentQuiz = 0;
    loadWrongAnswers();
}

function showQuizArea() {
    mainMenu.style.display = 'none';
    endScreen.style.display = 'none';
    quizArea.style.display = 'block';
}

function showEndScreen(correctCount, totalCount) {
     mainMenu.style.display = 'none';
     quizArea.style.display = 'none';
     endScreen.style.display = 'block';

     const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;

     if (selectedMode === 'infinite') {
         finalScorePara.textContent = `Bir tur tamamlandı! Bu turda ${totalCount} soru çözdünüz, ${correctCount} doğru cevapladınız.`;
     } else {
        finalScorePara.textContent = `Quiz Tamamlandı! Toplam ${totalCount} sorudan ${correctCount} tanesini doğru cevapladınız.`;
     }

     document.getElementById('restart-from-end-btn').onclick = () => {
        if (selectedMode === 'infinite') {
             initializeQuiz(false);
        } else {
             showMainMenu();
        }
     }
     document.getElementById('back-to-menu-from-end-btn').onclick = showMainMenu;
}

function getQuestionNumberFromId(id) {
    const parts = id.split('_q');
    if (parts.length === 2) {
        return parseInt(parts[1], 10);
    }
    return NaN;
}

// --- Veri Yükleme ---

async function loadQuestions() {
    const fetchPromises = Object.keys(fileMappings).map(async shortName => {
        const fileInfo = fileMappings[shortName];
        try {
            const response = await fetch(fileInfo.filePath);
            if (!response.ok) return [];
            const questions = await response.json();
            
            // Her soruya hangi dosyadan geldiğini işaretliyoruz (KARIŞIKLIĞI ÖNLEYEN KISIM)
            return questions.map(q => ({
                ...q,
                sourceFileKey: shortName 
            }));
        } catch (error) {
            console.error(`Hata: ${fileInfo.filePath}`, error);
            return [];
        }
    });

    const results = await Promise.all(fetchPromises);
    allQuestions = results.flat();

    if (allQuestions.length === 0) {
         startQuizBtn.disabled = true;
    } else {
         startQuizBtn.disabled = false;
         updateWrongAnswersList();
    }
}

// --- Quiz Başlatma ---

async function initializeQuiz(isReviewingWrong = false) {
    if (allQuestions.length === 0) {
        await loadQuestions();
    }

    const selectedFilesShortNames = Array.from(fileCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    if (selectedFilesShortNames.length === 0 && !isReviewingWrong) {
        alert('Lütfen en az bir konu seçin.');
        return;
    }

    const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;
    const selectedRange = document.querySelector('input[name="question-range"]:checked').value;

    // FİLTRELEME: sourceFileKey üzerinden yapıyoruz (İSİMLER AYNI OLSA BİLE KARIŞMAZ)
    let filteredByFiles = allQuestions;
    if (!isReviewingWrong) {
        filteredByFiles = allQuestions.filter(q => selectedFilesShortNames.includes(q.sourceFileKey));
    }

    let filteredByRange = filteredByFiles;
    if (selectedRange !== 'all' && !isReviewingWrong) {
         filteredByRange = filteredByFiles.filter(q => {
            const qNumber = getQuestionNumberFromId(q.id);
            if (isNaN(qNumber)) return false;
            if (selectedRange === '1-25') return qNumber >= 1 && qNumber <= 25;
            if (selectedRange === '26-50') return qNumber >= 26 && qNumber <= 50;
            if (selectedRange === '51-75') return qNumber >= 51 && qNumber <= 75;
            if (selectedRange === '76+') return qNumber >= 76;
            return false;
         });
    }

    if (isReviewingWrong) {
         quizPool = filteredByRange.filter(q => wrongAnswerIds.includes(q.id));
         if (quizPool.length === 0) {
             alert('Tekrar çözmek için yanlış yaptığınız soru bulunmamaktadır.');
             showMainMenu();
             return;
         }
    } else {
        quizPool = filteredByRange;
    }

    if (quizPool.length === 0) {
         alert('Seçtiğiniz kriterlere uygun soru bulunamadı.');
         showMainMenu();
         return;
     }

    currentLoopQuestions = [...quizPool];
    shuffleArray(currentLoopQuestions);
    currentQuestionIndex = 0;
    correctCountInCurrentQuiz = 0;
    quizArea.dataset.isReviewingWrong = isReviewingWrong;

    showQuizArea();
    displayCurrentQuestion();
}

function displayCurrentQuestion() {
    const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;
    const isReviewingWrong = quizArea.dataset.isReviewingWrong === 'true';

    if (currentLoopQuestions.length === 0) {
        if (selectedMode === 'infinite' && !isReviewingWrong) {
            currentLoopQuestions = [...quizPool];
            shuffleArray(currentLoopQuestions);
            currentQuestionIndex = 0;
        } else {
            endQuiz();
            return;
        }
    }

    const question = currentLoopQuestions.shift();

    if (selectedMode === 'infinite' && !isReviewingWrong) {
        questionCounter.textContent = `Soru: ${currentQuestionIndex + 1}`;
    } else {
        questionCounter.textContent = `Soru: ${currentQuestionIndex + 1} / ${quizPool.length}`;
    }

    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    feedbackDiv.textContent = '';
    explanationDiv.style.display = 'none';
    nextQuestionBtn.style.display = 'none';

    const optionsArray = Object.keys(question.options).map(key => ({
        key: key,
        text: question.options[key]
    }));

    shuffleArray(optionsArray);
    const newLabels = ['A', 'B', 'C', 'D', 'E'];

    optionsArray.forEach((option, index) => {
        const button = document.createElement('button');
        button.classList.add('option-button');
        button.textContent = `${newLabels[index]}) ${option.text}`;
        button.dataset.originalKey = option.key;
        button.dataset.questionId = question.id;
        button.addEventListener('click', handleAnswerClick);
        optionsContainer.appendChild(button);
    });
}

function handleAnswerClick(event) {
    const selectedButton = event.target;
    const selectedOriginalKey = selectedButton.dataset.originalKey;
    const questionId = selectedButton.dataset.questionId;
    const currentQuestion = allQuestions.find(q => q.id === questionId);
    
    const correctAnswerKey = currentQuestion.correct_answer;

    Array.from(optionsContainer.children).forEach(button => {
        button.disabled = true;
    });

    if (selectedOriginalKey === correctAnswerKey) {
        selectedButton.classList.add('correct');
        feedbackDiv.textContent = 'Doğru!';
        feedbackDiv.style.color = 'green';
        correctCountInCurrentQuiz++;
        wrongAnswerIds = wrongAnswerIds.filter(id => id !== questionId);
        saveWrongAnswers();
    } else {
        selectedButton.classList.add('wrong');
        feedbackDiv.textContent = 'Yanlış.';
        feedbackDiv.style.color = 'red';
        Array.from(optionsContainer.children).forEach(button => {
            if (button.dataset.originalKey === correctAnswerKey) {
                button.classList.add('correct');
            }
        });
        if (!wrongAnswerIds.includes(questionId)) {
            wrongAnswerIds.push(questionId);
            saveWrongAnswers();
        }
    }

    if (currentQuestion.explanation) {
        explanationDiv.textContent = 'Açıklama: ' + currentQuestion.explanation;
        explanationDiv.style.display = 'block';
    }

    nextQuestionBtn.style.display = 'block';
}

function nextQuestion() {
     currentQuestionIndex++;
     displayCurrentQuestion();
}

function endQuiz() {
     showEndScreen(correctCountInCurrentQuiz, quizPool.length);
     quizArea.dataset.isReviewingWrong = 'false';
}

// --- Olay Dinleyicileri ---

startQuizBtn.addEventListener('click', () => initializeQuiz(false));
nextQuestionBtn.addEventListener('click', nextQuestion);
backToMenuBtn.addEventListener('click', showMainMenu);
clearWrongBtn.addEventListener('click', clearWrongAnswers);
reviewWrongBtn.addEventListener('click', () => initializeQuiz(true));

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    showMainMenu();
});
