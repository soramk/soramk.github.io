/**
 * core_app_flow.js
 * アプリケーションのメインフロー制御 (録音、判定、画面遷移)
 * Note: Globals (mediaRecorder, audioCtx, etc.) are defined in core_logic.js.
 */

// --- Recording Flow ---

async function toggleRecord() {
    const btn = document.getElementById('rec-btn');
    const currentProvider = document.getElementById('ai-provider').value;

    // ■ 録音停止処理 (既に録音中の場合)
    if (typeof isRecording !== 'undefined' && isRecording) {
        stopRecordingInternal();
        return;
    }

    // APIキーチェック
    const kGemini = document.getElementById('api-key-gemini').value;
    const kOpenAI = document.getElementById('api-key-openai').value;
    if(currentProvider === 'gemini' && !kGemini) { 
        alert("Gemini APIキーが設定されていません。設定を確認してください。"); 
        openSettings(); 
        return; 
    }
    if(currentProvider === 'openai' && !kOpenAI) { 
        alert("OpenAI APIキーが設定されていません。設定を確認してください。"); 
        openSettings(); 
        return; 
    }

    try {
        // UI初期化
        btn.classList.add('recording');
        btn.innerText = "待機中..."; 
        
        // 状態フラグを先に立てる
        isRecording = true;
        hasSpoken = false;
        silenceStart = 0;

        // 0. AudioContextの状態確認と再生成（バックグラウンドから戻った場合の対策）
        if (typeof window.ensureAudioContext === 'function') {
            window.ensureAudioContext();
            // ensureAudioContextがaudioCtxを更新した可能性があるので、グローバル変数を参照
            if (window.audioCtx) {
                audioCtx = window.audioCtx;
            }
        } else {
            // フォールバック: ensureAudioContextがまだ読み込まれていない場合
            if (!audioCtx || audioCtx.state === 'closed') {
                try {
                    if (audioCtx && audioCtx.state === 'closed') {
                        audioCtx = null;
                        window.audioCtx = null;
                    }
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    window.audioCtx = audioCtx;
                    console.log("App Flow: AudioContext recreated, state:", audioCtx.state);
                } catch(e) {
                    console.error("App Flow: Failed to create AudioContext:", e);
                }
            }
        }

        // 1. マイクストリーム取得
        let stream = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentStream = stream; // グローバル変数
            console.log("App Flow: Microphone stream obtained");
        } catch(err) {
            console.warn("Mic access failed:", err);
            alert("マイクへのアクセスが拒否されました。");
            isRecording = false;
            btn.classList.remove('recording');
            btn.innerText = "🎤 開始";
            return;
        }

        // 2. ビジュアライザー起動
        if(typeof startAudioVisualization === 'function') {
            startAudioVisualization(stream);
        }
        
        // 3. MediaRecorder開始（最適化：低ビットレートで録音）
        let mime='audio/webm'; 
        if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mime='audio/webm;codecs=opus';
        } else if(MediaRecorder.isTypeSupported('audio/mp4')) {
            mime='audio/mp4';
        }
        
        // 録音オプション（ビットレートを下げてファイルサイズを削減）
        const recorderOptions = { mimeType: mime };
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            recorderOptions.audioBitsPerSecond = 16000; // 低ビットレート（デフォルトは128000）
        }

        mediaRecorder = new MediaRecorder(stream, recorderOptions);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        // 録音停止時の処理
        mediaRecorder.onstop = async () => { 
            // マイク停止
            if(currentStream) {
                currentStream.getTracks().forEach(t => t.stop()); 
                currentStream = null;
            }
            
            let blob = new Blob(audioChunks, { type: mime }); 
            
            // 音声最適化が有効な場合は最適化を適用
            if (typeof window.optimizeAudioBlob === 'function') {
                blob = await window.optimizeAudioBlob(blob);
            }
            
            userAudioBlob = blob;
            
            const replayBtn = document.getElementById('replay-user-btn');
            if(replayBtn) replayBtn.style.display = 'block';

            // 静的波形生成
            if(audioCtx) {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    if(typeof renderStaticResult === 'function') renderStaticResult(audioBuffer); 
                } catch(e) { console.error("Audio Decode Error", e); }
            }

            // API送信 (Web Speech以外)
            if (currentProvider !== 'web') {
                if(typeof sendToAI === 'function') {
                    sendToAI(blob);
                }
            }
        };

        mediaRecorder.start();

        // 4. Web Speech APIの場合のみ認識エンジン開始
        if (currentProvider === 'web') {
            btn.innerText = "■ 停止（Web）";
            setTimeout(() => {
                if(isRecording && typeof startWebSpeech === 'function') {
                    startWebSpeech(); 
                }
            }, 50);
        } else {
            btn.innerText = "■ 停止";
        }

    } catch(e) {
        alert("App Error: " + e.message);
        stopRecordingInternal();
    }
}

// 内部用停止関数
function stopRecordingInternal() {
    const currentProvider = document.getElementById('ai-provider').value;
    isRecording = false; 
    
    const btn = document.getElementById('rec-btn');
    if(btn) {
        btn.classList.remove('recording');
        btn.classList.add('processing');
        btn.innerText = "分析中..."; 
    }

    // Web Speech停止
    if(currentProvider === 'web') {
        if(typeof stopWebSpeech === 'function') stopWebSpeech();
        setTimeout(() => {
            const b = document.getElementById('rec-btn');
            if(b && (b.innerText === "分析中..." || b.innerText.includes("停止"))) {
                b.classList.remove('processing');
                b.innerText = "🎤 開始";
            }
        }, 1000);
    }
    
    // MediaRecorder停止
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    } else {
        if(currentStream) {
             currentStream.getTracks().forEach(t => t.stop());
             currentStream = null;
        }
    }
}

function skipQuestion() {
    if(typeof isRecording !== 'undefined' && isRecording) { 
        stopRecordingInternal(); 
    }
    if(typeof sfx !== 'undefined' && sfx.skip) sfx.skip();
    if(typeof streak !== 'undefined') streak = 0;
    updateStreakDisplay();
    nextQuestion();
}


// --- App Navigation Flow ---

/**
 * 次の問題へ進む処理 (v3.1: ボタンリセット修正版)
 */
async function nextQuestion() {
    console.log("Moving to next question... (v3.1 UI fix)");

    // 1. 進行中の録音/認識プロセスを強制リセット
    if (typeof isRecording !== 'undefined' && isRecording) {
        if(typeof toggleRecord === 'function') toggleRecord(); 
    }
    
    if (typeof stopWebSpeech === 'function') stopWebSpeech();
    if (typeof isRecording !== 'undefined') window.isRecording = false;
    if (typeof updateRecordButtonUI === 'function') updateRecordButtonUI();

    // 2. UIのリセット
    const feedbackArea = document.getElementById('feedback-area');
    if(feedbackArea) {
        feedbackArea.innerHTML = 'Ready';
        feedbackArea.className = 'feedback';
    }
    const wordArea = document.getElementById('word-area');
    if(wordArea) wordArea.classList.remove('shake-anim', 'pop-anim');
    
    const btnL = document.getElementById('choice-l');
    const btnR = document.getElementById('choice-r');
    if(btnL) btnL.classList.remove('success', 'error');
    if(btnR) btnR.classList.remove('success', 'error');

    // ★追加: 再生ボタン類を確実に隠す
    const replayBtn = document.getElementById('replay-user-btn');
    if(replayBtn) replayBtn.style.display = 'none';
    
    const overlayBtn = document.getElementById('overlay-btn');
    if(overlayBtn) overlayBtn.style.display = 'none';

    // 3. 次の単語データの取得
    if (typeof window.db === 'undefined' || !window.currentCategory || !window.db[window.currentCategory]) {
        console.warn("Database not ready or category empty.");
        return;
    }

    const list = window.db[window.currentCategory];
    if (list.length === 0) {
        alert("No words in this category!");
        return;
    }

    // ランダム選択
    const idx = Math.floor(Math.random() * list.length);
    window.currentPair = list[idx];
    window.isTargetL = Math.random() < 0.5;
    window.targetObj = window.isTargetL ? window.currentPair.l : window.currentPair.r;
    
    // 4. 発音記号と口の形のデータ更新
    if (typeof updatePhonemesAndMouth === 'function') {
        updatePhonemesAndMouth(window.currentPair, window.isTargetL);
    }

    // 要素の取得
    const visualizerBox = document.querySelector('.visualizer-box');
    const visExplanation = document.getElementById('vis-explanation');
    const phonemeList = document.getElementById('phoneme-list');
    const diagramBox = document.querySelector('.diagram-box');

    // 5. モードごとの画面表示更新
    const targetEl = document.getElementById('target-word');
    const opponentEl = document.getElementById('opponent-word');

    if (window.currentMode === 'listening') {
        // --- Listening Mode ---
        
        // ヒントになる要素を隠す
        if(visualizerBox) visualizerBox.style.display = 'none';
        if(visExplanation) visExplanation.style.display = 'none';
        if(phonemeList) phonemeList.style.display = 'none';
        if(diagramBox) diagramBox.style.display = 'none';

        // 単語を伏せ字にする
        if(targetEl) {
            targetEl.innerText = "??????";
            targetEl.classList.remove('blur');
        }
        if(opponentEl) {
            opponentEl.innerText = "??????";
        }

        if(btnL) btnL.innerText = window.currentPair.l.w;
        if(btnR) btnR.innerText = window.currentPair.r.w;

        // 音声再生
        setTimeout(() => speakModel(), 300);
        
        document.getElementById('controls-listening').style.display = 'grid';
        document.getElementById('controls-speaking').style.display = 'none';
        
    } else {
        // --- Speaking Mode ---
        
        // 隠した要素を再表示する
        if(visualizerBox) visualizerBox.style.display = 'block';
        if(visExplanation) visExplanation.style.display = 'block';
        if(phonemeList) phonemeList.style.display = 'flex';
        if(diagramBox) diagramBox.style.display = 'flex';

        // 通常の単語表示
        updateWordDisplay();
        if(targetEl) targetEl.classList.remove('blur');

        document.getElementById('controls-listening').style.display = 'none';
        document.getElementById('controls-speaking').style.display = 'grid';
    }
}

function updateWordDisplay() {
    const targetEl = document.getElementById('target-word');
    const opponentEl = document.getElementById('opponent-word');
    if(!targetEl || !opponentEl) return;

    if (window.isTargetL) {
        targetEl.innerText = window.currentPair.l.w;
        opponentEl.innerText = window.currentPair.r.w;
    } else {
        targetEl.innerText = window.currentPair.r.w;
        opponentEl.innerText = window.currentPair.l.w;
    }
}


// --- Result Handling (Speaking) ---

function handleError(e) {
    console.error(e);
    const msg = e.message || e;
    const fb = document.getElementById('feedback-area');
    if(fb) fb.innerText = "Error: "+ msg;
    
    if (typeof updateRecordButtonUI === 'function') updateRecordButtonUI();
    isRecording = false;
}

function handleResult(result) {
    const inp = result.transcript;
    const isOk = result.isCorrect; 
    
    const fb = document.getElementById('feedback-area');
    const autoFlow = document.getElementById('toggle-auto-flow').checked;
    const cont = document.querySelector('.container');
    
    if (typeof updateRecordButtonUI === 'function') updateRecordButtonUI();
    const btn = document.getElementById('rec-btn');
    if(btn) btn.style.display = isOk ? 'none' : 'block';

    if(typeof updateWordStats === 'function') updateWordStats(isOk); 
    
    // 履歴追加
    const targetText = document.getElementById('target-word').innerText;
    addToHistory(targetText, inp, isOk);

    if(isOk){
        if(typeof sfx !== 'undefined') sfx.correct(); 
        if(cont) {
            cont.classList.remove('shake-anim');
            cont.classList.add('pop-anim');
            setTimeout(()=>cont.classList.remove('pop-anim'), 500);
        }

        if(fb) {
            fb.innerHTML = `🎉 正解！<br><small style="color:var(--text); opacity:0.8;">聞き取り: "${inp}"</small>`; 
            fb.className = "feedback correct";
        }
        
        if(typeof streak !== 'undefined') streak++; 
        
        if(autoFlow) {
            setTimeout(() => nextQuestion(), 1500);
        } else {
            const nextBtn = document.getElementById('next-btn-spk');
            if(nextBtn) nextBtn.style.display = 'block';
        }
    } else {
        if(typeof sfx !== 'undefined') sfx.wrong(); 
        if(cont) {
            cont.classList.remove('pop-anim');
            cont.classList.add('shake-anim');
            setTimeout(()=>cont.classList.remove('shake-anim'), 500);
        }

        const adviceText = result.advice || "もう一度試してください！";
        if(fb) {
            fb.innerHTML = `⚠️ ${inp}<br><small style="font-size:0.8rem; color:var(--text); font-weight:bold;">💡 ${adviceText}</small>`; 
            fb.className = "feedback incorrect";
        }
        
        if(typeof streak !== 'undefined') streak = 0;
    }
    
    updateStreakDisplay();
}

function checkPronunciation(result) {
    handleResult({
        transcript: result.heard || result.transcript,
        isCorrect: result.correct || result.isCorrect,
        advice: result.advice
    });
}

// --- Listening Mode Check ---

function checkListening(userChoseL){
    // userChoseL: true=ユーザーがLを選択, false=ユーザーがRを選択

    let correctIsL = window.isTargetL;
    
    if (typeof correctIsL === 'undefined') {
        console.error("Critical Error: window.isTargetL is undefined. Defaulting to true.");
        correctIsL = true; 
    }

    console.log(`Check Answer: TargetIsL=${correctIsL}, UserChoseL=${userChoseL}`);

    const isCorrect = (correctIsL === userChoseL);
    
    const fb = document.getElementById('feedback-area');
    const autoFlow = document.getElementById('toggle-auto-flow').checked;
    const cont = document.querySelector('.container');
    
    // ★修正: 判定後に正解の単語を表示する（??????を解除）
    updateWordDisplay();
    
    if(typeof updateWordStats === 'function') updateWordStats(isCorrect);
    
    // 履歴には正解の単語を表示
    const targetText = window.targetObj.w;
    const choiceText = userChoseL ? window.currentPair.l.w : window.currentPair.r.w;
    addToHistory(targetText, `選択: ${choiceText}`, isCorrect);
    
    if(isCorrect){
        if(typeof sfx !== 'undefined') sfx.correct(); 
        if(cont) {
            cont.classList.add('pop-anim');
            setTimeout(()=>cont.classList.remove('pop-anim'), 500);
        }
        if(fb) {
            fb.innerHTML = "🎉 正解！"; 
            fb.className = "feedback correct";
        }
        if(typeof streak !== 'undefined') streak++;
        
        // 選択ボタンの色付け
        const btnId = userChoseL ? 'choice-l' : 'choice-r';
        const btn = document.getElementById(btnId);
        if(btn) btn.classList.add('success');

        if(autoFlow) {
            setTimeout(()=>nextQuestion(), 1200);
        } else {
            const nextBtn = document.getElementById('next-btn-lst');
            if(nextBtn) nextBtn.style.display = 'grid';
        }
    } else {
        if(typeof sfx !== 'undefined') sfx.wrong(); 
        if(cont) {
            cont.classList.add('shake-anim');
            setTimeout(()=>cont.classList.remove('shake-anim'), 500);
        }
        if(fb) {
            fb.innerHTML = "😢 不正解..."; 
            fb.className = "feedback incorrect";
        }
        if(typeof streak !== 'undefined') streak = 0;
        
        // 間違えたボタンを赤く
        const btnId = userChoseL ? 'choice-l' : 'choice-r';
        const btn = document.getElementById(btnId);
        if(btn) btn.classList.add('error');

        const nextBtn = document.getElementById('next-btn-lst');
        if(nextBtn) nextBtn.style.display = 'grid';
    }
    updateStreakDisplay();
}

// --- Utils ---

function replayUserAudio() {
    if(!userAudioBlob) return;
    const audioUrl = URL.createObjectURL(userAudioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
}

function addToHistory(target, heard, isOk){
    const list = document.getElementById('history-list');
    if(!list) return;
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `<span class="${isOk?'res-ok':'res-ng'}">${isOk?'OK':'NG'}</span> <span>Target: ${target} / ${heard}</span>`;
    list.prepend(li);
}

function updateStreakDisplay() {
    const el = document.getElementById('streak-disp');
    if(el && typeof streak !== 'undefined') el.innerText = streak;
}