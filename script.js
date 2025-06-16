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


let allQuestions = []; // Tüm soruları saklar
let quizPool = []; // Seçilen dosya ve aralığa göre filtrelenmiş tüm sorular (Sonsuz mod ana havuzu)
let currentLoopQuestions = []; // Sonsuz döngü modu için mevcut turdaki sorular veya diğer modlarda quiz havuzu
let currentQuestionIndex = 0; // Şu anki sorunun indeksi (tur içindeki sıra)
let correctCountInCurrentQuiz = 0; // Bu oturumda doğru cevaplanan soru sayısı


// localStorage'dan yanlış yapılanları yükle (Varsayılan olarak boş dizi)
let wrongAnswerIds = JSON.parse(localStorage.getItem('wrongAnswerIds') || '[]');

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
     // Önceki dinleyicileri kaldırmak daha iyi bir pratik olabilir, ancak bu basit uygulama için sorun yaratmaz.
     document.getElementById('restart-from-end-btn').onclick = () => {
        // Sonsuz modda "Yeni Quize Başla" aynı ayarlarla devam eder (başlatma fonskiyonunu normal çağır)
        // Diğer modlarda "Yeni Quize Başla" ana menüye döner.
        if (selectedMode === 'infinite') {
             initializeQuiz(false); // initializeQuiz zaten quizPool'u yeniden oluşturacak
        } else {
             showMainMenu(); // Diğer modlarda ana menüye dön
        }
     }
     document.getElementById('back-to-menu-from-end-btn').onclick = showMainMenu; // Ana menüye dön
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

    // Seçilen dosya KISA isimlerini al (checkbox value'ları)
    const selectedFilesShortNames = Array.from(fileCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

     // Seçilen KISA isimlere karşılık gelen UZUN JSON file değerlerini bul
     const selectedFilesJsonValues = selectedFilesShortNames.map(shortName => fileMappings[shortName].jsonFileValue);


    if (selectedFilesShortNames.length === 0 && !isReviewingWrong) {
        alert('Lütfen quiz yapmak istediğiniz en least bir konu seçin.');
        return;
    }

    const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;
    const selectedRange = document.querySelector('input[name="question-range"]:checked').value;

    // Seçilen dosyalara göre soruları filtrele (uzun file değeri üzerinden)
    let filteredByFiles = allQuestions.filter(q => selectedFilesJsonValues.includes(q.file));

    // Seçilen aralığa göre filtrele (eğer "Tüm Sorular" seçili değilse ve tekrar çözme modu değilse)
    let filteredByRange = filteredByFiles; // Varsayılan olarak dosya filtresi geçerli

    if (selectedRange !== 'all' && !isReviewingWrong) {
         filteredByRange = filteredByFiles.filter(q => {
            const qNumber = getQuestionNumberFromId(q.id);
            if (isNaN(qNumber)) return false; // Soru numarası alınamazsa ele

            // Aralıkları kontrol et
            if (selectedRange === '1-25') return qNumber >= 1 && qNumber <= 25;
            if (selectedRange === '26-50') return qNumber >= 26 && qNumber <= 50;
            if (selectedRange === '51-75') return qNumber >= 51 && qNumber <= 75;
            if (selectedRange === '76+') return qNumber >= 76;
            return false; // Tanımlanmamış aralık
         });
    }


    // Son quiz havuzunu belirle
    if (isReviewingWrong) {
         // Sadece yanlış yapılanları tekrar çöz modu için havuzu filtrele
         quizPool = filteredByRange.filter(q => wrongAnswerIds.includes(q.id));
         if (quizPool.length === 0) {
             alert('Tekrar çözmek için yanlış yaptığınız soru bulunmamaktadır.');
             showMainMenu(); // Ana menüye dön
             return;
         }
         // Bu modda quiz havuzu zaten sadece yanlışları içerir.
    } else {
        // Diğer modlar (once, repeatWrong, infinite) için ana havuz
        quizPool = filteredByRange;
    }

    if (quizPool.length === 0) {
         alert('Seçtiğiniz kriterlere uygun soru bulunamadı.');
         showMainMenu();
         return;
     }

    // Mevcut tur sorularını belirle
    if (selectedMode === 'infinite' || isReviewingWrong) {
         // Sonsuz mod veya yanlışları tekrar çöz modu: quizPool'un kopyası tur havuzuna
        currentLoopQuestions = [...quizPool];
    } else {
        // Once veya repeatWrong modu (ilk tur): quizPool'un kopyası tur havuzuna
        currentLoopQuestions = [...quizPool];
    }


    shuffleArray(currentLoopQuestions); // Tur havuzunu karıştır
    currentQuestionIndex = 0; // Tur içi indeksi sıfırla
    correctCountInCurrentQuiz = 0; // Bu quizdeki doğru sayacını sıfırla

    showQuizArea();
    displayCurrentQuestion();
}


function displayCurrentQuestion() {
    const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;

    // Eğer mevcut tur havuzu boşsa
    if (currentLoopQuestions.length === 0) {
        if (selectedMode === 'infinite') {
            // Sonsuz moddaysak, ana havuzu (quizPool) tekrar karıştırıp tur havuzuna ekle
            currentLoopQuestions = [...quizPool];
            shuffleArray(currentLoopQuestions);
             currentQuestionIndex = 0; // Sonsuz modda tur indeksi sıfırlanır
             correctCountInCurrentQuiz = 0; // Sonsuz modda tur doğru sayısı sıfırlanır
            console.log("Sonsuz mod: Yeni tur başladı!"); // Konsola bilgi yaz
        } else {
            // Diğer modlarda tur havuzu bittiğinde quiz biter
            endQuiz(); // Tüm sorular bittiğinde quiz'i bitir
            return; // Fonksiyonu burada sonlandır
        }
    }

     // Tur havuzundan sıradaki soruyu al (listenin başından alıp çıkaralım)
    const question = currentLoopQuestions.shift(); // Dizinin ilk elemanını alır ve diziden çıkarır

     // Soru sayısı gösterimi
      if (selectedMode === 'infinite') {
           // Sonsuz modda sadece turdaki sırayı göster (Toplam tur sayısı anlamsız)
           questionCounter.textContent = `Soru: ${currentQuestionIndex + 1}`;
      } else {
           // Diğer modlarda turdaki sırayı ve toplam quiz havuzunu göster
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
    // JSON'daki options objesini { key: 'A', text: 'Metin A' } gibi objeler dizisine dönüştür
    const optionsArray = Object.keys(question.options).map(key => ({
        key: key, // Orijinal anahtar (A, B, C...)
        text: question.options[key] // Şık metni
    }));

    const shuffledOptions = shuffleArray(optionsArray);

    // Yeni etiketler (A, B, C, D, E) oluşturmak için bir dizi
    const newLabels = ['A', 'B', 'C', 'D', 'E'];


    shuffledOptions.forEach((option, index) => { // Karıştırılmış şıklar üzerinde döngü
        const button = document.createElement('button');
        button.classList.add('option-button');

        // Butonun görünen metni: Yeni etiket +) Şık metni
        button.textContent = `${newLabels[index]}) ${option.text}`;

        // Butonun dataset'inde orijinal anahtarı sakla (Doğruluk kontrolü için)
        button.dataset.originalKey = option.key;
        button.dataset.questionId = question.id; // Hangi soruya ait olduğunu da sakla

        button.addEventListener('click', handleAnswerClick); // Olay dinleyicisi ekle
        optionsContainer.appendChild(button);
    });
}

function handleAnswerClick(event) {
    const selectedButton = event.target;
    // Tıklanan butonun dataset'indeki orijinal anahtarı al
    const selectedOriginalKey = selectedButton.dataset.originalKey;
     const questionId = selectedButton.dataset.questionId; // Soru ID'sini al

    // allQuestions dizisinden soruyu bul
    const currentQuestion = allQuestions.find(q => q.id === questionId);
    if (!currentQuestion) {
         console.error("Soru bulunamadı:", questionId);
         return; // Soru bulunamazsa hata ver ve dur
    }

    const correctAnswerKey = currentQuestion.correct_answer; // JSON'daki alana göre kullanıyoruz (Her zaman "A")

    // Tüm şıkları pasif hale getir
    Array.from(optionsContainer.children).forEach(button => {
        button.disabled = true;
    });

    // Seçilen ve doğru şıkları işaretle ve geri bildirim ver
    // Orijinal anahtarı doğru cevap anahtarıyla karşılaştır
    if (selectedOriginalKey === correctAnswerKey) { // selectedOriginalKey === "A" mı?
        selectedButton.classList.add('correct');
        feedbackDiv.textContent = 'Doğru!';
        feedbackDiv.style.color = 'green';
        correctCountInCurrentQuiz++; // Bu quizdeki doğru sayısını artır


        // Eğer bu soru yanlışlar listesindeyse, doğru cevaplandığı için listeden çıkar
        wrongAnswerIds = wrongAnswerIds.filter(id => id !== questionId);
        saveWrongAnswers(); // localStorage'ı güncelle


    } else {
        selectedButton.classList.add('wrong');
        feedbackDiv.textContent = 'Yanlış.';
        feedbackDiv.style.color = 'red';

        // Doğru şıkkı bul ve yeşil yap
        // Doğru şık, orijinal anahtarı correct_answer olan şıktır (yani orijinal A şıkkı)
        Array.from(optionsContainer.children).forEach(button => {
            if (button.dataset.originalKey === correctAnswerKey) { // dataset.originalKey === "A" olan butonu bul
                button.classList.add('correct');
            }
        });

        // Yanlış yapılanlar listesine ekle (ID'yi ekle)
        wrongAnswerIds.push(questionId);
        saveWrongAnswers(); // localStorage'ı güncelle
    }

    // Açıklamayı göster (varsa)
    if (currentQuestion.explanation) {
        explanationDiv.textContent = 'Açıklama: ' + currentQuestion.explanation;
        explanationDiv.style.display = 'block';
    } else {
         explanationDiv.style.display = 'none';
    }

    // Sonraki soru düğmesini göster
    nextQuestionBtn.style.display = 'block';

     // currentQuestionIndex'i burada artırmıyoruz, sadece 'Sonraki Soru' butonuna basınca artacak.
     // Sonsuz modda index mantığı displayCurrentQuestion içinde yönetiliyor (shift ile).
}

function nextQuestion() {
     // Sadece gösterimdeki soru sayısını artır (displayCurrentQuestion içinde tur bitince sıfırlanacak)
     currentQuestionIndex++;
     // currentLoopQuestions'tan sıradaki soruyu çekecek ve gösterecek olan fonksiyonu çağır
     displayCurrentQuestion();

    // Not: Sonsuz modda quiz gerçekte hiç bitmez, hep displayCurrentQuestion çağrılır.
    // Diğer modlarda currentLoopQuestions boşalınca displayCurrentQuestion içindeki kontrol endQuiz'i çağırır.
}


function endQuiz() {
     // Quiz bittiğinde bitiş ekranını göster
     // Doğru hesaplama: Bu oturumdaki 'correctCountInCurrentQuiz' değeri
     const totalCount = quizPool.length; // Bu oturumda seçilen toplam soru sayısı


     showEndScreen(correctCountInCurrentQuiz, totalCount);

}


// --- Veri Yükleme ---

// Tüm JSON dosyalarını yükle ve tek bir dizide birleştir
async function loadQuestions() {
    const fetchPromises = Object.keys(fileMappings).map(async shortName => {
        const fileInfo = fileMappings[shortName];
        try {
            const response = await fetch(fileInfo.filePath);
            if (!response.ok) {
                // 404 hatası gibi durumları daha spesifik yakalayabiliriz
                if (response.status === 404) {
                    console.error(`Dosya bulunamadı: ${fileInfo.filePath}`);
                    // Kullanıcıya hangi dosyanın bulunamadığını söyle
                    alert(`Hata: '${fileInfo.filePath}' dosyası bulunamadı. Lütfen dosya adının doğru olduğundan emin olun.`);
                } else {
                    console.error(`Dosya yüklenirken HTTP hatası: ${fileInfo.filePath}, status: ${response.status}`);
                     alert(`Hata: '${fileInfo.filePath}' yüklenirken bir HTTP hatası oluştu (Status: ${response.status}).`);
                }
                return []; // Hata durumunda boş dizi döndür
            }
            const questions = await response.json();

            // JSON formatını doğrula: Dizide mi? Objeler doğru yapıda mı?
             if (!Array.isArray(questions)) {
                 console.error(`JSON format hatası: ${fileInfo.filePath} bir dizi değil.`);
                 alert(`Hata: '${fileInfo.filePath}' dosyasının formatı hatalı (dizi olmalı).`);
                 return [];
             }
             // Temel alanların olup olmadığını kontrol et
            const validQuestions = questions.filter(q =>
                 typeof q === 'object' && q !== null && // Obje mi?
                 typeof q.id === 'string' && q.id.length > 0 && // ID var mı?
                 typeof q.file === 'string' && q.file.length > 0 && // file var mı?
                 typeof q.question === 'string' && q.question.length > 0 && // question var mı?
                 typeof q.options === 'object' && q.options !== null && Object.keys(q.options).length >= 5 && // options obje mi ve en az 5 şık var mı?
                 typeof q.correct_answer === 'string' && q.correct_answer.length === 1 && ['A','B','C','D','E'].includes(q.correct_answer) // correct_answer A,B,C,D,E'den biri mi?
             );

             if (validQuestions.length !== questions.length) {
                  console.warn(`Dikkat: '${fileInfo.filePath}' dosyasındaki bazı sorular beklenen formatta değil. Toplam: ${questions.length}, Geçerli: ${validQuestions.length}`);
             }


            console.log(`Yüklendi: ${fileInfo.filePath}, ${validQuestions.length} geçerli soru.`);
            // JSON'dan yüklenen soruların 'file' alanı hala uzun isimleri içeriyor, bu şekilde kalsın.
            return validQuestions; // Sadece geçerli soruları döndür

        } catch (error) {
            console.error(`Dosya yüklenirken veya işlenirken hata oluştu: ${error}`);
            alert(`Dosya yüklenirken veya işlenirken bir hata oluştu: ${fileInfo.filePath}. Konsolu kontrol edin.`);
            return []; // Hata durumunda boş dizi döndür
        }
    });

    // Tüm yükleme işlemleri tamamlanana kadar bekle
    const results = await Promise.all(fetchPromises);

    // Tüm geçerli soruları tek bir dizide birleştir
    allQuestions = results.flat();

     console.log('Toplam geçerli yüklü soru:', allQuestions.length);

    if (allQuestions.length === 0) {
         alert('Hiç geçerli soru yüklenemedi. Lütfen JSON dosyalarını ve formatlarını kontrol edin.');
         startQuizBtn.disabled = true; // Başla düğmesini devre dışı bırak
         reviewWrongBtn.style.display = 'none'; // Yanlışları çöz düğmesini gizle
         clearWrongBtn.style.display = 'none'; // Temizle düğmesini gizle
    } else {
         startQuizBtn.disabled = false; // Başla düğmesini etkinleştir
         // updateWrongAnswersList zaten yanlışlar varsa reviewWrongBtn ve clearWrongBtn'ı gösterecek
         updateWrongAnswersList(); // Sorular yüklendikten sonra yanlış listesini yeniden çiz
    }
}


// --- Olay Dinleyicileri ---

startQuizBtn.addEventListener('click', () => initializeQuiz(false)); // Normal quiz başlangıcı
nextQuestionBtn.addEventListener('click', nextQuestion);
backToMenuBtn.addEventListener('click', showMainMenu);
clearWrongBtn.addEventListener('click', clearWrongAnswers); // Yanlışları temizle butonuna dinleyici
// reviewWrongBtn olay dinleyicisi yukarıda özel olarak tanımlanmış durumda

// --- Uygulamayı Başlat ---

// Sayfa yüklendiğinde:
// 1. localStorage'dan yanlışları yükle ve listeyi güncelle
// 2. Ana menüyü göster
// 3. JSON dosyalarını yüklemeye başla (arka planda)

document.addEventListener('DOMContentLoaded', () => {
    loadWrongAnswers(); // Yanlışları yükle ve listeyi güncelle
    showMainMenu(); // Ana menüyü göster
     loadQuestions(); // Sayfa yüklendikten hemen sonra soruları yüklemeye başla
});
