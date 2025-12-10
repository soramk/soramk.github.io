/**
 * 5_app_flow.js
 * アプリケーションのメインフロー制御 (録音、判定、画面遷移)
 * Note: Globals (mediaRecorder, audioCtx, etc.) are defined in 3_core_logic.js.
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
        alert("Gemini API Key is missing. Please check settings."); 
        openSettings(); 
        return; 
    }
    if(currentProvider === 'openai' && !kOpenAI) { 
        alert("OpenAI API Key is missing. Please check settings."); 
        openSettings(); 
        return; 
    }

    try {
        // UI初期化
        btn.classList.add('recording');
        btn.innerText = "Wait..."; 
        
        // 状態フラグを先に立てる
        isRecording = true;
        hasSpoken = false;
        silenceStart = 0;

        // 1. マイクストリーム取得
        let stream = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentStream = stream; // グローバル変数
        } catch(err) {
            console.warn("Mic access failed:", err);
            alert("Mic access denied.");
            isRecording = false;
            btn.classList.remove('recording');
            btn.innerText = "🎤 Start";
            return;
        }

        // 2. ビジュアライザー起動
        if(typeof startAudioVisualization === 'function') {
            startAudioVisualization(stream);
        }
        
        // 3. MediaRecorder開始
        let mime='audio/webm'; 
        if(MediaRecorder.isTypeSupported('audio/mp4')) mime='audio/mp4';
        else if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime='audio/webm;codecs=opus';

        mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
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
            
            const blob = new Blob(audioChunks, { type: mime }); 
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
            btn.innerText = "■ Stop (Web)";
            setTimeout(() => {
                if(isRecording && typeof startWebSpeech === 'function') {
                    startWebSpeech(); 
                }
            }, 50);
        } else {
            btn.innerText = "■ Stop";
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
        btn.innerText = "Analyzing..."; 
    }

    // Web Speech停止
    if(currentProvider === 'web') {
        if(typeof stopWebSpeech === 'function') stopWebSpeech();
        setTimeout(() => {
            const b = document.getElementById('rec-btn');
            if(b && (b.innerText === "Analyzing..." || b.innerText.includes("Stop"))) {
                b.classList.remove('processing');
                b.innerText = "🎤 Start";
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
 * 次の問題へ進む処理
 */
async function nextQuestion() {
    console.log("Moving to next question...");

    // 1. 進行中の録音/認識プロセスを強制リセット
    if (typeof isRecording !== 'undefined' && isRecording) {
        if(typeof toggleRecord === 'function') toggleRecord(); 
    }
    if (typeof stopWebSpeechNow === 'function') stopWebSpeechNow();
    if (typeof isRecording !== 'undefined') isRecording = false;
    if (typeof updateRecordButtonUI === 'function') updateRecordButtonUI();

    // 2. UIのリセット
    const feedbackArea = document.getElementById('feedback-area');
    if(feedbackArea) {
        feedbackArea.innerHTML = 'Ready';
        feedbackArea.className = 'feedback';
    }
    const wordArea = document.getElementById('word-area');
    if(wordArea) wordArea.classList.remove('shake-anim', 'pop-anim');

    const targetWordEl = document.getElementById('target-word');
    if(targetWordEl) targetWordEl.classList.add('blur'); 

    // 3. 次の単語データの取得
    // ★修正: window.db を明示的に参照
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
    window.currentPair = list[idx]; // ★修正: window.currentPair に代入

    // LかRかをランダムに決定
    // ★重要: 変数の同期ズレを防ぐため window.isTargetL に統一
    window.isTargetL = Math.random() < 0.5;
    
    // ★重要: targetObj も window.isTargetL に基づいて確実に更新
    window.targetObj = window.isTargetL ? window.currentPair.l : window.currentPair.r;
    
    console.log("New Question Set:", {
        pair: window.currentPair.l.w + "/" + window.currentPair.r.w,
        targetIsL: window.isTargetL,
        targetWord: window.targetObj.w
    });

    // 4. 画面表示の更新
    updateWordDisplay();
    
    // 発音記号と口の形の更新
    if (typeof updatePhonemesAndMouth === 'function') {
        updatePhonemesAndMouth(window.currentPair, window.isTargetL);
    }

    // 5. モードごとの挙動設定
    if (window.currentMode === 'listening') {
        // リスニングモード
        setTimeout(() => speakModel(), 300); // 新しく更新された targetObj を読み上げる
        
        document.getElementById('controls-listening').style.display = 'grid';
        document.getElementById('controls-speaking').style.display = 'none';
        if(targetWordEl) targetWordEl.classList.add('blur'); 
        
    } else {
        // スピーキングモード
        document.getElementById('controls-listening').style.display = 'none';
        document.getElementById('controls-speaking').style.display = 'grid';
        if(targetWordEl) targetWordEl.classList.remove('blur');
    }
}

function updateWordDisplay() {
    const targetEl = document.getElementById('target-word');
    const opponentEl = document.getElementById('opponent-word');
    if(!targetEl || !opponentEl) return;

    // ★修正: window. 変数を使用
    if (window.isTargetL) {
        targetEl.innerText = window.currentPair.l.w;
        opponentEl.innerText = window.currentPair.r.w;
    } else {
        targetEl.innerText = window.currentPair.r.w;
        opponentEl.innerText = window.currentPair.l.w;
    }
}


// --- Result Handling ---

function handleError(e) {
    console.error(e);
    const msg = e.message || e;
    const fb = document.getElementById('feedback-area');
    if(fb) fb.innerText = "Error: "+ msg;
    
    const btn = document.getElementById('rec-btn');
    if(btn) {
        btn.classList.remove('processing');
        btn.classList.remove('recording');
        btn.innerText = "🎤 Start";
        btn.style.display = 'block';
    }
    isRecording = false;
}

function handleResult(result) {
    const inp = result.transcript;
    const isOk = result.isCorrect; 
    
    const fb = document.getElementById('feedback-area');
    const autoFlow = document.getElementById('toggle-auto-flow').checked;
    const cont = document.querySelector('.container');
    
    const btn = document.getElementById('rec-btn');
    if(btn) {
        btn.classList.remove('processing'); 
        btn.classList.remove('recording'); 
        btn.innerText = "🎤 Start";
        btn.style.display = isOk ? 'none' : 'block'; 
    }

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
            fb.innerHTML = `🎉 Correct!<br><small style="color:var(--text); opacity:0.8;">Heard: "${inp}"</small>`; 
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

        const adviceText = result.advice || "Try again!";
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

    // ★修正: window.isTargetL を参照して正解を取得
    // もしundefinedなら、エラー回避でデフォルト値を入れるが、ログを出す
    let correctIsL = window.isTargetL;
    
    if (typeof correctIsL === 'undefined') {
        console.error("Critical Error: window.isTargetL is undefined. Defaulting to true.");
        correctIsL = true; 
    }

    console.log(`Check Answer: TargetIsL=${correctIsL}, UserChoseL=${userChoseL}`);

    // 判定ロジック: (正解がL かつ ユーザー選択L) または (正解がR かつ ユーザー選択R)
    // つまり、「正解のLフラグ」と「ユーザーのL選択フラグ」が一致すれば正解
    const isCorrect = (correctIsL === userChoseL);
    
    const fb = document.getElementById('feedback-area');
    const autoFlow = document.getElementById('toggle-auto-flow').checked;
    const cont = document.querySelector('.container');
    
    // 正解の単語を表示（ぼかし解除）
    const targetEl = document.getElementById('target-word');
    if(targetEl) {
        targetEl.classList.remove('blur');
        // 表示テキストが最新の正解と合っているか念のため更新
        if(typeof window.targetObj !== 'undefined') targetEl.innerText = window.targetObj.w; 
    }
    
    if(typeof updateWordStats === 'function') updateWordStats(isCorrect);
    
    const targetText = targetEl ? targetEl.innerText : "???";
    addToHistory(targetText, userChoseL?"Selected L":"Selected R", isCorrect);
    
    if(isCorrect){
        if(typeof sfx !== 'undefined') sfx.correct(); 
        if(cont) {
            cont.classList.add('pop-anim');
            setTimeout(()=>cont.classList.remove('pop-anim'), 500);
        }
        if(fb) {
            fb.innerHTML = "🎉 Correct!"; 
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
            fb.innerHTML = "😢 Wrong..."; 
            fb.className = "feedback incorrect";
        }
        if(typeof streak !== 'undefined') streak = 0;
        
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
    li.innerHTML = `<span class="${isOk?'res-ok':'res-ng'}">${isOk?'OK':'NG'}</span> <span>Target: ${target} / AI: ${heard}</span>`;
    list.prepend(li);
}

function updateStreakDisplay() {
    const el = document.getElementById('streak-disp');
    if(el && typeof streak !== 'undefined') el.innerText = streak;
}