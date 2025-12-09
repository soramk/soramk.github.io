// --- 1. Sound Engine ---
let audioSynth = null;
function unlockAudio() {
    audioSynth = new (window.AudioContext || window.webkitAudioContext)();
    if(audioSynth.state === 'suspended') {
        audioSynth.resume().then(() => {
            document.getElementById('start-overlay').style.display = 'none';
            playTone(440, 'sine', 0.1, 0.05);
        });
    } else {
        document.getElementById('start-overlay').style.display = 'none';
        playTone(440, 'sine', 0.1, 0.05);
    }
}
function playTone(f,t,d,v=0.1) {
    if(!audioSynth) return;
    if(audioSynth.state === 'suspended') audioSynth.resume();
    const o=audioSynth.createOscillator(), g=audioSynth.createGain();
    o.type=t; o.frequency.value=f;
    g.gain.setValueAtTime(v, audioSynth.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioSynth.currentTime+d);
    o.connect(g); g.connect(audioSynth.destination);
    o.start(); o.stop(audioSynth.currentTime+d);
}
const sfx = {
    correct:()=>{playTone(880,'sine',0.1,0.2);setTimeout(()=>playTone(1760,'sine',0.2,0.2),100)},
    wrong:()=>{playTone(150,'sawtooth',0.3,0.2)},
    skip:()=>{playTone(400,'triangle',0.1,0.1)},
    start:()=>{playTone(600,'sine',0.1,0.1)}
};

// --- 2. Data Definition (Visuals) ---
const baseFace = `<path fill="none" stroke="#cbd5e1" stroke-width="2" d="M10,50 Q10,10 45,10 Q80,10 80,50 Q80,90 45,90 Q10,90 10,50" />`;
const visemes = {
    bilabial:{t:"Bilabial",d:"Lips closed (p,b,m)",p:`${baseFace}<path d="M30,60 Q45,60 60,60" stroke="#333" stroke-width="3"/><path d="M30,60 Q45,65 60,60" stroke="#333" stroke-width="1"/>`},
    labiodental:{t:"Labiodental",d:"Top teeth on lip (f,v)",p:`${baseFace}<path d="M30,55 Q45,55 60,55" stroke="#fff" stroke-width="4"/><path d="M30,62 Q45,65 60,62" fill="none" stroke="#333" stroke-width="2"/>`},
    dental:{t:"Dental",d:"Tongue between teeth (th)",p:`${baseFace}<path d="M30,55 Q45,55 60,55" stroke="#fff" stroke-width="4"/><path d="M30,65 Q45,65 60,65" stroke="#fff" stroke-width="4"/><path d="M35,60 Q45,60 55,60" stroke="#ef4444" stroke-width="3"/>`},
    alveolar:{t:"Alveolar",d:"Tongue to gum (t,d,n)",p:`${baseFace}<rect x="30" y="55" width="30" height="10" fill="#333"/><rect x="30" y="55" width="30" height="4" fill="#fff"/><rect x="30" y="61" width="30" height="4" fill="#fff"/>`},
    postalveolar:{t:"Post-Alveolar",d:"Lips rounded (sh,ch)",p:`${baseFace}<circle cx="45" cy="60" r="12" fill="#333"/><rect x="35" y="58" width="20" height="4" fill="#fff"/>`},
    velar:{t:"Velar",d:"Back of throat (k,g)",p:`${baseFace}<path d="M30,55 Q45,75 60,55" fill="#333"/>`},
    l_shape:{t:"L-Shape",d:"Tongue tip UP",p:`${baseFace}<path d="M30,55 Q45,70 60,55" fill="#333"/><path d="M40,55 Q45,50 50,55" fill="#ef4444"/>`},
    r_shape:{t:"R-Shape",d:"Tongue pulled BACK",p:`${baseFace}<circle cx="45" cy="60" r="10" fill="none" stroke="#333" stroke-width="2"/><path d="M40,65 Q45,55 50,65" fill="#ef4444"/>`},
    pucker:{t:"Pucker",d:"Lips small (w)",p:`${baseFace}<circle cx="45" cy="60" r="5" fill="#333" stroke="#333" stroke-width="2"/>`},
    wide:{t:"Wide",d:"Open big (a)",p:`${baseFace}<path d="M25,55 Q45,85 65,55" fill="#333"/>`},
    mid:{t:"Mid",d:"Relaxed (e, uh)",p:`${baseFace}<path d="M30,58 Q45,72 60,58" fill="#333"/>`},
    spread:{t:"Spread",d:"Wide smile (iy)",p:`${baseFace}<path d="M25,60 Q45,65 65,60" fill="#333"/><path d="M25,60 Q45,60 65,60" stroke="#333" stroke-width="1"/>`},
    round:{t:"Round",d:"Oval shape (o)",p:`${baseFace}<ellipse cx="45" cy="60" rx="10" ry="15" fill="#333"/>`},
    u_shape:{t:"U-Shape",d:"Tight circle (u)",p:`${baseFace}<circle cx="45" cy="60" r="8" fill="#333"/>`},
    silence:{t:"Ready",d:"...",p:`${baseFace}<path d="M35,60 L55,60" stroke="#333" stroke-width="2"/>`}
};

// Define default categories to load
const defaultCategories = ['basic', 'intermediate', 'advanced', 'business'];

// --- 3. App State ---
let db = {}, currentCategory = 'basic', currentMode = 'speaking', currentPair = {}, targetObj = {}, isLTarget = false, streak = 0;
let isRecording = false, mediaRecorder = null, audioChunks = [], audioCtx = null, analyser = null, dataArray = null, canvasCtx = null;
let userAudioBlob = null;
let hasSpoken = false, silenceStart = 0; const VAD_THRESHOLD = 15, VAD_SILENCE = 1200;
let visMode = 'frequency'; 
let speechRate = 0.8; 
let selectedLevel = null;

// Init
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

// --- Data Loading Logic (Modified) ---
async function loadDb() {
    // 1. まずLocalStorageをチェック（ユーザーの編集データを優先）
    const s = localStorage.getItem('lr_v24_db');
    if (s) {
        try {
            db = JSON.parse(s);
            console.log("Loaded DB from LocalStorage");
            return;
        } catch (e) {
            console.error("LocalStorage load failed, falling back to files.", e);
        }
    }

    // 2. JSファイルから読み込まれた変数を使用
    // fetch は使いません（CORS回避のため）
    console.log("Loading default datasets from window objects...");
    
    db = {};
    
    // JSファイルで定義した window.dataset_xxx を参照する
    if (typeof window.dataset_basic !== 'undefined') db['basic'] = window.dataset_basic;
    else db['basic'] = [];

    if (typeof window.dataset_intermediate !== 'undefined') db['intermediate'] = window.dataset_intermediate;
    else db['intermediate'] = [];

    if (typeof window.dataset_advanced !== 'undefined') db['advanced'] = window.dataset_advanced;
    else db['advanced'] = [];

    if (typeof window.dataset_business !== 'undefined') db['business'] = window.dataset_business;
    else db['business'] = [];

    console.log("Default DB loaded keys:", Object.keys(db));
}

// --- Core Logic ---
function changeCategory() {
    const sel = document.getElementById('category-select');
    // もしDBロード前に実行された場合のガード
    if (Object.keys(db).length === 0) return;

    // 現在の選択値がDBにあるか確認、なければ最初のキーを選択
    if (!db[sel.value]) {
        currentCategory = Object.keys(db)[0] || 'basic';
    } else {
        currentCategory = sel.value;
    }
    
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
    // データがない場合の安全策
    if(!list||list.length===0){
        document.getElementById('target-word').innerText = "No Data";
        return;
    }

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

function replayUserAudio() {
    if(!userAudioBlob) return;
    const audioUrl = URL.createObjectURL(userAudioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
}

// --- Visualizer ---
function initCanvas(){ 
    const c=document.getElementById("visualizer"), b=document.querySelector(".visualizer-box"), d=window.devicePixelRatio||1; 
    c.width=b.clientWidth*d; c.height=b.clientHeight*d; 
    canvasCtx=c.getContext("2d"); canvasCtx.scale(d,d); 
    canvasCtx.fillStyle='#020617'; canvasCtx.fillRect(0,0,b.clientWidth,b.clientHeight); 
}

function toggleVisMode() {
    visMode = (visMode === 'frequency') ? 'wave' : 'frequency';
    document.getElementById('vis-label').innerText = (visMode === 'frequency') ? 'BARS' : 'WAVE';
}

function visualize(){
    if(!isRecording) return;
    requestAnimationFrame(visualize);
    
    const ctx=canvasCtx, w=ctx.canvas.width/(window.devicePixelRatio||1), h=ctx.canvas.height/(window.devicePixelRatio||1);
    ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);
    
    if (visMode === 'wave') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth=2; ctx.strokeStyle='#0ea5e9'; ctx.beginPath();
        const slice=w*1.0/dataArray.length; let x=0;
        for(let i=0;i<dataArray.length;i++){
            const v=dataArray[i]/128.0, y=v*h/2; 
            if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); x+=slice;
        }
        ctx.stroke();
    } else {
        analyser.getByteFrequencyData(dataArray);
        const barW = (w / dataArray.length) * 2.5; let x=0; let sum=0;
        for(let i=0; i<dataArray.length; i++) {
            const barH = (dataArray[i] / 255) * h;
            sum += dataArray[i];
            ctx.fillStyle = `rgb(${barH+100}, 50, 255)`;
            ctx.fillRect(x, h-barH, barW, barH);
            x += barW + 1;
        }
        const vol=Math.floor((sum/dataArray.length)*2); 
        document.getElementById('mic-debug').innerText=`Vol: ${vol}%`;
        if(document.getElementById('toggle-auto-stop').checked){
            if(vol>VAD_THRESHOLD){ hasSpoken=true; silenceStart=Date.now(); }
            else if(hasSpoken && Date.now()-silenceStart>VAD_SILENCE){ toggleRecord(); hasSpoken=false; }
        }
    }
}

// --- Helpers ---
function addToHistory(t,h,ok){
    const l=document.getElementById('history-list');
    l.innerHTML=`<li class="history-item"><span class="${ok?'res-ok':'res-ng'}">${ok?'OK':'NG'}</span><span>Target: ${t} / AI: ${h}</span></li>`+l.innerHTML;
}
function renderPhonemes() {
    const div=document.getElementById('phoneme-list'); div.innerHTML="";
    if(!targetObj.b) return;
    targetObj.b.forEach((ph,i)=>{
        const b=document.createElement('div'); b.className='phoneme-btn'; b.innerText=`/${ph.p}/`;
        b.onclick=()=>showDiagram(ph.t,b); div.appendChild(b);
        if(i===0) setTimeout(()=>b.click(),10);
    });
}
function showDiagram(type,btn) {
    if(btn){document.querySelectorAll('.phoneme-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');}
    const d=visemes[type]||visemes.silence;
    document.getElementById('diagram-svg').innerHTML=`<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">${d.p}</svg>`;
    document.getElementById('diagram-title').innerHTML=`${d.t} <span id="viseme-tag" style="font-size:0.7em; color:var(--accent); margin-left:5px;">${type.toUpperCase()}</span>`;
    document.getElementById('diagram-desc').innerText=d.d;
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
function updateStreak(){ document.getElementById('streak-disp').innerText=streak; }
function speakModel(){ const u=new SpeechSynthesisUtterance(targetObj.w); u.lang='en-US'; u.rate=speechRate; window.speechSynthesis.speak(u); }
function toggleDarkMode(){ document.body.classList.toggle('dark-mode'); }

// --- Settings & DB Logic (New & Fixed) ---

function openSettings() { document.getElementById('settings-modal').style.display='flex'; document.getElementById('speech-rate').value = speechRate; document.getElementById('rate-val').innerText = speechRate; }
function closeSettings() { document.getElementById('settings-modal').style.display='none'; }
function saveSettings() { 
    const k=document.getElementById('api-key').value; 
    if(k) localStorage.setItem('gemini_key',k);
    speechRate = parseFloat(document.getElementById('speech-rate').value);
    localStorage.setItem('lr_rate', speechRate);
    closeSettings(); 
}
async function fetchModels(silent=false) {
    const k=document.getElementById('api-key').value;
    const sel = document.getElementById('model-select');
    try {
        const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${k}`);
        const d=await r.json();
        sel.innerHTML='';
        d.models.filter(m=>m.supportedGenerationMethods?.includes("generateContent")&&(m.name.includes("flash")||m.name.includes("pro"))).forEach(m=>{
            const o=document.createElement('option'); o.value=m.name.replace('models/',''); o.text=m.displayName; sel.appendChild(o);
        });
        sel.disabled=false;
    } catch(e) { if(!silent) alert(e.message); }
}
// Old synchronous loadDb removed. New async version is at the top.
function populateCategorySelect() { const s=document.getElementById('category-select'); s.innerHTML=''; Object.keys(db).forEach(k=>{const o=document.createElement('option');o.value=k;o.text=`${k} (${db[k].length})`;s.appendChild(o);}); if(db[currentCategory])s.value=currentCategory; }

// --- DB MANAGER LOGIC ---

function openDbManager() {
    document.getElementById('db-manager-modal').style.display = 'flex';
    renderDbList();
    // Reset view
    selectedLevel = null;
    document.getElementById('current-level-title').innerText = "Select a Level";
    document.getElementById('word-table-container').innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:50px;">👈 Select a level list</p>';
    document.getElementById('level-actions').style.display = 'none';
    document.getElementById('word-actions').style.display = 'none';
}

function closeDbManager() { 
    document.getElementById('db-manager-modal').style.display = 'none'; 
    populateCategorySelect(); 
    changeCategory(); 
}

function renderDbList() {
    const l = document.getElementById('db-level-list');
    l.innerHTML = '';
    Object.keys(db).forEach(k => {
        const li = document.createElement('li');
        li.className = 'db-item';
        li.style.cursor = 'pointer';
        if (k === selectedLevel) li.style.background = 'rgba(128,128,128,0.1)';
        
        li.innerHTML = `<span>${k}</span> <span style="font-size:0.8rem; opacity:0.7;">(${db[k].length})</span>`;
        li.onclick = () => selectLevel(k);
        l.appendChild(li);
    });
}

function selectLevel(k) {
    selectedLevel = k;
    renderDbList();
    document.getElementById('current-level-title').innerText = k;
    document.getElementById('level-actions').style.display = 'flex';
    document.getElementById('word-actions').style.display = 'block';
    renderWordTable();
}

function renderWordTable() {
    const container = document.getElementById('word-table-container');
    const list = db[selectedLevel];
    
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">No words yet. Add one!</p>';
        return;
    }

    let html = '<table style="width:100%; border-collapse: collapse; font-size:0.9rem;">';
    html += '<tr style="border-bottom:2px solid rgba(128,128,128,0.2); text-align:left;"><th>L Word</th><th>R Word</th><th style="text-align:right;">Action</th></tr>';
    
    list.forEach((pair, idx) => {
        const hasPhonemes = (pair.l.b && pair.l.b.length > 0);
        const statusIcon = hasPhonemes ? '✅' : '⚠️';
        
        html += `<tr style="border-bottom:1px solid rgba(128,128,128,0.1);">
            <td style="padding:8px;">${pair.l.w}</td>
            <td style="padding:8px;">${pair.r.w}</td>
            <td style="padding:8px; text-align:right;">
                <span title="${hasPhonemes ? 'Animation Ready' : 'No Animation Data'}" style="cursor:help; font-size:0.8rem; margin-right:10px;">${statusIcon}</span>
                <button onclick="deletePair(${idx})" class="btn-small" style="background:var(--err);">Delete</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
}

function addNewLevel() {
    const n = prompt("New Level Name (e.g., 'Travel'):");
    if (n && !db[n]) {
        db[n] = [];
        saveDb();
        renderDbList();
        selectLevel(n);
    } else if(db[n]) {
        alert("Level already exists!");
    }
}

function deleteLevel() {
    if (!selectedLevel) return;
    if (confirm(`Delete level "${selectedLevel}" and all its words?`)) {
        delete db[selectedLevel];
        selectedLevel = null;
        saveDb();
        openDbManager();
    }
}

function addWordPair() {
    if (!selectedLevel) return;
    const lWord = prompt("Enter 'L' word (e.g., Light):");
    if (!lWord) return;
    const rWord = prompt("Enter 'R' word (e.g., Right):");
    if (!rWord) return;

    db[selectedLevel].push({
        l: { w: lWord, b: [] },
        r: { w: rWord, b: [] }
    });
    saveDb();
    renderWordTable();
}

function deletePair(idx) {
    if (!selectedLevel) return;
    if (confirm("Delete this pair?")) {
        db[selectedLevel].splice(idx, 1);
        saveDb();
        renderWordTable();
    }
}

function exportLevel() {
    if (!selectedLevel) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db[selectedLevel], null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `LR_Master_${selectedLevel}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function triggerImport() {
    document.getElementById('import-file').click();
}

function importLevel(input) {
    if (!selectedLevel) return;
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (!Array.isArray(json)) throw new Error("File must contain a list (array) of word pairs.");
            
            if(confirm("Click OK to APPEND to existing list.\nClick Cancel to REPLACE existing list.")) {
                db[selectedLevel] = db[selectedLevel].concat(json);
            } else {
                db[selectedLevel] = json;
            }
            
            saveDb();
            renderWordTable();
            alert("Import successful!");
        } catch (err) {
            alert("Import failed: " + err.message);
        }
        input.value = '';
    };
    reader.readAsText(file);
}

function saveDb() {
    localStorage.setItem('lr_v24_db', JSON.stringify(db));
}

async function resetDb(){
    if(confirm("Reset all data to defaults? This cannot be undone.")){
        localStorage.removeItem('lr_v24_db'); 
        // Reload defaults from files
        await loadDb();
        openDbManager();
    }
}
