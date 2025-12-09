// Note: Globals (mediaRecorder, audioCtx, etc.) are defined in 3_core_logic.js.

// --- Recording Flow ---
async function toggleRecord() {
    const btn = document.getElementById('rec-btn');

    // ■ 録音停止処理
    if (isRecording) {
        stopRecordingInternal();
        return;
    }

    // キーチェック
    const kGemini = document.getElementById('api-key-gemini').value;
    const kOpenAI = document.getElementById('api-key-openai').value;
    if(currentProvider === 'gemini' && !kGemini) { openSettings(); return; }
    if(currentProvider === 'openai' && !kOpenAI) { openSettings(); return; }

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
            currentStream = stream; 
        } catch(err) {
            console.warn("Mic access failed:", err);
            alert("マイクへのアクセスが拒否されました。");
            isRecording = false;
            btn.classList.remove('recording');
            btn.innerText = "🎤 Start";
            return;
        }

        // 2. ビジュアライザー起動
        if(typeof startAudioVisualization === 'function') {
            startAudioVisualization(stream);
        }
        
        // 3. MediaRecorder開始 (全モード必須: 録音後の波形と再生のため)
        let mime='audio/webm'; 
        if(MediaRecorder.isTypeSupported('audio/mp4')) mime='audio/mp4';
        else if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime='audio/webm;codecs=opus';

        mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        
        // 録音停止時の処理（共通）
        mediaRecorder.onstop = async () => { 
            // マイク停止
            if(currentStream) currentStream.getTracks().forEach(t => t.stop()); 
            
            const blob = new Blob(audioChunks, { type: mime }); 
            userAudioBlob = blob; 
            document.getElementById('replay-user-btn').style.display = 'block';

            // 静的波形生成 (録音データから)
            if(audioCtx) {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    if(typeof renderStaticResult === 'function') renderStaticResult(audioBuffer); 
                } catch(e) { console.error("Audio Decode Error", e); }
            }

            // ★ API分岐: Web Speech以外の場合のみ、ここでAPIに送信
            // (Web Speechの場合は、音声認識側で勝手に判定が進むのでここでは何もしない)
            if (currentProvider !== 'web') {
                if(currentProvider === 'openai') {
                    if(typeof sendToOpenAI === 'function') sendToOpenAI(blob, mime);
                } else {
                    if(typeof sendToGemini === 'function') sendToGemini(blob, mime); 
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

function stopRecordingInternal() {
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
        
        // Web SpeechはAPI通信待ち時間がないので、即座にUIを戻す
        // (onresultで正解判定が出る場合もあるが、手動停止時はここでもケア)
        setTimeout(() => {
            if(btn && btn.innerText === "Analyzing...") {
                btn.classList.remove('processing');
                btn.innerText = "🎤 Start";
            }
        }, 500);
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

function skipQuestion() {
    if(isRecording) { stopRecordingInternal(); }
    sfx.skip(); streak=0; updateStreakDisplay(); nextQuestion();
}

// --- Result Handling & UI Updates ---

function handleError(e) {
    console.error(e);
    const msg = e.message || e;
    document.getElementById('feedback-area').innerText="Error: "+ msg;
    const btn = document.getElementById('rec-btn');
    if(btn) {
        btn.classList.remove('processing');
        btn.classList.remove('recording');
        btn.innerText="🎤 Start";
        btn.style.display = 'block';
    }
}

function checkPronunciation(aiResult) {
    const inp = aiResult.heard.toLowerCase();
    const isOk = aiResult.correct; 
    
    const fb=document.getElementById('feedback-area');
    const auto=document.getElementById('toggle-auto-flow').checked;
    const cont=document.querySelector('.container');
    
    const btn=document.getElementById('rec-btn');
    // 結果が出たらボタンをリセット
    btn.classList.remove('processing'); 
    btn.classList.remove('recording'); 
    btn.innerText="🎤 Start";
    btn.style.display='none'; 

    updateWordStats(isOk); 
    addToHistory(targetObj.w, inp, isOk);

    if(isOk){
        sfx.correct(); cont.classList.add('pop-anim');
        fb.innerHTML=`🎉 Correct!<br><small style="color:var(--text); opacity:0.8;">Heard: "${inp}"</small>`; 
        fb.className="feedback correct";
        streak++; 
        if(auto) setTimeout(()=>nextQuestion(true),1500); else document.getElementById('next-btn-spk').style.display='block';
    }else{
        sfx.wrong(); cont.classList.add('shake-anim');
        const adviceText = aiResult.advice || "Try again!";
        fb.innerHTML=`⚠️ ${inp}<br><small style="font-size:0.8rem; color:var(--text); font-weight:bold;">💡 ${adviceText}</small>`; 
        fb.className="feedback incorrect"; streak=0;
        btn.style.display='block'; // 再挑戦ボタン表示
    }
    updateStreakDisplay();
}

function checkListening(uL){
    const correct=(isLTarget&&uL)||(!isLTarget&&!uL), fb=document.getElementById('feedback-area'), auto=document.getElementById('toggle-auto-flow').checked;
    const cont=document.querySelector('.container');
    document.getElementById('target-word').innerText=targetObj.w; document.getElementById('target-word').classList.remove('blur');
    document.getElementById('opponent-word').innerText=(isLTarget?currentPair.r:currentPair.l).w;
    
    updateWordStats(correct);
    addToHistory(targetObj.w, uL?"Selected L":"Selected R", correct);
    
    if(correct){
        sfx.correct(); cont.classList.add('pop-anim');
        fb.innerHTML="🎉 Correct!"; fb.className="feedback correct"; streak++;
        document.getElementById(uL?'choice-l':'choice-r').classList.add('success');
        if(auto) setTimeout(()=>nextQuestion(),1200); else document.getElementById('next-btn-lst').style.display='grid';
    }else{
        sfx.wrong(); cont.classList.add('shake-anim');
        fb.innerHTML="😢 Wrong..."; fb.className="feedback incorrect"; streak=0; document.getElementById('next-btn-lst').style.display='grid';
    }
    updateStreakDisplay();
}

function replayUserAudio() {
    if(!userAudioBlob) return;
    const audioUrl = URL.createObjectURL(userAudioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
}

function addToHistory(t,h,ok){
    const l=document.getElementById('history-list');
    l.innerHTML=`<li class="history-item"><span class="${ok?'res-ok':'res-ng'}">${ok?'OK':'NG'}</span><span>Target: ${t} / AI: ${h}</span></li>`+l.innerHTML;
}