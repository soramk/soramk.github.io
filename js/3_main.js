// --- App State & Globals ---
let db = {}, currentCategory = 'basic', currentMode = 'speaking', currentPair = {}, targetObj = {}, isLTarget = false, streak = 0;
let isRecording = false, mediaRecorder = null, audioChunks = [], audioCtx = null, analyser = null, dataArray = null, canvasCtx = null;
let userAudioBlob = null;
let hasSpoken = false, silenceStart = 0; const VAD_THRESHOLD = 15, VAD_SILENCE = 1200;
let visMode = 'frequency'; 
let speechRate = 0.8; 
let selectedLevel = null;

// --- Init ---
window.onload = async () => {
    // データ読み込みを待機
    await loadDb();
    
    initCanvas(); 
    window.addEventListener('resize', initCanvas);
    const key = localStorage.getItem('gemini_key');
    if(key) { document.getElementById('api-key').value=key; fetchModels(true); }
    const rate = localStorage.getItem('lr_rate');
    if(rate) speechRate = parseFloat(rate);
    
    populateCategorySelect(); 
    changeCategory();
};

// --- Core Logic ---
function changeCategory() {
    const sel = document.getElementById('category-select');
    if (Object.keys(db).length === 0) return;
    if (!db[sel.value]) { currentCategory = Object.keys(db)[0] || 'basic'; } else { currentCategory = sel.value; }
    streak=0; updateStreak(); nextQuestion();
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

function nextQuestion(autoStart=false) {
    const list=db[currentCategory];
    if(!list||list.length===0){ document.getElementById('target-word').innerText = "No Data"; return; }

    const fb=document.getElementById('feedback-area'); fb.innerText=currentMode==='speaking'?"Ready":"Listen & Select"; fb.className="feedback";
    document.getElementById('next-btn-spk').style.display='none'; document.getElementById('next-btn-lst').style.display='none'; document.getElementById('rec-btn').style.display='block';
    document.getElementById('replay-user-btn').style.display='none';
    document.querySelector('.container').classList.remove('shake-anim','pop-anim');
    document.querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('success'));

    currentPair=list[Math.floor(Math.random()*list.length)];
    isLTarget=Math.random()>0.5; targetObj=isLTarget?currentPair.l:currentPair.r;

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

function skipQuestion() {
    if(isRecording) { mediaRecorder.stop(); isRecording=false; document.getElementById('rec-btn').classList.remove('recording','processing'); document.getElementById('rec-btn').innerText="🎤 Start"; }
    sfx.skip(); streak=0; updateStreak(); nextQuestion();
}

// --- Record & Gemini ---
async function toggleRecord() {
    const k=document.getElementById('api-key').value, m=document.getElementById('model-select').value;
    if(!k||!m){openSettings();return;}
    const btn=document.getElementById('rec-btn');

    if(isRecording){ 
        mediaRecorder.stop(); isRecording=false; 
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
        mediaRecorder.onstop=()=>{ stream.getTracks().forEach(t=>t.stop()); sendToGemini(mime); };

        isRecording=true; hasSpoken=false; silenceStart=0;
        btn.classList.add('recording'); btn.innerText="■ Stop";
        initCanvas(); visualize(); mediaRecorder.start();
    }catch(e){alert("Mic Error: "+e.message);}
}

async function sendToGemini(mime) {
    const k=document.getElementById('api-key').value, m=document.getElementById('model-select').value;
    const blob=new Blob(audioChunks,{type:mime}); userAudioBlob=blob; document.getElementById('replay-user-btn').style.display='block';
    const b64=await new Promise(r=>{const fr=new FileReader(); fr.onloadend=()=>r(fr.result.split(',')[1]); fr.readAsDataURL(blob);});
    
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
    const p={contents:[{parts:[{text:`Listen audio. User says "${targetObj.w}" or "${(isLTarget?currentPair.r:currentPair.l).w}". Return ONLY English word. Lowercase.`},{inline_data:{mime_type:mime.split(';')[0],data:b64}}]}]};

    try{
        const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
        const d=await res.json(); 
        if(d.error) throw new Error(d.error.message);
        
        let aiText = d.candidates[0].content.parts[0].text.trim().toLowerCase();
        aiText = aiText.replace(/[\.\,\!\?]/g, ''); 
        const words = aiText.split(/\s+/); 
        const lastWord = words[words.length - 1]; 

        checkPronunciation(lastWord);
    }catch(e){
        document.getElementById('feedback-area').innerText="Error: "+e.message;
        document.getElementById('rec-btn').classList.remove('processing');
        document.getElementById('rec-btn').innerText="🎤 Start";
    }
}

function checkPronunciation(txt) {
    const inp=txt, tgt=targetObj.w.toLowerCase();
    const fb=document.getElementById('feedback-area'), auto=document.getElementById('toggle-auto-flow').checked;
    const cont=document.querySelector('.container');
    document.getElementById('rec-btn').classList.remove('processing'); document.getElementById('rec-btn').innerText="🎤 Start";

    const isOk=(inp===tgt); addToHistory(targetObj.w, inp, isOk);

    if(isOk){
        sfx.correct(); cont.classList.add('pop-anim');
        fb.innerHTML=`🎉 Correct! <small>AI: "${inp}"</small>`; fb.className="feedback correct";
        streak++; document.getElementById('rec-btn').style.display='none';
        if(auto) setTimeout(()=>nextQuestion(true),1200); else document.getElementById('next-btn-spk').style.display='block';
    }else{
        sfx.wrong(); cont.classList.add('shake-anim');
        fb.innerHTML=`⚠️ Wrong... <small>AI: "${inp}"</small>`; fb.className="feedback incorrect"; streak=0;
    }
    updateStreak();
}

function checkListening(uL){
    const correct=(isLTarget&&uL)||(!isLTarget&&!uL), fb=document.getElementById('feedback-area'), auto=document.getElementById('toggle-auto-flow').checked;
    const cont=document.querySelector('.container');
    document.getElementById('target-word').innerText=targetObj.w; document.getElementById('target-word').classList.remove('blur');
    document.getElementById('opponent-word').innerText=(isLTarget?currentPair.r:currentPair.l).w;
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
    updateStreak();
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
function updateStreak(){ document.getElementById('streak-disp').innerText=streak; }
function speakModel(){ const u=new SpeechSynthesisUtterance(targetObj.w); u.lang='en-US'; u.rate=speechRate; window.speechSynthesis.speak(u); }
function toggleDarkMode(){ document.body.classList.toggle('dark-mode'); }
