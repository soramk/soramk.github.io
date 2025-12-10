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

        // 1. マイクストリーム取得 (全モード必須: 波形と録音のため)
        let stream = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentStream = stream; // グローバル変数に保持
        } catch(err) {
            console.warn("Mic access failed:", err);
            alert("マイクへのアクセスが拒否されました。設定を確認してください。\nMic access denied.");
            isRecording = false;
            btn.classList.remove('recording');
            btn.innerText = "🎤 Start";
            return;
        }

        // 2. ビジュアライザー起動 (1_audio_visuals.js)
        if(typeof startAudioVisualization === 'function') {
            startAudioVisualization(stream);
        }
        
        // 3. MediaRecorder開始 (全モード必須: 録音後の波形と再生のため)
        let mime='audio/webm'; 
        if(MediaRecorder.isTypeSupported('audio/mp4')) mime='audio/mp4';
        else if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime='audio/webm;codecs=opus';

        mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        // 録音停止時の処理（共通）
        mediaRecorder.onstop = async () => { 
            // マイク停止
            if(currentStream) {
                currentStream.getTracks().forEach(t => t.stop()); 
                currentStream = null;
            }
            
            const blob = new Blob(audioChunks, { type: mime }); 
            userAudioBlob = blob; // グローバル変数に保持（再生用）
            
            const replayBtn = document.getElementById('replay-user-btn');
            if(replayBtn) replayBtn.style.display = 'block';

            // 静的波形生成 (録音データから)
            if(audioCtx) {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    if(typeof renderStaticResult === 'function') renderStaticResult(audioBuffer); 
                } catch(e) { console.error("Audio Decode Error", e); }
            }

            // ★ API分岐: Web Speech以外の場合のみ、ここでAPIに送信
            // (Web Speechの場合は、4_api_client.js側で音声認識が進むのでここでは何もしない)
            if (currentProvider !== 'web') {
                if(typeof sendToAI === 'function') {
                    // 4_api_client.js の統合関数を呼ぶ
                    sendToAI(blob);
                }
            }
        };

        mediaRecorder.start();

        // 4. Web Speech APIの場合のみ、認識エンジンも同時に回す
        if (currentProvider === 'web') {
            btn.innerText = "■ Stop (Web)";
            // 少し待ってから認識開始（マイク競合回避の念の為）
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
    isRecording = false; // 先にフラグを下げる
    
    const btn = document.getElementById('rec-btn');
    if(btn) {
        btn.classList.remove('recording');
        btn.classList.add('processing');
        btn.innerText = "Analyzing..."; 
    }

    // Web Speech停止 (認識エンジンを止める)
    if(currentProvider === 'web') {
        if(typeof stopWebSpeech === 'function') stopWebSpeech();
        
        // ★修正: Web Speechは通信がないため、万が一onendが呼ばれなかった時のための保険
        setTimeout(() => {
            const b = document.getElementById('rec-btn');
            if(b && (b.innerText === "Analyzing..." || b.innerText.includes("Stop"))) {
                b.classList.remove('processing');
                b.innerText = "🎤 Start";
            }
        }, 1000);
    }
    
    // MediaRecorder停止 (これが onstop を発火させ、波形生成を行う)
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    } else {
        // 万が一Recorderが動いていない場合の保険
        if(currentStream) {
             currentStream.getTracks().forEach(t => t.stop());
             currentStream = null;
        }
    }
}

// スキップ処理
function skipQuestion() {
    // 録音中なら止める
    if(typeof isRecording !== 'undefined' && isRecording) { 
        stopRecordingInternal(); 
    }
    
    // SFXスキップ音 (あれば)
    if(typeof sfx !== 'undefined' && sfx.skip) sfx.skip();
    
    // ストリークリセット
    if(typeof streak !== 'undefined') streak = 0;
    updateStreakDisplay();
    
    // 次へ
    nextQuestion();
}


// --- Result Handling & UI Updates ---

// エラーハンドリング (4_api_client.jsからも呼ばれる想定)
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
    
    // フラグ安全リセット
    isRecording = false;
}

// 判定結果のUI反映 (4_api_client.js から checkPronunciation -> handleResult 経由で呼ばれる)
// ※ 4_api_client.js の修正版では handleResult を呼ぶようになっているため、
//    整合性を取るために handleResult を定義し、checkPronunciation はそのエイリアスまたはラッパーとします。

function handleResult(result) {
    // result = { transcript: "...", isCorrect: true/false, advice: "..." }

    const inp = result.transcript;
    const isOk = result.isCorrect; 
    
    const fb = document.getElementById('feedback-area');
    const autoFlow = document.getElementById('toggle-auto-flow').checked;
    const cont = document.querySelector('.container'); // アニメーション用
    
    const btn = document.getElementById('rec-btn');
    if(btn) {
        // 結果が出たらボタンをリセット
        btn.classList.remove('processing'); 
        btn.classList.remove('recording'); 
        btn.innerText = "🎤 Start";
        // 正解したら「次へ」ボタンが出るのでStartボタンは隠す、不正解なら再挑戦用に残す
        btn.style.display = isOk ? 'none' : 'block'; 
    }

    // 統計更新 (3_core_logic.js等にある想定)
    if(typeof updateWordStats === 'function') updateWordStats(isOk); 
    
    // 履歴追加
    const targetText = document.getElementById('target-word').innerText;
    addToHistory(targetText, inp, isOk);

    if(isOk){
        // 正解時
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
        
        // Auto Next判定
        if(autoFlow) {
            setTimeout(() => nextQuestion(), 1500);
        } else {
            const nextBtn = document.getElementById('next-btn-spk');
            if(nextBtn) nextBtn.style.display = 'block';
        }
    } else {
        // 不正解時
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

// 旧コード互換用 (4_api_client.jsの一部がまだこれを呼んでいる場合用)
function checkPronunciation(result) {
    handleResult({
        transcript: result.heard || result.transcript,
        isCorrect: result.correct || result.isCorrect,
        advice: result.advice
    });
}


// --- Listening Mode ---

function checkListening(uL){
    // リスニングモード: ユーザーがLかRかボタンを押した時の判定
    // uL: trueならLボタン、falseならRボタン
    
    const isLTargetGlobal = (typeof isTargetL !== 'undefined') ? isTargetL : true;
    const correct = (isLTargetGlobal && uL) || (!isLTargetGlobal && !uL);
    
    const fb = document.getElementById('feedback-area');
    const autoFlow = document.getElementById('toggle-auto-flow').checked;
    const cont = document.querySelector('.container');
    
    // 正解の単語を表示（ぼかし解除）
    const targetEl = document.getElementById('target-word');
    const opponentEl = document.getElementById('opponent-word');
    if(targetEl) {
        targetEl.classList.remove('blur');
        // 念のためテキスト再セット (targetObjはグローバル想定)
        if(typeof targetObj !== 'undefined') targetEl.innerText = targetObj.w; 
    }
    
    // 統計更新
    if(typeof updateWordStats === 'function') updateWordStats(correct);
    
    // 履歴
    const targetText = targetEl ? targetEl.innerText : "???";
    addToHistory(targetText, uL?"Selected L":"Selected R", correct);
    
    if(correct){
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
        const btnId = uL ? 'choice-l' : 'choice-r';
        const btn = document.getElementById(btnId);
        if(btn) btn.classList.add('success');

        if(autoFlow) {
            setTimeout(()=>nextQuestion(), 1200);
        } else {
            const nextBtn = document.getElementById('next-btn-lst');
            if(nextBtn) nextBtn.style.display = 'grid'; // または block
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
    
    // 先頭に追加
    list.prepend(li);
}

function updateStreakDisplay() {
    const el = document.getElementById('streak-disp');
    if(el && typeof streak !== 'undefined') el.innerText = streak;
}