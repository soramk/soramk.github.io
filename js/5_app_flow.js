// Note: Globals (mediaRecorder, audioCtx, etc.) are defined in 3_core_logic.js.

// --- Recording Flow ---
async function toggleRecord() {
    const btn = document.getElementById('rec-btn');

    // 録音停止処理
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
        // 1. マイクストリーム取得 (これが波形の元になります)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentStream = stream; // グローバルに保持

        // 2. ビジュアライザー起動 (共通処理)
        startAudioVisualization(stream); 

        // 3. UI更新
        isRecording = true;
        hasSpoken = false;
        silenceStart = 0;
        btn.classList.add('recording');
        
        // 4. プロバイダーごとの録音/認識開始
        if (currentProvider === 'web') {
            // Web Speech API
            btn.innerText = "■ Stop (Web)";
            startWebSpeech(); // api_client.js
        } else {
            // Gemini / OpenAI -> MediaRecorder使用
            btn.innerText = "■ Stop";
            
            // MediaRecorder設定
            if(analyser) analyser.disconnect(); // 前の接続を切る
            
            // ストリームをAnalyserにつなぎなおすのは visualizer でやっているのでOK
            // MediaRecorder用に同じストリームを使う
            let mime='audio/webm'; 
            if(MediaRecorder.isTypeSupported('audio/mp4')) mime='audio/mp4';
            else if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime='audio/webm;codecs=opus';

            mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = async () => { 
                // ストリーム停止 (マイクOFF)
                stream.getTracks().forEach(t => t.stop()); 
                
                const blob = new Blob(audioChunks, { type: mime }); 
                userAudioBlob = blob; 
                document.getElementById('replay-user-btn').style.display = 'block';

                // 静的波形生成
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                if(typeof renderStaticResult === 'function') renderStaticResult(audioBuffer); 

                // API送信
                if(currentProvider === 'openai') {
                    if(typeof sendToOpenAI === 'function') sendToOpenAI(blob, mime);
                } else {
                    if(typeof sendToGemini === 'function') sendToGemini(blob, mime); 
                }
            };

            mediaRecorder.start();
        }

    } catch(e) {
        alert("Mic Error: " + e.message);
        isRecording = false;
    }
}

function stopRecordingInternal() {
    const btn = document.getElementById('rec-btn');
    
    // Web Speech停止
    if(currentProvider === 'web') {
        if(typeof stopWebSpeech === 'function') stopWebSpeech();
    }
    
    // MediaRecorder停止
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    } else if (currentProvider === 'web' && currentStream) {
        // Web Speechの場合はMediaRecorderのonstopが走らないので、ここでストリームを止める
        currentStream.getTracks().forEach(t => t.stop());
    }

    isRecording = false;
    if(btn) {
        btn.classList.remove('recording');
        btn.classList.add('processing'); 
        btn.innerText = "Analyzing...";
        // Web Speechの場合はAnalyzing...を一瞬出してすぐ戻るが、onresultで制御される
    }
}

function skipQuestion() {
    if(isRecording) { stopRecordingInternal(); }
    sfx.skip(); streak=0; updateStreakDisplay(); nextQuestion();
}

// --- Result Handling & UI Updates ---

function handleError(e) {
    console.error(e);
    document.getElementById('feedback-area').innerText="Error: "+e.message;
    document.getElementById('rec-btn').classList.remove('processing');
    document.getElementById('rec-btn').innerText="🎤 Start";
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
        const adviceText = aiResult.advice || "もう一度トライ！";
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