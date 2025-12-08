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

// --- Visualizer & UI Helpers ---
let specCanvas = null; // Offscreen canvas for spectrogram history
let lastAudioBuffer = null; // Store recorded buffer for static display

function initCanvas(){ 
    const c=document.getElementById("visualizer"), b=document.querySelector(".visualizer-box"), d=window.devicePixelRatio||1; 
    c.width=b.clientWidth*d; c.height=b.clientHeight*d; 
    canvasCtx=c.getContext("2d"); canvasCtx.scale(d,d); 
    
    // Init spectrogram history canvas
    if(!specCanvas) {
        specCanvas = document.createElement('canvas');
        specCanvas.width = 1000; specCanvas.height = 256; // Fixed resolution for FFT
    }
    
    // If not recording but we have data, redraw static
    if(!isRecording && lastAudioBuffer) renderStaticResult(lastAudioBuffer);
    else { canvasCtx.fillStyle='#020617'; canvasCtx.fillRect(0,0,b.clientWidth,b.clientHeight); }
}

function toggleVisMode() {
    // Cycle: Wave -> Spectrogram -> Frequency
    if (visMode === 'wave') visMode = 'spectrogram';
    else if (visMode === 'spectrogram') visMode = 'frequency';
    else visMode = 'wave';

    document.getElementById('vis-label').innerText = visMode.toUpperCase();
    
    // If idle, immediately redraw with new mode
    if(!isRecording && lastAudioBuffer) renderStaticResult(lastAudioBuffer);
}

// リアルタイム描画 (Live)
function visualize(){
    if(!isRecording) return;
    requestAnimationFrame(visualize);
    
    const ctx=canvasCtx, w=ctx.canvas.width/(window.devicePixelRatio||1), h=ctx.canvas.height/(window.devicePixelRatio||1);
    
    if(visMode === 'spectrogram') {
        // Scrolling Spectrogram
        analyser.getByteFrequencyData(dataArray);
        const specCtx = specCanvas.getContext('2d');
        
        // Shift existing image left
        specCtx.drawImage(specCanvas, -1, 0);
        
        // Draw new column at right
        for(let i=0; i<dataArray.length; i++){
            const val = dataArray[i];
            const y = specCanvas.height - (i / dataArray.length) * specCanvas.height;
            // Heatmap color: Blue(low) -> Red(mid) -> Yellow(high)
            const hue = 240 - (val / 255) * 240; 
            specCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            specCtx.fillRect(specCanvas.width-1, y, 1, 2);
        }
        
        // Render to main canvas (stretch to fit)
        ctx.drawImage(specCanvas, 0, 0, specCanvas.width, specCanvas.height, 0, 0, w, h);

    } else if (visMode === 'wave') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);
        ctx.lineWidth=2; ctx.strokeStyle='#0ea5e9'; ctx.beginPath();
        const slice=w*1.0/dataArray.length; let x=0;
        for(let i=0;i<dataArray.length;i++){
            const v=dataArray[i]/128.0, y=v*h/2; 
            if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); x+=slice;
        }
        ctx.stroke();
    } else {
        // Frequency Bars
        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);
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
        // VAD Logic
        if(document.getElementById('toggle-auto-stop').checked){
            if(vol>VAD_THRESHOLD){ hasSpoken=true; silenceStart=Date.now(); }
            else if(hasSpoken && Date.now()-silenceStart>VAD_SILENCE){ toggleRecord(); hasSpoken=false; }
        }
    }
}

// 録音完了後の静的描画 (Result)
function renderStaticResult(buffer) {
    lastAudioBuffer = buffer; // Save for toggling
    const ctx = canvasCtx;
    const w = ctx.canvas.width / (window.devicePixelRatio||1);
    const h = ctx.canvas.height / (window.devicePixelRatio||1);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);

    const data = buffer.getChannelData(0);

    if(visMode === 'spectrogram') {
        // Draw Static Spectrogram (Simplified FFT over time)
        // Note: generating a full high-res spectrogram locally is heavy, 
        // so we reuse the 'specCanvas' if it was capturing, 
        // OR simply just show the captured image.
        // For simplicity, we just keep showing the specCanvas content captured during recording.
        ctx.drawImage(specCanvas, 0, 0, specCanvas.width, specCanvas.height, 0, 0, w, h);
        
        ctx.font = "12px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("Recorded Spectrogram", 10, 20);

    } else if (visMode === 'wave') {
        // Draw Full Waveform
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
        ctx.font = "12px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("Recorded Waveform", 10, 20);
    } else {
        // Frequency average (Spectrum)
        ctx.font = "12px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("Avg Frequency Spectrum (N/A for static)", 10, 20);
    }
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
