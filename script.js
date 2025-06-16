// HTML checkbox value'ları ile JSON dosya yolları ve JSON içindeki 'file' alanının uzun değerlerinin eşleşmesi
const fileMappings = {
    "Medu-3": { filePath: "medu3.json", jsonFileValue: "DN4-CERRAHİ BİLİMLER 2. DÖNGÜ (3.GRUP) SINAVI" },
    "Medu-4": { filePath: "medu4.json", jsonFileValue: "DN4-CERRAHİ BİLİMLER 1. DÖNGÜ (4.GRUP) SINAVI" },
    "Medu-9": { filePath: "medu9.json", jsonFileValue: "DN4-CERRAHİ BİLİMLER 3. DÖNGÜ (1.GRUP) SINAVI" }
    // Buraya diğer Medu dosyalarınız için benzer eşleşmeler ekleyebilirsiniz
    // Örnek: "Medu-X": { filePath: "meduX.json", jsonFileValue: "JSON DOSYASINDAKİ UZUN 'file' DEĞERİ" }
};

// HTML elementlerini seçme
const mainMenu = document.getElementById('main-menu');
const quizArea = document.getElementById('quiz-area');
const endScreen = document.getElementById('end-screen');
const fileCheckboxes = document.querySelectorAll('.file-checkbox');
const modeRadios = document.querySelectorAll('input[name="quiz-mode"]');
const startQuizBtn = document.getElementById('start-quiz-btn');
const reviewWrongBtn = document.getElementById('review-wrong-btn');
const wrongAnswersSummary = document.getElementById('wrong-answers-summary');
const wrongAnswersList = document.getElementById('wrong-answers-list');
const wrongCountSpan = document.getElementById('wrong-count');
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
let quizPool = []; // Mevcut quiz için soru havuzu
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
        return;
    }

    wrongAnswersSummary.style.display = 'block';
    reviewWrongBtn.style.display = 'block';


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
            listItem.textContent = `${displayQuestionText} [${Object.keys(fileMappings).find(key => fileMappings[key].jsonFileValue === question.file) || question.file}]`; // Hangi dosyadan geldiğini göster (kısa veya uzun isimle)
             // İsterseniz bu liste elemanlarına tıklayarak ilgili soruyu gösterme özelliği eklenebilir
            wrongAnswersList.appendChild(listItem);
        }
    });
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

     finalScorePara.textContent = `Toplam ${totalCount} sorudan ${correctCount} tanesini doğru cevapladınız. Yanlış yaptığınız soruları ana menüdeki listeden görebilirsiniz.`;

     // Bitiş ekranındaki düğmelere olay dinleyicileri ekle
     // Önceki dinleyicileri kaldırmak daha iyi bir pratik olabilir, ancak bu basit uygulama için sorun yaratmaz.
     document.getElementById('restart-from-end-btn').onclick = initializeQuiz; // Aynı ayarlarla yeniden başlat
     document.getElementById('back-to-menu-from-end-btn').onclick = showMainMenu; // Ana menüye dön

      // Review wrong button'ı sadece ana menüdeyken gösterecek şekilde updateWrongAnswersList zaten ayarlıyor.
}


// --- Quiz Mantığı ---

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

    // Quiz havuzunu oluştur
    // JSON'daki UZUN file değerine göre filtreleme yap
    let potentialQuizPool = allQuestions.filter(q => selectedFilesJsonValues.includes(q.file));


    if (isReviewingWrong) {
         // Sadece yanlış yapılanları tekrar çöz modu için havuzu filtrele
         quizPool = potentialQuizPool.filter(q => wrongAnswerIds.includes(q.id));
         if (quizPool.length === 0) {
             alert('Tekrar çözmek için yanlış yaptığınız soru bulunmamaktadır.');
             showMainMenu(); // Ana menüye dön
             return;
         }
         // Bu modda quiz havuzu zaten sadece yanlışları içerir.
    } else if (selectedMode === 'once') {
        // 'Bir kez sorulacak' modu: Seçili dosyalardaki tüm soruları havuza ekle
        quizPool = potentialQuizPool;
    } else if (selectedMode === 'repeatWrong') {
        // 'Yanlışlar tekrar sorulacak' modu: Seçili dosyalardaki tüm soruları havuza ekle
        quizPool = potentialQuizPool;
        // originalQuizPoolIds artık kullanılmıyor, wrongAnswerIds listesi yeterli
    } else {
         // Varsayılan olarak tek geçiş modu
         quizPool = potentialQuizPool;
    }

     if (quizPool.length === 0) {
         alert('Seçtiğiniz konularda soru bulunamadı veya yüklenemedi.');
         showMainMenu();
         return;
     }


    shuffleArray(quizPool); // Quiz havuzunu karıştır
    currentQuestionIndex = 0; // İlk soruyla başla
    totalQSpan.textContent = quizPool.length; // Toplam soru sayısını ayarla

    showQuizArea();
    displayCurrentQuestion();
}


function displayCurrentQuestion() {
    if (currentQuestionIndex >= quizPool.length) {
        endQuiz(); // Tüm sorular bittiğinde quiz'i bitir
        return;
    }

    const question = quizPool[currentQuestionIndex];
    currentQSpan.textContent = currentQuestionIndex + 1;

    // Soru metnini göster
    questionText.textContent = question.question;

    // Şık alanını temizle ve önceki olay dinleyicilerini kaldır (butonları silerek)
    optionsContainer.innerHTML = '';
    feedbackDiv.textContent = ''; // Geri bildirimi temizle
    explanationDiv.style.display = 'none'; // Açıklamayı gizle
    nextQuestionBtn.style.display = 'none'; // Sonraki soru düğmesini gizle

    // Şıkları karıştır ve butonları oluştur
    // JSON'daki options objesini array formatına dönüştürerek karıştır
    const shuffledOptions = shuffleArray(Object.keys(question.options).map(key => ({
        key: key,
        text: question.options[key]
    })));

    shuffledOptions.forEach(option => {
        const button = document.createElement('button');
        button.classList.add('option-button');
        button.textContent = `${option.key}) ${option.text}`;
        button.dataset.key = option.key; // Hangi şık olduğunu kaydet
        button.addEventListener('click', handleAnswerClick); // Olay dinleyicisi ekle
        optionsContainer.appendChild(button);
    });
}

function handleAnswerClick(event) {
    const selectedButton = event.target;
    const selectedKey = selectedButton.dataset.key;
    const currentQuestion = quizPool[currentQuestionIndex];
    const correctAnswerKey = currentQuestion.correct_answer; // JSON'daki alana göre kullanıyoruz

    // Tüm şıkları pasif hale getir
    Array.from(optionsContainer.children).forEach(button => {
        button.disabled = true;
    });

    // Seçilen ve doğru şıkları işaretle ve geri bildirim ver
    if (selectedKey === correctAnswerKey) {
        selectedButton.classList.add('correct');
        feedbackDiv.textContent = 'Doğru!';
        feedbackDiv.style.color = 'green';

        // Eğer bu soru yanlışlar listesindeyse, doğru cevaplandığı için listeden çıkar
        wrongAnswerIds = wrongAnswerIds.filter(id => id !== currentQuestion.id);
        saveWrongAnswers(); // localStorage'ı güncelle


    } else {
        selectedButton.classList.add('wrong');
        feedbackDiv.textContent = 'Yanlış.';
        feedbackDiv.style.color = 'red';

        // Doğru şıkkı bul ve yeşil yap
        Array.from(optionsContainer.children).forEach(button => {
            if (button.dataset.key === correctAnswerKey) {
                button.classList.add('correct');
            }
        });

        // Yanlış yapılanlar listesine ekle (ID'yi ekle)
        wrongAnswerIds.push(currentQuestion.id);
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
}

function nextQuestion() {
    const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;

    if (selectedMode === 'once') {
         // 'Once' modunda, doğru cevaplanan soru havuzdan fiilen çıkarılır (bir daha sorulmaz)
         // Bunu quizPool dizisini filtreleyerek yapabiliriz. Ancak index takibi karışır.
         // Daha basit yaklaşım: Sadece indeksi artır ve zaten doğru cevaplanmışsa atla
         currentQuestionIndex++;
         // Doğru cevaplananları atlama mantığı displayCurrentQuestion içinde olmalıydı ama en basiti
         // quizPool'u her initializeQuiz'de yeniden oluşturmak. Mevcut kod zaten öyle yapıyor.
         // O yüzden burada sadece indeksi artırmak yeterli.
         displayCurrentQuestion();

    } else if (selectedMode === 'repeatWrong') {
        // 'repeatWrong' modunda, tüm sorular bir kez sorulur, yanlışlar işaretlenir.
        // İlk turda indeksi artır.
        currentQuestionIndex++;
        displayCurrentQuestion();

        // İkinci tur (sadece yanlışlar) mantığı initializeQuiz(true) içinde işleniyor.
        // Yani nextQuestion sadece ilk turda normal ilerler.
        // Eğer quizPool sadece yanlışlardan oluşuyorsa (reviewWrongBtn ile başlatıldıysa),
        // o havuz bitene kadar rastgele yanlış sorar.
    } else {
         // Varsayılan tek geçiş
         currentQuestionIndex++;
         displayCurrentQuestion();
    }
}


function endQuiz() {
     // Quiz bittiğinde bitiş ekranını göster
     // Hesaplama mantığını basitleştirelim: Quiz havuzundaki toplam soru sayısı ve localStorage'daki toplam yanlış sayısı.
     // Bu tam olarak bu oturumdaki doğru sayısını göstermese de, genel performansı yansıtır.
     // Eğer daha doğru bir skor isteniyorsa, her oturumun yanlışlarını ayrı takip etmek gerekir, bu da localStorage yapısını veya başka bir depolama yöntemini karmaşıklaştırır.
     // Şimdilik, toplam soru sayısını velocalStorage'daki genel yanlış sayısını gösterelim.

     const totalCount = quizPool.length; // Bu oturumda sorulan toplam soru sayısı
     const uniqueWrongCountInLocalStorage = new Set(wrongAnswerIds).size; // Tüm oturumlarda yanlış yapılan benzersiz soru sayısı

     // Gösterilen skor, bu oturumda sorulan sorulardan, localStorage'daki yanlışlar listesinde olanların düşülmesiyle elde edilebilir.
     const wrongInThisPool = quizPool.filter(q => wrongAnswerIds.includes(q.id)).length;
     const correctInThisPool = totalCount - wrongInThisPool;


     showEndScreen(correctInThisPool, totalCount);

}


// --- Veri Yükleme ---

// Tüm JSON dosyalarını yükle ve tek bir dizide birleştir
async function loadQuestions() {
    const fetchPromises = Object.keys(fileMappings).map(async shortName => {
        const fileInfo = fileMappings[shortName];
        try {
            const response = await fetch(fileInfo.filePath);
            if (!response.ok) {
                throw new Error(`Dosya yüklenemedi: ${fileInfo.filePath}, status: ${response.status}`);
            }
            const questions = await response.json();
            console.log(`Yüklendi: ${fileInfo.filePath}, ${questions.length} soru.`);
            // JSON'daki her soru objesine, karşılık geldiği KISA dosya adını ekle (HTML ile eşleşmesi için)
            // JSON'daki 'file' alanının UZUN değerini saklıyoruz (karşılaştırma için)
             return questions.map(q => ({
                 ...q,
                 // 'file' alanı artık HTML checkbox değeri ile eşleşen KISA isim olacak
                 // Orijinal JSON'daki uzun değeri ise başka bir alanda saklayabiliriz veya sadece filtrelemede kullanırız
                 // Filtrelemede orijinal uzun değeri kullanmak daha doğru, o yüzden q.file alanını değiştirmeyelim
                 // Sadece fileMappings objesinde eşleşmeyi tutalım ve filtreleme sırasında kullanalım.
                 // JSON'daki 'file' değeri uzun haliyle kalacak.
             }));


        } catch (error) {
            console.error(`Hata oluştu: ${error}`);
            alert(`Dosya yüklenirken bir hata oluştu: ${fileInfo.filePath}. Lütfen dosya adlarının ve formatının doğru olduğundan emin olun.`);
            return []; // Hata durumunda boş dizi döndür
        }
    });

    // Tüm yükleme işlemleri tamamlanana kadar bekle
    const results = await Promise.all(fetchPromises);

    // Tüm soruları tek bir dizide birleştir
    // JSON'dan yüklenen soruların 'file' alanı hala uzun isimleri içeriyor.
    // Bu diziyi kullanacağız.
    allQuestions = results.flat(); // flat() iç içe dizileri düzleştirir
     console.log('Toplam yüklü soru:', allQuestions.length);

    if (allQuestions.length === 0) {
         alert('Hiç soru yüklenemedi. Lütfen JSON dosyalarını kontrol edin.');
         startQuizBtn.disabled = true; // Başla düğmesini devre dışı bırak
         reviewWrongBtn.style.display = 'none'; // Yanlışları çöz düğmesini gizle
    } else {
         startQuizBtn.disabled = false; // Başla düğmesini etkinleştir
         // updateWrongAnswersList zaten yanlışlar varsa reviewWrongBtn'ı gösterecek
         updateWrongAnswersList(); // Sorular yüklendikten sonra yanlış listesini yeniden çiz
    }
}


// --- Olay Dinleyicileri ---

startQuizBtn.addEventListener('click', () => initializeQuiz(false)); // Normal quiz başlangıcı
nextQuestionBtn.addEventListener('click', nextQuestion);
backToMenuBtn.addEventListener('click', showMainMenu);
// reviewWrongBtn olay dinleyicisi yukarıda özel olarak tanımlanmış durumda

// --- Uygulamayı Başlat ---

// Sayfa yüklendiğinde:
// 1. localStorage'dan yanlışları yükle ve listeyi güncelle
// 2. Ana menüyü göster
// 3. JSON dosyalarını yüklemeye başla (arka planda)

document.addEventListener('DOMContentLoaded', () => {
    loadWrongAnswers(); // Yanlışları yükle ve listeyi güncelle
    showMainMenu(); // Ana menüyü göster (bu aynı zamanda loadWrongAnswers'ı tekrar çağırır, sorun değil)
     loadQuestions(); // Sayfa yüklendikten hemen sonra soruları yüklemeye başla
});