// HTML checkbox value'ları ile JSON dosya yolları ve JSON içindeki 'file' alanının uzun değerlerinin eşleşmesi
const fileMappings = {
    "Medu-3": { filePath: "medu3.json", jsonFileValue: "DN4-CERRAHİ BİLİMLER 2. DÖNGÜ (3.GRUP) SINAVI" },
    "Medu-4": { filePath: "medu4.json", jsonFileValue: "DN4-CERRAHİ BİLİMLER 1. DÖNGÜ (4.GRUP) SINAVI" },
    "Medu-9": { filePath: "medu9.json", jsonFileValue: "DN4-CERRAHİ BİLİMLER 3. DÖNGÜ (1.GRUP) SINAVI" }
    // Buraya diğer Medu dosyalarınız için benzer eşleşmeler ekleyebilirsiniz
};

// HTML elementlerini seçme
const mainMenu = document.getElementById('main-menu');
const quizArea = document.getElementById('quiz-area');
const endScreen = document.getElementById('end-screen');
const fileCheckboxes = document.querySelectorAll('.file-checkbox');
const rangeRadios = document.querySelectorAll('input[name="question-range"]'); // Aralık radio buttonları
const modeRadios = document.querySelectorAll('input[name="quiz-mode"]');
const startQuizBtn = document.getElementById('start-quiz-btn');
const reviewWrongBtn = document.getElementById('review-wrong-btn');
const wrongAnswersSummary = document.getElementById('wrong-answers-summary');
const wrongAnswersList = document.getElementById('wrong-answers-list');
const wrongCountSpan = document.getElementById('wrong-count');
const clearWrongBtn = document.getElementById('clear-wrong-btn'); // Yanlışları temizle butonu
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

// Yeni Eklenen Elementler
const showStatsBtn = document.getElementById('show-stats-btn');
const statsModal = document.getElementById('stats-modal');
const closeButton = statsModal.querySelector('.close-button');
const hourlySolvedSpan = document.getElementById('hourly-solved');
const hourlyCorrectSpan = document.getElementById('hourly-correct');
const hourlyWrongSpan = document.getElementById('hourly-wrong');
const overallSolvedSpan = document.getElementById('overall-solved');
const overallCorrectSpan = document.getElementById('overall-correct');
const overallWrongSpan = document.getElementById('overall-wrong');


let allQuestions = []; // Tüm soruları saklar
let quizPool = []; // Seçilen dosya ve aralığa göre filtrelenmiş tüm sorular (Sonsuz mod ana havuzu)
let currentLoopQuestions = []; // Sonsuz döngü modu için mevcut turdaki sorular veya diğer modlarda quiz havuzu
let currentQuestionIndex = 0; // Şu anki sorunun indeksi (tur içindeki sıra)
let correctCountInCurrentQuiz = 0; // Bu oturumda doğru cevaplanan soru sayısı


// localStorage'dan yanlış yapılanları yükle (Varsayılan olarak boş dizi)
let wrongAnswerIds = JSON.parse(localStorage.getItem('wrongAnswerIds') || '[]');

// Yeni: İstatistikler için localStorage depolaması
let quizStats = {
    totalSolved: 0,
    totalCorrect: 0,
    totalWrong: 0,
    questionLog: [] // { timestamp: 167888888, isCorrect: true, questionId: "medu3_q1" }
};

// --- Yardımcı Fonksiyonlar ---

// Diziyi karıştırma (Fisher-Yates algoritması)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Elemanları yer değiştir
    }
    return array;
}

// Yanlış cevapları localStorage'a kaydetme
function saveWrongAnswers() {
    // wrongAnswerIds dizisindeki tekrar eden ID'leri kaldırıp saklayalım
    const uniqueWrongIds = [...new Set(wrongAnswerIds)];
    localStorage.setItem('wrongAnswerIds', JSON.stringify(uniqueWrongIds));
    updateWrongAnswersList(); // Listeyi güncelle
}

// localStorage'dan yanlış cevapları yükleme ve listeyi güncelleme
function loadWrongAnswers() {
    wrongAnswerIds = JSON.parse(localStorage.getItem('wrongAnswerIds') || '[]');
    updateWrongAnswersList();
}

// Yanlış yapılan sorular listesini arayüzde güncelleme
function updateWrongAnswersList() {
    wrongAnswersList.innerHTML = ''; // Listeyi temizle

    // Sadece benzersiz yanlışları göster
    const uniqueWrongIds = [...new Set(wrongAnswerIds)];

    wrongCountSpan.textContent = uniqueWrongIds.length; // Yanlış sayısını güncelle

    if (uniqueWrongIds.length === 0) {
        wrongAnswersSummary.style.display = 'none';
        reviewWrongBtn.style.display = 'none';
        clearWrongBtn.style.display = 'none'; // Yanlış yoksa temizle butonu da görünmesin
        return;
    }

    wrongAnswersSummary.style.display = 'block';
    reviewWrongBtn.style.display = 'block';
    clearWrongBtn.style.display = 'inline-block'; // Yanlış varsa temizle butonu görünsün


    // Yanlış yapılan soruların metinlerini bul ve listeye ekle
    uniqueWrongIds.forEach(qId => {
        // allQuestions dizisinde soruyu bul
        const question = allQuestions.find(q => q.id === qId);
        if (question) {
            const listItem = document.createElement('li');
            // Soru metninin ilk kısmını göster ve sonuna ... ekle
            const displayQuestionText = question.question.length > 100 ?
                                        question.question.substring(0, 100) + '...' :
                                        question.question;

            // Hangi dosyadan geldiğini bulmak için fileMappings'i kullan
            const fileKey = Object.keys(fileMappings).find(key => fileMappings[key].jsonFileValue === question.file);
            const fileDisplay = fileKey ? fileKey : question.file; // Kısa adı veya orijinal uzun adı göster

            listItem.textContent = `${displayQuestionText} [${fileDisplay}]`;
            wrongAnswersList.appendChild(listItem);
        }
    });
}

// Yanlışları temizleme fonksiyonu (Onaysız)
function clearWrongAnswers() {
     wrongAnswerIds = []; // Listeyi boşalt
     saveWrongAnswers(); // localStorage'a kaydet (boş liste)
     alert('Yanlış yapılan sorular temizlendi.'); // Temizlendi mesajı verilebilir
}


// Yeni: İstatistikleri localStorage'dan yükle
function loadStats() {
    const storedStats = localStorage.getItem('quizStats');
    if (storedStats) {
        quizStats = JSON.parse(storedStats);
        // questionLog'daki timestamp'ler sayı olarak saklanıyor, Date objesine dönüştürmeye gerek yok.
    }
    // Eski/geçersiz logları temizle (örneğin 1 aydan eski)
    // Şu anki senaryoda sadece son 1 saat lazım olduğundan, çok eski logları temizlemek performansa yardımcı olabilir.
    // Şimdilik temizleme işlemi yapmıyoruz, `getStatsForLastHour` sadece son 1 saati filtreleyecek.
    // Ancak log boyutu artarsa burada bir temizlik mekanizması düşünülebilir.
}

// Yeni: İstatistikleri localStorage'a kaydet
function saveStats() {
    localStorage.setItem('quizStats', JSON.stringify(quizStats));
}

// Yeni: İstatistikleri güncelle (her soru cevaplandığında çağrılır)
function updateStats(isCorrect, questionId) {
    quizStats.totalSolved++;
    const logEntry = {
        timestamp: Date.now(), // Şu anki zaman damgası (milisecond)
        isCorrect: isCorrect,
        questionId: questionId
    };
    quizStats.questionLog.push(logEntry);

    if (isCorrect) {
        quizStats.totalCorrect++;
    } else {
        quizStats.totalWrong++;
    }

    saveStats(); // Değişiklikleri kaydet
}

// Yeni: Son bir saatteki istatistikleri hesapla
function getStatsForLastHour() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 saat önceki zaman damgası
    const recentLogs = quizStats.questionLog.filter(log => log.timestamp >= oneHourAgo);

    let solved = recentLogs.length;
    let correct = recentLogs.filter(log => log.isCorrect).length;
    let wrong = solved - correct;

    return { solved, correct, wrong };
}

// Yeni: Genel toplam istatistikleri al
function getOverallStats() {
    return {
        solved: quizStats.totalSolved,
        correct: quizStats.totalCorrect,
        wrong: quizStats.totalWrong
    };
}

// Yeni: İstatistik modalını göster
function showStatsModal() {
    const hourlyStats = getStatsForLastHour();
    const overallStats = getOverallStats();

    hourlySolvedSpan.textContent = hourlyStats.solved;
    hourlyCorrectSpan.textContent = hourlyStats.correct;
    hourlyWrongSpan.textContent = hourlyStats.wrong;

    overallSolvedSpan.textContent = overallStats.solved;
    overallCorrectSpan.textContent = overallStats.correct;
    overallWrongSpan.textContent = overallStats.wrong;

    statsModal.style.display = 'flex'; // CSS'teki flex özelliğini kullanır
}

// Yeni: İstatistik modalını gizle
function hideStatsModal() {
    statsModal.style.display = 'none';
}


// --- Arayüz Durumu Yönetimi ---

function showMainMenu() {
    mainMenu.style.display = 'block';
    quizArea.style.display = 'none';
    endScreen.style.display = 'none'; // Bitiş ekranını gizle

    // Quiz alanındaki içeriği temizle (sonraki quize hazırlık)
    feedbackDiv.textContent = '';
    explanationDiv.style.display = 'none';
    nextQuestionBtn.style.display = 'none';
    optionsContainer.innerHTML = '';
    questionText.textContent = '';
    currentQuestionIndex = 0; // İndeksi sıfırla
    correctCountInCurrentQuiz = 0; // Doğru sayacını sıfırla

    loadWrongAnswers(); // Ana menüye dönünce yanlışları tekrar yükle/göster
}

function showQuizArea() {
    mainMenu.style.display = 'none';
    endScreen.style.display = 'none'; // Bitiş ekranını gizle
    quizArea.style.display = 'block';
}

function showEndScreen(correctCount, totalCount) {
     mainMenu.style.display = 'none';
     quizArea.style.display = 'none';
     endScreen.style.display = 'block';

     const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;

     if (selectedMode === 'infinite') {
         // Sonsuz modda quiz gerçekte bitmez, sadece bir tur tamamlanmıştır
         finalScorePara.textContent = `Bir tur tamamlandı! Bu turda ${totalCount} soru çözdünüz, ${correctCount} doğru cevapladınız. Yanlış yaptığınız soruları ana menüdeki listeden görebilirsiniz. Devam etmek için Yeni Quize Başla'ya basabilirsiniz.`;

     } else {
        finalScorePara.textContent = `Quiz Tamamlandı! Toplam ${totalCount} sorudan ${correctCount} tanesini doğru cevapladınız. Yanlış yaptığınız soruları ana menüdeki listeden görebilirsiniz.`;
     }


     // Bitiş ekranındaki düğmelere olay dinleyicileri ekle
     document.getElementById('restart-from-end-btn').onclick = () => {
        if (selectedMode === 'infinite') {
             initializeQuiz(false); // initializeQuiz zaten quizPool'u yeniden oluşturacak
        } else {
             showMainMenu(); // Diğer modlarda ana menüye dön
        }
     }
     document.getElementById('back-to-menu-from-end-btn').onclick = showMainMenu; // Ana menüye dön
     quizArea.dataset.isReviewingWrong = 'false'; // Quiz bitince bu durumu sıfırla
}


// --- Quiz Mantığı ---

// Soru ID'sinden soru numarasını alma fonksiyonu (örneğin "medu3_q1" -> 1)
function getQuestionNumberFromId(id) {
    // ID formatının "meduX_qY" olduğunu varsayarak ayıkla
    const parts = id.split('_q');
    if (parts.length === 2) {
        return parseInt(parts[1], 10);
    }
    return NaN; // Eğer format uymuyorsa geçersiz sayı döndür
}


// Quiz başlatma fonksiyonu
async function initializeQuiz(isReviewingWrong = false) {
    // Veriyi yükle (eğer henüz yüklenmediyse)
    if (allQuestions.length === 0) {
        await loadQuestions();
        // Eğer yükleme başarısız olursa, başlatma durur
        if (allQuestions.length === 0) {
            return;
        }
    }

    quizArea.dataset.isReviewingWrong = isReviewingWrong.toString();

    // Seçilen dosya KISA isimlerini al (checkbox value'ları)
    const selectedFilesShortNames = Array.from(fileCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

     // Seçilen KISA isimlere karşılık gelen UZUN JSON file değerlerini bul
     const selectedFilesJsonValues = selectedFilesShortNames.map(shortName => fileMappings[shortName].jsonFileValue);


    if (selectedFilesShortNames.length === 0 && !isReviewingWrong) {
        alert('Lütfen quiz yapmak istediğiniz en az bir konu seçin.');
        return;
    }

    const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;
    const selectedRange = document.querySelector('input[name="question-range"]:checked').value;

    let filteredByFiles = allQuestions; // Varsayılan olarak tüm sorular
    if (selectedFilesShortNames.length > 0) { // Sadece konu seçiliyse filtrele
       filteredByFiles = allQuestions.filter(q => selectedFilesJsonValues.includes(q.file));
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
             alert('Tekrar çözmek için (seçili kriterlere uyan) yanlış yaptığınız soru bulunmamaktadır.');
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

    if (selectedMode === 'infinite' || isReviewingWrong) {
        currentLoopQuestions = [...quizPool];
    } else {
        currentLoopQuestions = [...quizPool];
    }


    shuffleArray(currentLoopQuestions);
    currentQuestionIndex = 0;
    correctCountInCurrentQuiz = 0;

    showQuizArea();
    displayCurrentQuestion();
}


function displayCurrentQuestion() {
    const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;
    const isCurrentlyReviewingWrong = quizArea.dataset.isReviewingWrong === 'true';

    // Eğer mevcut tur havuzu boşsa
    if (currentLoopQuestions.length === 0) {
        if (selectedMode === 'infinite' && !isCurrentlyReviewingWrong) {
            currentLoopQuestions = [...quizPool];
            shuffleArray(currentLoopQuestions);
            currentQuestionIndex = 0; // Sonsuz modda tur indeksi sıfırlanır
            correctCountInCurrentQuiz = 0; // Sonsuz modda tur doğru sayısı sıfırlanır
            console.log("Sonsuz mod: Yeni tur başladı!");
        } else {
            // Diğer modlarda (veya yanlışları tekrar çöz modunda) tur havuzu bittiğinde quiz biter
            endQuiz();
            return;
        }
    }

     // Tur havuzundan sıradaki soruyu al (listenin başından alıp çıkaralım)
    const question = currentLoopQuestions.shift(); // Dizinin ilk elemanını alır ve diziden çıkarır

     // Soru sayısı gösterimi
      if (selectedMode === 'infinite' && !isCurrentlyReviewingWrong) {
           questionCounter.textContent = `Soru: ${currentQuestionIndex + 1}`;
      } else {
           currentQSpan.textContent = currentQuestionIndex + 1;
           totalQSpan.textContent = quizPool.length;
           questionCounter.textContent = `Soru: ${currentQuestionIndex + 1} / ${quizPool.length}`;
      }


    // Soru metnini göster
    questionText.textContent = question.question;

    // Şık alanını temizle ve önceki olay dinleyicilerini kaldır (butonları silerek)
    optionsContainer.innerHTML = '';
    feedbackDiv.textContent = ''; // Geri bildirimi temizle
    explanationDiv.style.display = 'none'; // Açıklamayı gizle
    nextQuestionBtn.style.display = 'none'; // Sonraki soru düğmesini gizle


    // Şıkları karıştır
    const optionsArray = Object.keys(question.options).map(key => ({
        key: key,
        text: question.options[key]
    }));

    const shuffledOptions = shuffleArray(optionsArray);

    const newLabels = ['A', 'B', 'C', 'D', 'E'];


    shuffledOptions.forEach((option, index) => {
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
    if (!currentQuestion) {
         console.error("Soru bulunamadı:", questionId);
         return;
    }

    const correctAnswerKey = currentQuestion.correct_answer;

    // Tüm şıkları pasif hale getir
    Array.from(optionsContainer.children).forEach(button => {
        button.disabled = true;
    });

    let isAnswerCorrect = false; // Yeni: İstatistikler için bayrak

    // Seçilen ve doğru şıkları işaretle ve geri bildirim ver
    if (selectedOriginalKey === correctAnswerKey) {
        selectedButton.classList.add('correct');
        feedbackDiv.textContent = 'Doğru!';
        feedbackDiv.style.color = 'green';
        correctCountInCurrentQuiz++;
        isAnswerCorrect = true; // Doğru cevaplandı

        wrongAnswerIds = wrongAnswerIds.filter(id => id !== questionId);
        saveWrongAnswers();

    } else {
        selectedButton.classList.add('wrong');
        feedbackDiv.textContent = 'Yanlış.';
        feedbackDiv.style.color = 'red';
        isAnswerCorrect = false; // Yanlış cevaplandı

        Array.from(optionsContainer.children).forEach(button => {
            if (button.dataset.originalKey === correctAnswerKey) {
                button.classList.add('correct');
            }
        });

        wrongAnswerIds.push(questionId);
        saveWrongAnswers();
    }

    // Yeni: İstatistikleri güncelle
    updateStats(isAnswerCorrect, questionId);

    if (currentQuestion.explanation) {
        explanationDiv.textContent = 'Açıklama: ' + currentQuestion.explanation;
        explanationDiv.style.display = 'block';
    } else {
         explanationDiv.style.display = 'none';
    }

    nextQuestionBtn.style.display = 'block';
}

function nextQuestion() {
     currentQuestionIndex++;
     displayCurrentQuestion();
}


function endQuiz() {
     const totalCount = quizPool.length;
     showEndScreen(correctCountInCurrentQuiz, totalCount);
     quizArea.dataset.isReviewingWrong = 'false';
}


// --- Veri Yükleme ---

async function loadQuestions() {
    const fetchPromises = Object.keys(fileMappings).map(async shortName => {
        const fileInfo = fileMappings[shortName];
        try {
            const response = await fetch(fileInfo.filePath);
            if (!response.ok) {
                if (response.status === 404) {
                    console.error(`Dosya bulunamadı: ${fileInfo.filePath}`);
                    alert(`Hata: '${fileInfo.filePath}' dosyası bulunamadı. Lütfen dosya adının doğru olduğundan emin olun.`);
                } else {
                    console.error(`Dosya yüklenirken HTTP hatası: ${fileInfo.filePath}, status: ${response.status}`);
                     alert(`Hata: '${fileInfo.filePath}' yüklenirken bir HTTP hatası oluştu (Status: ${response.status}).`);
                }
                return [];
            }
            const questions = await response.json();

             if (!Array.isArray(questions)) {
                 console.error(`JSON format hatası: ${fileInfo.filePath} bir dizi değil.`);
                 alert(`Hata: '${fileInfo.filePath}' dosyasının formatı hatalı (dizi olmalı).`);
                 return [];
             }
            const validQuestions = questions.filter(q =>
                 typeof q === 'object' && q !== null &&
                 typeof q.id === 'string' && q.id.length > 0 &&
                 typeof q.file === 'string' && q.file.length > 0 &&
                 typeof q.question === 'string' && q.question.length > 0 &&
                 typeof q.options === 'object' && q.options !== null && Object.keys(q.options).length >= 5 &&
                 typeof q.correct_answer === 'string' && q.correct_answer.length === 1 && ['A','B','C','D','E'].includes(q.correct_answer)
             );

             if (validQuestions.length !== questions.length) {
                  console.warn(`Dikkat: '${fileInfo.filePath}' dosyasındaki bazı sorular beklenen formatta değil. Toplam: ${questions.length}, Geçerli: ${validQuestions.length}`);
             }


            console.log(`Yüklendi: ${fileInfo.filePath}, ${validQuestions.length} geçerli soru.`);
            return validQuestions;

        } catch (error) {
            console.error(`Dosya yüklenirken veya işlenirken hata oluştu: ${error}`);
            alert(`Dosya yüklenirken veya işlenirken bir hata oluştu: ${fileInfo.filePath}. Konsolu kontrol edin.`);
            return [];
        }
    });

    const results = await Promise.all(fetchPromises);
    allQuestions = results.flat();

     console.log('Toplam geçerli yüklü soru:', allQuestions.length);

    if (allQuestions.length === 0) {
         alert('Hiç geçerli soru yüklenemedi. Lütfen JSON dosyalarını ve formatlarını kontrol edin.');
         startQuizBtn.disabled = true;
         reviewWrongBtn.style.display = 'none';
         clearWrongBtn.style.display = 'none';
    } else {
         startQuizBtn.disabled = false;
         updateWrongAnswersList();
    }
}


// --- Olay Dinleyicileri ---

startQuizBtn.addEventListener('click', () => initializeQuiz(false));
nextQuestionBtn.addEventListener('click', nextQuestion);
backToMenuBtn.addEventListener('click', showMainMenu);
clearWrongBtn.addEventListener('click', clearWrongAnswers);
reviewWrongBtn.addEventListener('click', () => initializeQuiz(true));

// Yeni: İstatistik butonu olay dinleyicisi
showStatsBtn.addEventListener('click', showStatsModal);
// Yeni: Modal kapatma butonu ve dışarı tıklama olay dinleyicisi
closeButton.addEventListener('click', hideStatsModal);
window.addEventListener('click', (event) => {
    if (event.target === statsModal) {
        hideStatsModal();
    }
});


// --- Uygulamayı Başlat ---

document.addEventListener('DOMContentLoaded', () => {
    loadWrongAnswers();
    loadStats(); // Yeni: İstatistikleri yükle
    showMainMenu();
    loadQuestions();
    quizArea.dataset.isReviewingWrong = 'false';
});
