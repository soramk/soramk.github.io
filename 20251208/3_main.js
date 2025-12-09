// --- App State & Globals ---
let db = {}, currentCategory = 'basic', currentMode = 'speaking', currentPair = {}, targetObj = {}, isLTarget = false, streak = 0;
let isRecording = false, mediaRecorder = null, audioChunks = [], audioCtx = null, analyser = null, dataArray = null, canvasCtx = null;
let userAudioBlob = null;
let hasSpoken = false, silenceStart = 0; const VAD_THRESHOLD = 15, VAD_SILENCE = 1200;
let visMode = 'wave'; 
let speechRate = 0.8; 
let selectedLevel = null;

// --- Init ---
window.onload = async () => {
    // 最初にHTML部品を生成する
    if(typeof injectUI === 'function') injectUI();

    await loadDb();
    initCanvas(); 
    window.addEventListener('resize', initCanvas);
    
    // HTML生成後に要素を取得するのでエラーにならない
    const key = localStorage.getItem('gemini_key');
    if(key) { 
        const keyInput = document.getElementById('api-key');
        if(keyInput) keyInput.value = key; 
        fetchModels(true); 
    }
    
    const rate = localStorage.getItem('lr_rate');
    if(rate) speechRate = parseFloat(rate);
    
    populateCategorySelect(); 
    changeCategory();
};

// --- Core Logic ---
// (これ以降のコードは前回の修正版と同じなので変更不要ですが、念のためすべて記載します)
function changeCategory() {
    const sel = document.getElementById('category-select');
    if (Object.keys(db).length === 0) return;
    if (!db[sel.value]) { currentCategory = Object.keys(db)[0] || 'basic'; } else { currentCategory = sel.value; }
    streak=0; updateStreakDisplay(); nextQuestion();
}

function setMode(m) {
    currentMode=m; document.querySelectorAll('.mode-toggle button').forEach(b=>b.classList.remove('active'));
    if(m==='speaking'){
        document.getElementById('mode-speak').classList.add('active');
        document.getElementById('controls-speaking').style.display='grid';
        document.getElementById('controls-listening').style.display='none';
        document.getElementById('speaking-tools').style.display='block';
        document.getElementById('target-word').classList.remove('blur');
    }else{
        document.getElementById('mode-listen').classList.add('active');
        document.getElementById('controls-speaking').style.display='none';
        document.getElementById('controls-listening').style.display='grid';
        document.getElementById('speaking-tools').style.display='none';
        document.getElementById('target-word').classList.add('blur');
    }
    nextQuestion();
}

// SRS Logic
function nextQuestion(autoStart=false) {
    const list = db[currentCategory];
    if(!list || list.length === 0){ document.getElementById('target-word').innerText = "No Data"; return; }

    const fb=document.getElementById('feedback-area'); fb.innerText=currentMode==='speaking'?"Ready":"Listen & Select"; fb.className="feedback";
    document.getElementById('next-btn-spk').style.display='none'; document.getElementById('next-btn-lst').style.display='none'; document.getElementById('rec-btn').style.display='block';
    document.getElementById('replay-user-btn').style.display='none';
    document.querySelector('.container').classList.remove('shake-anim','pop-anim');
    document.querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('success'));

    // SRS Filter
    const now = Date.now();
    const dueItems = list.filter(item => !item.nextReview || item.nextReview <= now);
    
    if (dueItems.length > 0 && Math.random() > 0.3) {
        currentPair = dueItems[Math.floor(Math.random() * dueItems.length)];
    } else {
        currentPair = list[Math.floor(Math.random() * list.length)];
    }

    isLTarget = Math.random() > 0.5; 
    targetObj = isLTarget ? currentPair.l : currentPair.r;

    const tEl=document.getElementById('target-word');
    if(currentMode==='listening'){
        tEl.innerText="?????"; tEl.classList.add('blur');
        document.getElementById('choice-l').innerText=currentPair.l.w; document.getElementById('choice-r').innerText=currentPair.r.w;
        document.getElementById('opponent-word').innerText="???";
        setTimeout(speakModel,500);
    }else{
        tEl.innerText=targetObj.w; tEl.classList.remove('blur');
        document.getElementById('opponent-word').innerText=(isLTarget?currentPair.r:currentPair.l).w;
        renderPhonemes();
        if(autoStart) setTimeout(toggleRecord,500);
    }
}

function updateWordStats(isCorrect) {
    if (!currentPair.streak) currentPair.streak = 0;
    if (isCorrect) {
        currentPair.streak += 1;
        const bonusTime = 60 * 1000 * Math.pow(4, currentPair.streak); 
        currentPair.nextReview = Date.now() + bonusTime;
    } else {
        currentPair.streak = 0;
        currentPair.nextReview = Date.now();
    }
    saveDb();
}

function skipQuestion() {
    if(isRecording) { stopRecordingInternal(); }
    sfx.skip(); streak=0; updateStreakDisplay(); nextQuestion();
}

// --- Record & Gemini ---
async function toggleRecord() {
    const k=document.getElementById('api-key').value, m=document.getElementById('model-select').value;
    if(!k||!m){openSettings();return;}
    const btn=document.getElementById('rec-btn');

    if(isRecording){ 
        stopRecordingInternal();
        btn.classList.remove('recording'); btn.classList.add('processing'); btn.innerText="Analyzing..."; 
        return; 
    }

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

            // Decode for Visualization History
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            renderStaticResult(audioBuffer); 

            sendToGemini(blob, mime); 
        };

        isRecording=true; hasSpoken=false; silenceStart=0;
        btn.classList.add('recording'); btn.innerText="■ Stop";
        
        resetVisualizerState();
        initCanvas(); 
        visualize(); 
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

// Prompt: Force Japanese JSON
async function sendToGemini(blob, mime) {
    const k=document.getElementById('api-key').value, m=document.getElementById('model-select').value;
    const b64=await new Promise(r=>{const fr=new FileReader(); fr.onloadend=()=>r(fr.result.split(',')[1]); fr.readAsDataURL(blob);});
    
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
    
    const promptText = `
    Input: Audio of a user trying to pronounce the English word "${targetObj.w}".
    Task:
    1. Identify the heard word.
    2. Compare it with the target "${targetObj.w}" and the distractor "${(isLTarget?currentPair.r:currentPair.l).w}".
    3. If incorrect, provide a 1-sentence advice IN JAPANESE (日本語) about tongue position or lips.
    
    Output Format (JSON Only):
    {
      "heard": "english_word_heard",
      "correct": true/false,
      "advice": "日本語のアドバイス文字列"
    }
    `;

    const p={
        contents:[{parts:[{text:promptText},{inline_data:{mime_type:mime.split(';')[0],data:b64}}]}],
        generationConfig: { response_mime_type: "application/json" }
    };

    try{
        const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
        const d=await res.json(); 
        if(d.error) throw new Error(d.error.message);
        
        let rawText = d.candidates[0].content.parts[0].text;
        const result = JSON.parse(rawText);
        checkPronunciation(result);
    }catch(e){
        console.error(e);
        document.getElementById('feedback-area').innerText="Error: "+e.message;
        document.getElementById('rec-btn').classList.remove('processing');
        document.getElementById('rec-btn').innerText="🎤 Start";
    }
}

function checkPronunciation(aiResult) {
    const inp = aiResult.heard.toLowerCase();
    const isOk = aiResult.correct || inp === targetObj.w.toLowerCase();
    
    const fb=document.getElementById('feedback-area');
    const auto=document.getElementById('toggle-auto-flow').checked;
    const cont=document.querySelector('.container');
    document.getElementById('rec-btn').classList.remove('processing'); document.getElementById('rec-btn').innerText="🎤 Start";

    updateWordStats(isOk); 
    addToHistory(targetObj.w, inp, isOk);

    if(isOk){
        sfx.correct(); cont.classList.add('pop-anim');
        fb.innerHTML=`🎉 Correct!<br><small style="color:var(--text); opacity:0.8;">AI Heard: "${inp}"</small>`; 
        fb.className="feedback correct";
        streak++; document.getElementById('rec-btn').style.display='none';
        if(auto) setTimeout(()=>nextQuestion(true),1500); else document.getElementById('next-btn-spk').style.display='block';
    }else{
        sfx.wrong(); cont.classList.add('shake-anim');
        const adviceText = aiResult.advice || "もう一度トライ！";
        fb.innerHTML=`⚠️ ${inp}<br><small style="font-size:0.8rem; color:var(--text); font-weight:bold;">💡 ${adviceText}</small>`; 
        fb.className="feedback incorrect"; streak=0;
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
function updateStreakDisplay(){ document.getElementById('streak-disp').innerText=streak; }
function speakModel(){ const u=new SpeechSynthesisUtterance(targetObj.w); u.lang='en-US'; u.rate=speechRate; window.speechSynthesis.speak(u); }
function toggleDarkMode(){ document.body.classList.toggle('dark-mode'); }