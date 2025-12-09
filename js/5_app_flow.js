// --- Globals from other files needed: mediaRecorder, audioCtx, etc. ---
let mediaRecorder = null, audioChunks = [], audioCtx = null, analyser = null, dataArray = null, canvasCtx = null;
let userAudioBlob = null;
let hasSpoken = false, silenceStart = 0; const VAD_THRESHOLD = 15, VAD_SILENCE = 1200;

// --- Recording Flow ---
async function toggleRecord() {
    // Web Speech APIの場合はAPI Clientの処理へ移譲
    if(currentProvider === 'web') {
        toggleWebSpeech();
        return;
    }

    const btn=document.getElementById('rec-btn');

    if(isRecording){ 
        stopRecordingInternal();
        btn.classList.remove('recording'); btn.classList.add('processing'); btn.innerText="Analyzing..."; 
        return; 
    }

    // キーチェック
    const kGemini = document.getElementById('api-key-gemini').value;
    const kOpenAI = document.getElementById('api-key-openai').value;
    if(currentProvider === 'gemini' && !kGemini) { openSettings(); return; }
    if(currentProvider === 'openai' && !kOpenAI) { openSettings(); return; }

    try{
        sfx.start();
        if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
        if(audioCtx.state==='suspended') await audioCtx.resume();
        
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        if(analyser) analyser.disconnect(); analyser=audioCtx.createAnalyser(); 
        analyser.fftSize=2048; analyser.smoothingTimeConstant = 0.8;
        dataArray=new Uint8Array(analyser.frequencyBinCount);
        const src=audioCtx.createMediaStreamSource(stream); src.connect(analyser);

        let mime='audio/webm'; 
        if(MediaRecorder.isTypeSupported('audio/mp4')) mime='audio/mp4';
        else if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime='audio/webm;codecs=opus';

        mediaRecorder=new MediaRecorder(stream,{mimeType:mime}); audioChunks=[];
        mediaRecorder.ondataavailable=e=>audioChunks.push(e.data);
        
        mediaRecorder.onstop= async ()=>{ 
            stream.getTracks().forEach(t=>t.stop()); 
            
            const blob=new Blob(audioChunks,{type:mime}); 
            userAudioBlob=blob; 
            document.getElementById('replay-user-btn').style.display='block';

            // Visuals (Static Result)
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            renderStaticResult(audioBuffer); 

            // プロバイダー分岐
            if(currentProvider === 'openai') {
                sendToOpenAI(blob, mime);
            } else {
                sendToGemini(blob, mime); 
            }
        };

        isRecording=true; hasSpoken=false; silenceStart=0;
        btn.classList.add('recording'); btn.innerText="■ Stop";
        
        resetVisualizerState(); // from 1_audio_visuals.js
        initCanvas(); 
        visualize(); // from 1_audio_visuals.js
        mediaRecorder.start();
    }catch(e){alert("Mic Error: "+e.message);}
}

function stopRecordingInternal() {
    if(mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('rec-btn').classList.remove('recording');
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