/**
 * 6_dom_events.js
 * ボタンクリックや画面操作などのイベントハンドリングを集約します。
 * HTML側の onclick="..." から呼ばれる関数はここで定義します。
 */

// --- 1. スタート画面・オーディオ初期化 ---

function unlockAudio() {
    // スタート画面（オーバーレイ）を非表示にする
    const overlay = document.getElementById('start-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300); // フェードアウト用
    }

    // AudioContextの初期化（ブラウザの制限解除のため）
    if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        // グローバル変数 audioCtx が定義されていればそれを使用（3_core_logic.js等で定義想定）
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
        // リストの描画 (3_core_logic.js にある関数を呼ぶ)
        if (typeof renderDbList === 'function') renderDbList();
        
        // 選択状態のリセット
        if (typeof selectedLevel !== 'undefined') selectedLevel = null;
        
        // UI初期化
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
    // カテゴリ選択肢を更新（DBが変わった可能性があるため）
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
    // 設定保存などのロジックがあればここに追加
}

// --- 5. プロバイダー設定のUI制御 ---

function toggleProviderSettings() {
    const provider = document.getElementById('ai-provider').value;
    
    // 全て一旦隠す
    document.querySelectorAll('.provider-config').forEach(el => el.style.display = 'none');
    
    // 選択されたものだけ表示
    const target = document.getElementById(`config-${provider}`);
    if (target) target.style.display = 'block';
}

// --- 6. その他 UI操作ヘルパー ---

// カテゴリ変更時のイベント
function changeCategory() {
    const select = document.getElementById('category-select');
    if (!select) return;
    
    // グローバル変数 currentCategory を更新 (3_core_logic.js等で定義想定)
    if (typeof window.currentCategory !== 'undefined') {
        window.currentCategory = select.value;
    }
    
    // 新しいカテゴリで問題をロード
    // ★修正: loadQuestion ではなく nextQuestion を呼ぶ
    if (typeof nextQuestion === 'function') {
        nextQuestion();
    } else {
        console.error("nextQuestion function is missing!");
    }
}

// ★追加: 録音ボタンの見た目を「待機状態」に戻す関数
// (4_api_client.js や 5_app_flow.js から呼ばれる)
function updateRecordButtonUI() {
    const btn = document.getElementById('rec-btn');
    if (!btn) return;

    // isRecordingフラグを見て状態を反映（安全策）
    if (typeof window.isRecording !== 'undefined' && window.isRecording) {
        // 録音中ならストップボタン化（通常ここに来ることは稀だが整合性のため）
        btn.classList.add('recording');
        btn.innerText = "■ Stop";
    } else {
        // 待機状態
        btn.classList.remove('recording');
        btn.classList.remove('processing');
        btn.innerText = "🎤 Start";
        btn.style.display = 'block'; // 非表示になっていたら戻す
    }
}

// キーボードショートカット対応 (PC用)
document.addEventListener('keydown', (e) => {
    // モーダルが開いているときは無効化
    const dbModal = document.getElementById('db-manager-modal');
    const setModal = document.getElementById('settings-modal');

    if (dbModal && dbModal.style.display === 'flex') return;
    if (setModal && setModal.style.display === 'flex') return;

    if (e.code === 'Space') {
        e.preventDefault(); // スクロール防止
        if (typeof toggleRecord === 'function') toggleRecord();
    }
    if (e.code === 'ArrowRight') {
        if (typeof nextQuestion === 'function') nextQuestion();
    }
});