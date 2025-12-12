/**
 * js/core/app-flow.js
 * アプリの起動シーケンス、モード遷移、問題の出題ロジックを管理する中核ファイル。
 */

// グローバル変数 (状態管理)
window.currentMode = 'speaking'; // 'speaking' or 'listening'
window.currentCategory = 'basic';
window.currentPair = null;
window.targetObj = null;
window.isTargetL = true;
window.streak = 0; // 連勝数

// --- 1. アプリ起動エントリーポイント (loader.jsから呼ばれる) ---
window.initApp = function() {
    console.log("🚀 App Launching...");

    // イベントリスナーの登録 (HTML生成後に実行)
    if (typeof window.initAppEvents === 'function') {
        window.initAppEvents();
    } else {
        console.error("initAppEvents function not found in events.js");
    }

    // 初回表示 (DBが読み込まれていれば)
    if (window.db && window.db[window.currentCategory]) {
        window.changeCategory();
    } else {
        // DB読み込み待ちなどの場合のリトライ（簡易的）
        setTimeout(() => {
            if(window.changeCategory) window.changeCategory();
        }, 500);
    }

    console.log("✅ App Initialized.");
};

// --- 2. モード切替 ---
window.setMode = function(mode) {
    window.currentMode = mode;
    
    // UI更新: タブの見た目
    const tabSpeak = document.getElementById('tab-speak');
    const tabListen = document.getElementById('tab-listen');
    if(tabSpeak) tabSpeak.classList.toggle('active', mode === 'speaking');
    if(tabListen) tabListen.classList.toggle('active', mode === 'listening');
    
    // UI更新: 操作パネルの切り替え
    const controlsSpeak = document.getElementById('controls-speaking');
    const controlsListen = document.getElementById('controls-listening');
    
    if (mode === 'speaking') {
        if(controlsSpeak) controlsSpeak.style.display = 'grid';
        if(controlsListen) controlsListen.style.display = 'none';
    } else {
        if(controlsSpeak) controlsSpeak.style.display = 'none';
        if(controlsListen) controlsListen.style.display = 'grid';
    }

    // モード切替時は問題をリセット
    window.nextQuestion();
};

// --- 3. カテゴリ変更 ---
window.changeCategory = function() {
    const select = document.getElementById('category-select');
    if (select) {
        window.currentCategory = select.value;
        window.nextQuestion();
    }
};

// --- 4. 次の問題を出題 ---
window.nextQuestion = function() {
    // DBチェック
    if (!window.db || !window.db[window.currentCategory]) {
        console.warn("Database not ready or category empty.");
        return;
    }
    
    const list = window.db[window.currentCategory];
    if (list.length === 0) return;

    // ランダムにペアを選択
    const pair = list[Math.floor(Math.random() * list.length)];
    window.currentPair = pair;
    
    // ターゲット(LかRか)をランダムに決定
    window.isTargetL = Math.random() < 0.5;
    window.targetObj = window.isTargetL ? pair.l : pair.r;

    // 画面表示更新
    window.updateWordDisplay();

    // 録音・判定結果のリセット
    const feedback = document.getElementById('feedback-area');
    if (feedback) {
        feedback.innerText = "Ready";
        feedback.className = "feedback";
    }
    const replayBtn = document.getElementById('replay-user-btn');
    if (replayBtn) replayBtn.style.display = 'none';

    // Listenモードなら自動再生
    if (window.currentMode === 'listening') {
        setTimeout(() => window.playTarget(), 500);
    }
};

// --- 5. 画面表示の更新 (単語、発音記号、図) ---
window.updateWordDisplay = function() {
    const targetEl = document.getElementById('target-word');
    const subEl = document.getElementById('sub-text');
    const diagramImg = document.getElementById('mouth-diagram');
    const diagramTitle = document.getElementById('diagram-title');
    const diagramDesc = document.getElementById('diagram-desc');
    const phonemeContainer = document.getElementById('phoneme-container');

    if (!window.currentPair || !window.targetObj) return;

    // モードによって表示を変える
    if (window.currentMode === 'listening') {
        // Listenモード: 単語は隠す
        if (targetEl) targetEl.innerText = "???";
        if (targetEl) targetEl.classList.add('blur');
        if (subEl) subEl.innerText = "Listen and choose L or R";
        
        // ヒント類も隠す
        if (diagramImg) diagramImg.style.opacity = '0.2';
        if (diagramTitle) diagramTitle.innerText = "?";
        if (diagramDesc) diagramDesc.innerText = "Listen carefully...";
        if (phonemeContainer) phonemeContainer.innerHTML = "";

    } else {
        // Speakモード: 全部表示
        if (targetEl) targetEl.innerText = window.targetObj.w;
        if (targetEl) targetEl.classList.remove('blur');
        
        // 裏の単語を表示 (例: "Not: Right")
        const otherWord = window.isTargetL ? window.currentPair.r.w : window.currentPair.l.w;
        if (subEl) subEl.innerText = `(Not: ${otherWord})`;

        // 発音記号ボタンの生成
        if (phonemeContainer) {
            phonemeContainer.innerHTML = '';
            // 簡易的に単語を一文字ずつ出す（本来は発音記号データがあればそれを使う）
            // ここではデータ構造に 'b' (breakdown) がある想定
            const phones = window.targetObj.b || [];
            if (phones.length > 0) {
                phones.forEach(p => {
                    const span = document.createElement('span');
                    span.className = 'phoneme-btn';
                    span.innerText = p;
                    // L/Rの部分を強調
                    if (p.includes('l') || p.includes('r') || p === 'l' || p === 'r') {
                        span.classList.add('active');
                    }
                    phonemeContainer.appendChild(span);
                });
            } else {
                // データがない場合は単語を表示しておく
                 phonemeContainer.innerHTML = `<span class="phoneme-btn">${window.targetObj.w}</span>`;
            }
        }

        // 口の形図解 (簡易切り替え)
        if (diagramImg) diagramImg.style.opacity = '1';
        if (window.isTargetL) {
            if (diagramTitle) diagramTitle.innerText = "L Sound (Light/Dark)";
            if (diagramDesc) diagramDesc.innerText = "Tip of tongue touches gum ridge behind upper teeth.";
            // ※ 画像URLは適宜設定。なければ色で表現など
            if (diagramImg) diagramImg.style.backgroundColor = "#dbeafe"; // 青っぽい
        } else {
            if (diagramTitle) diagramTitle.innerText = "R Sound (Retroflex/Bunced)";
            if (diagramDesc) diagramDesc.innerText = "Tongue pulled back, sides touching upper molars.";
            if (diagramImg) diagramImg.style.backgroundColor = "#fee2e2"; // 赤っぽい
        }
    }
};

// --- 6. 音声再生 (Listenモード用) ---
window.playTarget = function() {
    if (!window.targetObj) return;
    
    // ブラウザ標準TTSを使用
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(window.targetObj.w);
    u.lang = 'en-US';
    u.rate = window.speechRate || 1.0; // 設定値を反映
    window.speechSynthesis.speak(u);
};

// --- 7. Listenモードの答え合わせ ---
window.checkListening = function(userChoseL) {
    if (window.currentMode !== 'listening') return;

    const isCorrect = (userChoseL === window.isTargetL);
    const feedback = document.getElementById('feedback-area');
    
    // 正解表示
    const targetEl = document.getElementById('target-word');
    if (targetEl) {
        targetEl.innerText = window.targetObj.w;
        targetEl.classList.remove('blur');
    }

    if (isCorrect) {
        if (feedback) {
            feedback.innerText = "Correct! 🎉";
            feedback.className = "feedback correct";
        }
        if (typeof window.updateWordStats === 'function') window.updateWordStats(true); // スコア加算
        
        // 正解音 (あれば)
        // new Audio('correct.mp3').play();
    } else {
        if (feedback) {
            feedback.innerText = "Try again...";
            feedback.className = "feedback incorrect";
        }
        if (typeof window.updateWordStats === 'function') window.updateWordStats(false); // スコアリセット等
    }
    
    // 少し待って次の問題へ（オプション）
    // setTimeout(window.nextQuestion, 1500);
};