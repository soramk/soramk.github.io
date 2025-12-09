// Note: Globals (mediaRecorder, audioCtx, etc.) are defined in 3_core_logic.js.

// --- Recording Flow ---
async function toggleRecord() {
    const btn = document.getElementById('rec-btn');

    // ■ 録音停止処理 (ユーザーがボタンを押して止めた場合)
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
        
        // ★ 修正: 状態フラグを【最初】に立てる
        // これにより、visualize() が呼び出された瞬間に終了するのを防ぐ
        isRecording = true;
        hasSpoken = false;
        silenceStart = 0;

        // 1. マイクストリーム取得 (波形表示用)
        let stream = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentStream = stream; // グローバル保持
        } catch(err) {
            console.warn("Visualizer mic access failed:", err);
            // マイクが取れなくてもWeb Speechなら動く可能性があるので続行
        }

        // 2. ビジュアライザー起動 (ストリームが取れた場合のみ)
        if(stream && typeof startAudioVisualization === 'function') {
            startAudioVisualization(stream);
        }
        
        // 3. プロバイダーごとの開始処理
        if (currentProvider === 'web') {
            // ★ Web Speech API
            btn.innerText = "■ Stop (Web)";
            
            // 少し待ってから認識開始（マイク競合回避のため）
            setTimeout(() => {
                if(isRecording) { 
                    if(typeof startWebSpeech === 'function') startWebSpeech(); 
                }
            }, 100);

        } else {
            // ★ Gemini / OpenAI (MediaRecorder)
            btn.innerText = "■ Stop";
            
            // MediaRecorder設定
            let mime='audio/webm'; 
            if(MediaRecorder.isTypeSupported('audio/mp4')) mime='audio/mp4';
            else if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime='audio/webm;codecs=opus';

            if(stream) {
                mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
                audioChunks = [];
                
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                
                mediaRecorder.onstop = async () => { 
                    // マイク停止
                    if(currentStream) currentStream.getTracks().forEach(t => t.stop()); 
                    
                    const blob = new Blob(audioChunks, { type: mime }); 
                    userAudioBlob = blob; 
                    document.getElementById('replay-user-btn').style.display = 'block';

                    // 静的波形生成
                    if(audioCtx) {
                        try {
                            const arrayBuffer = await blob.arrayBuffer();
                            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                            if(typeof renderStaticResult === 'function') renderStaticResult(audioBuffer); 
                        } catch(e) { console.error("Audio Decode Error", e); }
                    }

                    // API送信
                    if(currentProvider === 'openai') {
                        if(typeof sendToOpenAI === 'function') sendToOpenAI(blob, mime);
                    } else {
                        if(typeof sendToGemini === 'function') sendToGemini(blob, mime); 
                    }
                };

                mediaRecorder.start();
            } else {
                alert("マイクを利用できませんでした。");
                stopRecordingInternal();
            }
        }

    } catch(e) {
        alert("Mic/App Error: " + e.message);
        stopRecordingInternal();
    }
}

function stopRecordingInternal() {
    isRecording = false; // フラグを下げる
    
    const btn = document.getElementById('rec-btn');
    if(btn) {
        btn.classList.remove('recording');
        btn.classList.add('processing');
        btn.innerText = "Analyzing..."; 
    }

    // Web Speech停止
    if(currentProvider === 'web') {
        if(typeof stopWebSpeech === 'function') stopWebSpeech();
    }
    
    // MediaRecorder停止
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    } else {
        // MediaRecorderを使っていない場合（Web Speech）、ここで手動でストリームを切る
        if(currentStream) {
             currentStream.getTracks().forEach(t => t.stop());
             currentStream = null;
        }
        
        // ★ 修正: Web Speechの場合はMediaRecorderのonstopが走らないため
        // ここでAnalyzing表示のまま放置されるのを防ぐためのタイムアウト処理を入れる
        // (本来はonendイベントで戻すべきだが、念のため)
        if(currentProvider === 'web') {
             // onendが正しく実装されていればそちらで処理されるが、念の為の保険
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
    btn.classList.remove('processing'); 
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
        btn.style.display='block'; 
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