/**
 * 6_dom_events.js
 * ボタンクリックや画面操作などのイベントハンドリングを集約します。
 */

// --- 1. スタート画面・オーディオ初期化 ---

function unlockAudio() {
    const overlay = document.getElementById('start-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300); 
    }

    if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (typeof audioCtx === 'undefined') {
            window.audioCtx = new AudioCtor();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }
    console.log("Audio unlocked and App started.");
}

// --- 2. Word List Manager (DB管理) の開閉 ---

function openDbManager() {
    const modal = document.getElementById('db-manager-modal');
    if (modal) {
        modal.style.display = 'flex';
        if (typeof renderDbList === 'function') renderDbList();
        if (typeof selectedLevel !== 'undefined') selectedLevel = null;
        
        const title = document.getElementById('current-level-title');
        if(title) title.innerText = "Select a Level";
        
        const container = document.getElementById('word-table-container');
        if(container) container.innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:50px;">👈 Select a level list</p>';
        
        const lvlActions = document.getElementById('level-actions');
        if(lvlActions) lvlActions.style.display = 'none';
        
        const wordActions = document.getElementById('word-actions');
        if(wordActions) wordActions.style.display = 'none';
    }
}

function closeDbManager() {
    const modal = document.getElementById('db-manager-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    if (typeof populateCategorySelect === 'function') populateCategorySelect();
    if (typeof changeCategory === 'function') changeCategory();
}

// --- 3. 設定画面の開閉 ---

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'flex';
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
}

// --- 4. ダークモード切替 ---

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// --- 5. プロバイダー設定のUI制御 ---

function toggleProviderSettings() {
    const provider = document.getElementById('ai-provider').value;
    document.querySelectorAll('.provider-config').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`config-${provider}`);
    if (target) target.style.display = 'block';
}

// --- 6. その他 UI操作ヘルパー ---

// カテゴリ変更時のイベント
function changeCategory() {
    const select = document.getElementById('category-select');
    if (!select) return;
    
    if (typeof window.currentCategory !== 'undefined') {
        window.currentCategory = select.value;
    }
    if (typeof nextQuestion === 'function') {
        nextQuestion();
    } else {
        console.error("nextQuestion function is missing!");
    }
}

// 録音ボタンのUI更新
function updateRecordButtonUI() {
    const btn = document.getElementById('rec-btn');
    if (!btn) return;

    if (typeof window.isRecording !== 'undefined' && window.isRecording) {
        btn.classList.add('recording');
        btn.innerText = "■ Stop";
    } else {
        btn.classList.remove('recording');
        btn.classList.remove('processing');
        btn.innerText = "🎤 Start";
        btn.style.display = 'block'; 
    }
}

// ★追加: モード切替（Listen / Speak）の制御
function setMode(mode) {
    // グローバル変数を更新 (3_core_logic.js)
    if (typeof window.currentMode !== 'undefined') {
        window.currentMode = mode;
    }

    // タブの見た目を更新
    const tabSpeak = document.getElementById('tab-speak');
    const tabListen = document.getElementById('tab-listen');
    
    if (tabSpeak && tabListen) {
        if (mode === 'speaking') {
            tabSpeak.classList.add('active');
            tabListen.classList.remove('active');
        } else {
            tabSpeak.classList.remove('active');
            tabListen.classList.add('active');
        }
    }

    // 問題を再描画してUIを切り替え
    if (typeof nextQuestion === 'function') {
        nextQuestion();
    }
}

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    const dbModal = document.getElementById('db-manager-modal');
    const setModal = document.getElementById('settings-modal');

    if (dbModal && dbModal.style.display === 'flex') return;
    if (setModal && setModal.style.display === 'flex') return;

    if (e.code === 'Space') {
        e.preventDefault(); 
        if (typeof toggleRecord === 'function') toggleRecord();
    }
    if (e.code === 'ArrowRight') {
        if (typeof nextQuestion === 'function') nextQuestion();
    }
});