// --- Global State ---
let db = {}, currentCategory = 'basic', currentMode = 'speaking', currentPair = {}, targetObj = {}, isLTarget = false, streak = 0;
let isRecording = false, speechRate = 0.8; 
let currentProvider = 'gemini'; // 'gemini', 'openai', 'web'

// --- Init ---
window.onload = async () => {
    if(typeof injectUI === 'function') injectUI();

    await loadDb();
    initCanvas(); 
    window.addEventListener('resize', initCanvas);
    
    // 設定読み込み
    const p = localStorage.getItem('lr_provider');
    if(p) currentProvider = p;
    
    const kGemini = localStorage.getItem('gemini_key');
    const kOpenAI = localStorage.getItem('openai_key');
    const rate = localStorage.getItem('lr_rate');

    // UI初期反映
    if(document.getElementById('api-key-gemini')) document.getElementById('api-key-gemini').value = kGemini || '';
    if(document.getElementById('api-key-openai')) document.getElementById('api-key-openai').value = kOpenAI || '';
    if(document.getElementById('ai-provider')) {
        document.getElementById('ai-provider').value = currentProvider;
        toggleProviderSettings(); 
    }
    if(rate) speechRate = parseFloat(rate);
    
    // Geminiモデル取得
    if(currentProvider === 'gemini' && kGemini) fetchModels(true);
    
    populateCategorySelect(); 
    changeCategory();
};

// --- Settings Logic ---
function toggleProviderSettings() {
    const p = document.getElementById('ai-provider').value;
    document.querySelectorAll('.provider-config').forEach(d => d.style.display = 'none');
    document.getElementById(`config-${p}`).style.display = 'block';
}

function closeSettings() { document.getElementById('settings-modal').style.display='none'; }
function openSettings() { 
    document.getElementById('settings-modal').style.display='flex'; 
    document.getElementById('ai-provider').value = currentProvider;
    toggleProviderSettings();
}

function saveSettings() {
    currentProvider = document.getElementById('ai-provider').value;
    localStorage.setItem('lr_provider', currentProvider);

    const kGemini = document.getElementById('api-key-gemini').value;
    const kOpenAI = document.getElementById('api-key-openai').value;
    
    if(kGemini) localStorage.setItem('gemini_key', kGemini);
    if(kOpenAI) localStorage.setItem('openai_key', kOpenAI);

    speechRate = parseFloat(document.getElementById('speech-rate').value);
    localStorage.setItem('lr_rate', speechRate);
    
    closeSettings();
}

// --- Game Logic (Category, Mode, SRS) ---
function changeCategory() {
    const sel = document.getElementById('category-select');
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
    document.querySelector('.container').classList.remove('shake-anim','pop-anim');
    document.querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('success'));

    // SRS Filter
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
    if(currentMode==='listening'){
        tEl.innerText="?????"; tEl.classList.add('blur');
        document.getElementById('choice-l').innerText=currentPair.l.w; document.getElementById('choice-r').innerText=currentPair.r.w;
        document.getElementById('opponent-word').innerText="???";
        setTimeout(speakModel,500);
    }else{
        tEl.innerText=targetObj.w; tEl.classList.remove('blur');
        document.getElementById('opponent-word').innerText=(isLTarget?currentPair.r:currentPair.l).w;
        renderPhonemes();
        if(autoStart) setTimeout(toggleRecord,500);
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
    saveDb();
}

// Utils
function updateStreakDisplay(){ document.getElementById('streak-disp').innerText=streak; }
function speakModel(){ const u=new SpeechSynthesisUtterance(targetObj.w); u.lang='en-US'; u.rate=speechRate; window.speechSynthesis.speak(u); }
function toggleDarkMode(){ document.body.classList.toggle('dark-mode'); }