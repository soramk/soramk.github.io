/**
 * core_logic.js
 * アプリケーションの「データ状態（グローバル変数）」と「起動シーケンス」のみを管理します。
 * ※ 具体的な画面遷移やボタン動作の関数は core_dom_events.js や core_app_flow.js に記述されています。
 */

// --- 1. Global State Definitions (The Single Source of Truth) ---
// 他のファイルから window.db や window.isRecording としてアクセスされます

// App State
window.db = {};
window.currentCategory = 'basic';
window.currentMode = 'speaking';
window.currentPair = {}; // {l:{w...}, r:{w...}}
window.targetObj = {};   // {w: "light", ...}
window.isTargetL = true; // 正解はLかどうか
window.streak = 0;
window.speechRate = 0.8;
window.currentProvider = 'gemini'; // 'gemini', 'openai', 'web'

// Audio & Recording State
window.isRecording = false;
window.hasSpoken = false;
window.silenceStart = 0;
window.mediaRecorder = null;
window.audioChunks = [];
window.userAudioBlob = null;
window.audioCtx = null;
window.analyser = null;
window.audioSourceNode = null;
window.dataArray = null;
window.canvasCtx = null;
window.currentStream = null;

// Constants
window.VAD_THRESHOLD = 15;
window.VAD_SILENCE = 1200;

// Visualizer State
window.visMode = 'wave'; 


// --- 2. Init Logic (Application Entry Point) ---

window.addEventListener('load', async () => {
    console.log("App initializing...");

    // 1. HTMLテンプレートの注入確認
    // core_templates.js が既に走っているはずだが、念のため確認
    if(typeof initHtmlTemplates === 'function' && !document.getElementById('db-manager-modal')) {
        initHtmlTemplates();
    }

    // 2. データベース(Local Storage)のロード
    // core_db_manager.js で定義
    if(typeof loadDb === 'function') {
        await loadDb();
    } else {
        console.error("loadDb function not found. Check core_db_manager.js");
    }
    
    // 3. Canvas(ビジュアライザ)初期化
    // core_audio_visuals.js で定義
    if(typeof initCanvas === 'function') {
        initCanvas();
        window.addEventListener('resize', initCanvas);
    }
    
    // 4. 保存された設定の復元
    loadSavedSettings();
    
    // 5. カテゴリ選択肢の生成
    if(typeof populateCategorySelect === 'function') {
        populateCategorySelect(); 
    }
    
    // 6. 最初の問題を表示
    // core_app_flow.js で定義
    if(typeof nextQuestion === 'function') {
        // カテゴリが空でないか確認してから開始
        if(window.db && window.db[window.currentCategory] && window.db[window.currentCategory].length > 0) {
            nextQuestion();
        } else {
            console.warn("No data in current category. Please import words.");
            if(typeof openDbManager === 'function') openDbManager();
        }
    } else {
        console.error("nextQuestion function not found. Check core_app_flow.js");
    }
});


// --- 3. Helper Functions (Settings Loader) ---

function loadSavedSettings() {
    // プロバイダー設定
    const p = localStorage.getItem('lr_provider');
    if(p) window.currentProvider = p;
    
    // APIキー復元
    const kGemini = localStorage.getItem('gemini_key');
    const kOpenAI = localStorage.getItem('openai_key');
    const rate = localStorage.getItem('lr_rate');

    const elKeyG = document.getElementById('api-key-gemini');
    const elKeyO = document.getElementById('api-key-openai');
    const elProv = document.getElementById('ai-provider');
    const elRate = document.getElementById('speech-rate');
    const elRateVal = document.getElementById('rate-val');
    
    if(elKeyG) elKeyG.value = kGemini || '';
    if(elKeyO) elKeyO.value = kOpenAI || '';
    if(elProv) {
        elProv.value = window.currentProvider;
        // UIの表示切り替え (core_dom_events.js の関数)
        if(typeof toggleProviderSettings === 'function') toggleProviderSettings(); 
    }
    
    if(rate) {
        window.speechRate = parseFloat(rate);
        if(elRate) elRate.value = window.speechRate;
        if(elRateVal) elRateVal.innerText = window.speechRate;
    }
    
    // Geminiモデルリスト取得 (APIキーがある場合のみ)
    if(window.currentProvider === 'gemini' && kGemini && typeof fetchModels === 'function') {
        fetchModels(true); // silent mode
    }
}

// 設定保存ロジック (core_dom_events.js または settings modal から呼ばれる)
window.saveSettings = function() {
    const elProv = document.getElementById('ai-provider');
    if(elProv) window.currentProvider = elProv.value;
    localStorage.setItem('lr_provider', window.currentProvider);

    const kGemini = document.getElementById('api-key-gemini').value;
    const kOpenAI = document.getElementById('api-key-openai').value;
    
    if(kGemini) localStorage.setItem('gemini_key', kGemini);
    if(kOpenAI) localStorage.setItem('openai_key', kOpenAI);

    const elRate = document.getElementById('speech-rate');
    if(elRate) {
        window.speechRate = parseFloat(elRate.value);
        localStorage.setItem('lr_rate', window.speechRate);
    }
    
    // 設定画面を閉じる (core_dom_events.js の関数)
    if(typeof closeSettings === 'function') closeSettings();
    
    // Geminiモデル更新
    if(window.currentProvider === 'gemini' && kGemini && typeof fetchModels === 'function') {
        fetchModels(true);
    }
    
    alert("設定を保存しました！");
};

// 単語統計更新ヘルパー (DB操作に近いのでここに配置、または core_db_manager.js でも可)
window.updateWordStats = function(isCorrect) {
    if (!window.currentPair) return;
    
    if (!window.currentPair.streak) window.currentPair.streak = 0;
    
    if (isCorrect) {
        window.currentPair.streak += 1;
        // 正解数に応じて復習間隔を空ける (簡易的なSRSロジック)
        const bonusTime = 60 * 1000 * Math.pow(4, window.currentPair.streak); 
        window.currentPair.nextReview = Date.now() + bonusTime;
    } else {
        window.currentPair.streak = 0;
        window.currentPair.nextReview = Date.now();
    }
    
    // DB保存 (core_db_manager.js)
    if(typeof saveDb === 'function') saveDb();
};

// モデル音声再生ヘルパー (core_audio_visuals.js にあるべきだが、単純なのでここでも可)
window.speakModel = function() { 
    if(!window.targetObj || !window.targetObj.w) return;
    
    // Web Speech API Synthesis
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // 前のをキャンセル
        const u = new SpeechSynthesisUtterance(window.targetObj.w);
        u.lang = 'en-US';
        u.rate = window.speechRate || 0.8;
        window.speechSynthesis.speak(u);
    }
};