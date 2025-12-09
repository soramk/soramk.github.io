// --- Global State Definitions (The Single Source of Truth) ---

// 1. App State
var db = {};
var currentCategory = 'basic';
var currentMode = 'speaking';
var currentPair = {};
var targetObj = {};
var isLTarget = false;
var streak = 0;
var speechRate = 0.8;
var currentProvider = 'gemini'; // 'gemini', 'openai', 'web'

// 2. Audio & Recording State
var isRecording = false;
var hasSpoken = false;
var silenceStart = 0;
var mediaRecorder = null;
var audioChunks = [];
var userAudioBlob = null;
var audioCtx = null;
var analyser = null;
var dataArray = null;
var canvasCtx = null;
var currentStream = null; // ★追加: マイク入力ストリーム管理用

// 3. Constants
const VAD_THRESHOLD = 15;
const VAD_SILENCE = 1200;

// 4. Visualizer State
var visMode = 'wave'; 

// --- Init Logic ---
window.onload = async () => {
    if(typeof injectUI === 'function') injectUI();

    if(typeof loadDb === 'function') await loadDb();
    
    if(typeof initCanvas === 'function') {
        initCanvas();
        window.addEventListener('resize', initCanvas);
    }
    
    const p = localStorage.getItem('lr_provider');
    if(p) currentProvider = p;
    
    const kGemini = localStorage.getItem('gemini_key');
    const kOpenAI = localStorage.getItem('openai_key');
    const rate = localStorage.getItem('lr_rate');

    const elKeyG = document.getElementById('api-key-gemini');
    const elKeyO = document.getElementById('api-key-openai');
    const elProv = document.getElementById('ai-provider');
    
    if(elKeyG) elKeyG.value = kGemini || '';
    if(elKeyO) elKeyO.value = kOpenAI || '';
    if(elProv) {
        elProv.value = currentProvider;
        if(typeof toggleProviderSettings === 'function') toggleProviderSettings(); 
    }
    if(rate) speechRate = parseFloat(rate);
    
    if(currentProvider === 'gemini' && kGemini && typeof fetchModels === 'function') fetchModels(true);
    
    if(typeof populateCategorySelect === 'function') populateCategorySelect(); 
    if(typeof changeCategory === 'function') changeCategory();
};

// --- Settings Logic ---
function toggleProviderSettings() {
    const el = document.getElementById('ai-provider');
    if(!el) return;
    const p = el.value;
    document.querySelectorAll('.provider-config').forEach(d => d.style.display = 'none');
    const target = document.getElementById(`config-${p}`);
    if(target) target.style.display = 'block';
}

function closeSettings() { document.getElementById('settings-modal').style.display='none'; }
function openSettings() { 
    document.getElementById('settings-modal').style.display='flex'; 
    const el = document.getElementById('ai-provider');
    if(el) {
        el.value = currentProvider;
        toggleProviderSettings();
    }
}

function saveSettings() {
    const elProv = document.getElementById('ai-provider');
    if(elProv) currentProvider = elProv.value;
    localStorage.setItem('lr_provider', currentProvider);

    const kGemini = document.getElementById('api-key-gemini').value;
    const kOpenAI = document.getElementById('api-key-openai').value;
    
    if(kGemini) localStorage.setItem('gemini_key', kGemini);
    if(kOpenAI) localStorage.setItem('openai_key', kOpenAI);

    speechRate = parseFloat(document.getElementById('speech-rate').value);
    localStorage.setItem('lr_rate', speechRate);
    
    closeSettings();
    if(currentProvider === 'gemini' && kGemini && typeof fetchModels === 'function') fetchModels(true);
}

// --- Game Logic ---
function changeCategory() {
    const sel = document.getElementById('category-select');
    if(!sel) return;
    if (Object.keys(db).length === 0) return;
    if (!db[sel.value]) { currentCategory = Object.keys(db)[0] || 'basic'; } else { currentCategory = sel.value; }
    streak=0; updateStreakDisplay(); nextQuestion();
}

function setMode(m) {
    currentMode=m; document.querySelectorAll('.mode-toggle button').forEach(b=>b.classList.remove('active'));
    if(m==='speaking'){
        document.getElementById('mode-speak').classList.add('active');
        document.getElementById('controls-speaking').style.display='grid';
        document.getElementById('controls-listening').style.display='none';
        document.getElementById('speaking-tools').style.display='block';
        document.getElementById('target-word').classList.remove('blur');
    }else{
        document.getElementById('mode-listen').classList.add('active');
        document.getElementById('controls-speaking').style.display='none';
        document.getElementById('controls-listening').style.display='grid';
        document.getElementById('speaking-tools').style.display='none';
        document.getElementById('target-word').classList.add('blur');
    }
    nextQuestion();
}

function nextQuestion(autoStart=false) {
    const list = db[currentCategory];
    if(!list || list.length === 0){ document.getElementById('target-word').innerText = "No Data"; return; }

    const fb=document.getElementById('feedback-area'); fb.innerText=currentMode==='speaking'?"Ready":"Listen & Select"; fb.className="feedback";
    document.getElementById('next-btn-spk').style.display='none'; document.getElementById('next-btn-lst').style.display='none'; document.getElementById('rec-btn').style.display='block';
    document.getElementById('replay-user-btn').style.display='none';
    
    const container = document.querySelector('.container');
    if(container) container.classList.remove('shake-anim','pop-anim');
    document.querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('success'));

    const now = Date.now();
    const dueItems = list.filter(item => !item.nextReview || item.nextReview <= now);
    
    if (dueItems.length > 0 && Math.random() > 0.3) {
        currentPair = dueItems[Math.floor(Math.random() * dueItems.length)];
    } else {
        currentPair = list[Math.floor(Math.random() * list.length)];
    }

    isLTarget = Math.random() > 0.5; 
    targetObj = isLTarget ? currentPair.l : currentPair.r;

    const tEl=document.getElementById('target-word');
    const opEl = document.getElementById('opponent-word');
    const chL = document.getElementById('choice-l');
    const chR = document.getElementById('choice-r');

    if(currentMode==='listening'){
        tEl.innerText="?????"; tEl.classList.add('blur');
        if(chL) chL.innerText=currentPair.l.w; 
        if(chR) chR.innerText=currentPair.r.w;
        if(opEl) opEl.innerText="???";
        setTimeout(speakModel,500);
    }else{
        tEl.innerText=targetObj.w; tEl.classList.remove('blur');
        if(opEl) opEl.innerText=(isLTarget?currentPair.r:currentPair.l).w;
        if(typeof renderPhonemes === 'function') renderPhonemes();
        if(autoStart && typeof toggleRecord === 'function') setTimeout(toggleRecord,500);
    }
}

function updateWordStats(isCorrect) {
    if (!currentPair.streak) currentPair.streak = 0;
    if (isCorrect) {
        currentPair.streak += 1;
        const bonusTime = 60 * 1000 * Math.pow(4, currentPair.streak); 
        currentPair.nextReview = Date.now() + bonusTime;
    } else {
        currentPair.streak = 0;
        currentPair.nextReview = Date.now();
    }
    if(typeof saveDb === 'function') saveDb();
}

function updateStreakDisplay(){ 
    const el = document.getElementById('streak-disp');
    if(el) el.innerText=streak; 
}
function speakModel(){ const u=new SpeechSynthesisUtterance(targetObj.w); u.lang='en-US'; u.rate=speechRate; window.speechSynthesis.speak(u); }
function toggleDarkMode(){ document.body.classList.toggle('dark-mode'); }