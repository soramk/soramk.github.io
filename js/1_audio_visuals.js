// --- 1. Sound Engine ---
let audioSynth = null;

function unlockAudio() {
    audioSynth = new (window.AudioContext || window.webkitAudioContext)();
    if(audioSynth.state === 'suspended') {
        audioSynth.resume().then(() => {
            const overlay = document.getElementById('start-overlay');
            if(overlay) overlay.style.display = 'none';
            playTone(440, 'sine', 0.1, 0.05);
        });
    } else {
        const overlay = document.getElementById('start-overlay');
        if(overlay) overlay.style.display = 'none';
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

// --- Visualizer State ---
let specCanvas = null; 
let lastAudioBuffer = null; 
let frequencySum = null; 
let frequencyCount = 0;

const explTexts = {
    wave: "【波形 (Wave)】<br>声の「大きさ」の時間変化です。R/Lの違いは形にはあまり出ませんが、リズムや強弱が分かります。",
    spectrogram: "【声紋 (Spectrogram)】<br>声の成分分析です。下から3本目の線(F3)に注目。<br><b>R:</b> F3がグッと下がります。<br><b>L:</b> F3は高いまま維持されます。",
    frequency: "【周波数分布 (Spectrum)】<br>声の「高さ」の成分平均です。左が低い音、右が高い音。<br>Rの方が低い成分(左側)が強く出やすい傾向があります。"
};

function initCanvas(){ 
    const c=document.getElementById("visualizer");
    if(!c) return; 
    
    const b=document.querySelector(".visualizer-box"), d=window.devicePixelRatio||1; 
    c.width=b.clientWidth*d; c.height=b.clientHeight*d; 
    canvasCtx=c.getContext("2d"); canvasCtx.scale(d,d); 
    
    if(!specCanvas) {
        specCanvas = document.createElement('canvas');
        specCanvas.width = 1000; specCanvas.height = 256; 
    }
    
    updateVisExplanation();

    if(!isRecording && lastAudioBuffer) {
        renderStaticResult(lastAudioBuffer);
    } else if (!isRecording) {
        canvasCtx.fillStyle='#020617'; canvasCtx.fillRect(0,0,b.clientWidth,b.clientHeight); 
        canvasCtx.font = "14px sans-serif"; canvasCtx.fillStyle = "rgba(255,255,255,0.3)";
        canvasCtx.fillText("Tap Start to Record", 20, 30);
    }
}

// ★ 修正: GC対策のためグローバル変数を活用 + frequencySum初期化を確実に
function startAudioVisualization(stream) {
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    
    if(analyser) analyser.disconnect();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // ★ リセット時にスペクトル合計用配列も作り直す
    frequencySum = new Float32Array(analyser.frequencyBinCount);
    frequencyCount = 0;

    // 古いソースがあれば切断
    if(audioSourceNode) audioSourceNode.disconnect();
    
    audioSourceNode = audioCtx.createMediaStreamSource(stream);
    audioSourceNode.connect(analyser);
    
    resetVisualizerState();
    initCanvas();
    visualize(); 
}

function resetVisualizerState() {
    lastAudioBuffer = null;
    frequencyCount = 0;
    if(frequencySum) frequencySum.fill(0); // ゼロクリア
    
    if(specCanvas) {
        const ctx = specCanvas.getContext('2d');
        ctx.clearRect(0, 0, specCanvas.width, specCanvas.height);
    }
    const c=document.getElementById("visualizer");
    if(c) {
        const ctx=c.getContext("2d");
        const w = c.width / (window.devicePixelRatio||1);
        const h = c.height / (window.devicePixelRatio||1);
        ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);
    }
}

function toggleVisMode() {
    if (visMode === 'wave') visMode = 'spectrogram';
    else if (visMode === 'spectrogram') visMode = 'frequency';
    else visMode = 'wave';

    updateVisExplanation();
    if(!isRecording && lastAudioBuffer) renderStaticResult(lastAudioBuffer);
}

function updateVisExplanation() {
    const el = document.getElementById('vis-explanation');
    const label = document.getElementById('vis-label');
    
    if(el) el.innerHTML = explTexts[visMode];
    if(label) {
        if(visMode === 'wave') label.innerText = "WAVE";
        else if(visMode === 'spectrogram') label.innerText = "SPECTROGRAM";
        else label.innerText = "SPECTRUM"; 
    }
}

// ★ Visualize Loop
function visualize(){
    if(!isRecording) return;
    requestAnimationFrame(visualize);
    
    const ctx=canvasCtx, w=ctx.canvas.width/(window.devicePixelRatio||1), h=ctx.canvas.height/(window.devicePixelRatio||1);
    
    // 常に周波数データを取得
    analyser.getByteFrequencyData(dataArray);

    // Spectrum用データの蓄積 (安全策追加)
    if(frequencySum && frequencySum.length === dataArray.length) {
        for(let i=0; i<dataArray.length; i++) frequencySum[i] += dataArray[i];
        frequencyCount++;
    }

    // Spectrogram用オフスクリーン更新
    const specCtx = specCanvas.getContext('2d');
    specCtx.drawImage(specCanvas, -1, 0); 
    for(let i=0; i<dataArray.length; i++){
        const val = dataArray[i];
        const y = specCanvas.height - (i / dataArray.length) * specCanvas.height;
        const hue = 240 - (val / 255) * 240; 
        specCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        specCtx.fillRect(specCanvas.width-1, y, 1, 2);
    }

    // VAD (Auto Stop)
    let sum = 0;
    for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
    const vol = Math.floor((sum/dataArray.length)*2); 
    const debugEl = document.getElementById('mic-debug');
    if(debugEl) debugEl.innerText=`Vol: ${vol}%`;

    const autoStop = document.getElementById('toggle-auto-stop');
    if(autoStop && autoStop.checked){
        if(vol > VAD_THRESHOLD){ hasSpoken=true; silenceStart=Date.now(); }
        else if(hasSpoken && Date.now()-silenceStart > VAD_SILENCE){ 
            if(typeof toggleRecord === 'function') toggleRecord(); 
            hasSpoken=false; 
            return; 
        }
    }

    // 画面描画
    ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);

    if(visMode === 'spectrogram') {
        ctx.drawImage(specCanvas, 0, 0, specCanvas.width, specCanvas.height, 0, 0, w, h);
    } else if (visMode === 'frequency') {
        const barW = (w / dataArray.length) * 2.5; let x=0;
        for(let i=0; i<dataArray.length; i++) {
            const barH = (dataArray[i] / 255) * h;
            ctx.fillStyle = `rgb(${barH+100}, 50, 255)`;
            ctx.fillRect(x, h-barH, barW, barH);
            x += barW + 1;
        }
    } else {
        // Waveform
        analyser.getByteTimeDomainData(dataArray); 
        ctx.lineWidth=2; ctx.strokeStyle='#0ea5e9'; ctx.beginPath();
        const slice=w*1.0/dataArray.length; let x=0;
        for(let i=0;i<dataArray.length;i++){
            const v=dataArray[i]/128.0, y=v*h/2; 
            if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); x+=slice;
        }
        ctx.stroke();
    }
}

function renderStaticResult(buffer) {
    lastAudioBuffer = buffer; 
    const ctx = canvasCtx;
    const w = ctx.canvas.width / (window.devicePixelRatio||1);
    const h = ctx.canvas.height / (window.devicePixelRatio||1);
    
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);

    if(visMode === 'spectrogram') {
        ctx.drawImage(specCanvas, 0, 0, specCanvas.width, specCanvas.height, 0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, h*0.6); ctx.lineTo(w, h*0.6); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("F3 Region (Approx)", 10, h*0.6 - 5);
    } else if (visMode === 'frequency') {
        if(frequencySum && frequencyCount > 0) {
            const barW = (w / frequencySum.length) * 2.5; let x=0;
            for(let i=0; i<frequencySum.length; i++) {
                const avgVal = frequencySum[i] / frequencyCount;
                const barH = (avgVal / 255) * h;
                ctx.fillStyle = `rgb(${barH+50}, 100, 255)`;
                ctx.fillRect(x, h-barH, barW, barH);
                x += barW + 1;
            }
            ctx.fillStyle = "rgba(255,255,255,0.8)"; 
            ctx.fillText("Average Spectrum (Low ➜ High Freq)", 10, 20);
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("No frequency data captured", 10, 20);
        }
    } else {
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / w);
        const amp = h / 2;
        ctx.fillStyle = '#0ea5e9'; 
        ctx.beginPath();
        for (let i = 0; i < w; i++) {
            let min = 1.0; let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }
}

function renderPhonemes() {
    const div=document.getElementById('phoneme-list');
    if(!div) return;
    div.innerHTML="";
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
    
    const svgEl = document.getElementById('diagram-svg');
    const titleEl = document.getElementById('diagram-title');
    const descEl = document.getElementById('diagram-desc');

    if(svgEl) svgEl.innerHTML=`<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">${d.p}</svg>`;
    if(titleEl) titleEl.innerHTML=`${d.t} <span id="viseme-tag" style="font-size:0.7em; color:var(--accent); margin-left:5px;">${type.toUpperCase()}</span>`;
    if(descEl) descEl.innerText=d.d;
}