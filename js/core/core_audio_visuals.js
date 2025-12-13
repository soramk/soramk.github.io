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
// 詳細な顔の輪郭と口の構造を描画するベース
const baseFace = `
    <!-- 顔の輪郭 -->
    <path fill="none" stroke="#cbd5e1" stroke-width="2" d="M10,50 Q10,10 45,10 Q80,10 80,50 Q80,90 45,90 Q10,90 10,50" />
    <!-- 鼻 -->
    <path fill="none" stroke="#cbd5e1" stroke-width="1.5" d="M45,25 Q45,35 45,40" opacity="0.5"/>
    <!-- あごのライン -->
    <path fill="none" stroke="#cbd5e1" stroke-width="1.5" d="M20,85 Q45,90 70,85" opacity="0.5"/>
`;

// 共通パーツ: 上あご（口蓋）
const upperPalate = `<path d="M25,50 Q45,48 65,50" stroke="#e5e7eb" stroke-width="2" fill="none" opacity="0.6"/>`;
// 共通パーツ: 下あご
const lowerJaw = `<path d="M25,70 Q45,72 65,70" stroke="#e5e7eb" stroke-width="2" fill="none" opacity="0.6"/>`;
// 共通パーツ: 上の歯
const upperTeeth = `<rect x="32" y="50" width="26" height="6" fill="#fff" stroke="#d1d5db" stroke-width="1" rx="1"/><path d="M38,50 L38,56 M44,50 L44,56 M50,50 L50,56 M56,50 L56,56" stroke="#d1d5db" stroke-width="0.5"/>`;
// 共通パーツ: 下の歯
const lowerTeeth = `<rect x="32" y="64" width="26" height="6" fill="#fff" stroke="#d1d5db" stroke-width="1" rx="1"/><path d="M38,64 L38,70 M44,64 L44,70 M50,64 L50,70 M56,64 L56,70" stroke="#d1d5db" stroke-width="0.5"/>`;

const visemes = {
    bilabial: { 
        t: "両唇音 (Bilabial)", 
        d: "上下の唇をしっかりと閉じて、破裂させるように音を出します (p, b, m)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            <!-- 閉じた唇（上下） -->
            <path d="M30,58 Q45,60 60,58" stroke="#dc2626" stroke-width="4" fill="none" stroke-linecap="round"/>
            <path d="M30,62 Q45,60 60,62" stroke="#dc2626" stroke-width="4" fill="none" stroke-linecap="round"/>
            <!-- 唇のハイライト -->
            <path d="M35,59 Q45,60 55,59" stroke="#ff6b6b" stroke-width="1.5" fill="none" opacity="0.6"/>
        ` 
    },
    labiodental: { 
        t: "唇歯音 (Labiodental)", 
        d: "上の前歯で下唇を軽く噛むように触れ、隙間から息を出します (f, v)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            <!-- 下唇（上の歯に触れている） -->
            <path d="M30,62 Q45,64 60,62" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M32,63 Q45,65 58,63" fill="#ff6b6b" opacity="0.3"/>
            <!-- 接触点の強調 -->
            <circle cx="38" cy="56" r="1.5" fill="#ef4444"/>
            <circle cx="52" cy="56" r="1.5" fill="#ef4444"/>
        ` 
    },
    dental: { 
        t: "歯音 (Dental)", 
        d: "舌先を上下の歯で軽く挟み、その隙間から息を流します (th)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 舌先が上下の歯の間に -->
            <path d="M38,56 Q45,60 52,56" stroke="#ef4444" stroke-width="3" fill="#ff6b6b" opacity="0.6" stroke-linecap="round"/>
            <path d="M40,58 Q45,60 50,58" fill="#ef4444" opacity="0.4"/>
            <!-- 舌の先端 -->
            <ellipse cx="45" cy="60" rx="6" ry="2" fill="#ef4444" opacity="0.7"/>
        ` 
    },
    alveolar: { 
        t: "歯茎音 (Alveolar)", 
        d: "舌先を上の前歯の裏（歯茎）に付け、弾くように音を出します (t, d, n)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 歯茎の位置を示すライン -->
            <path d="M30,52 Q45,51 60,52" stroke="#fbbf24" stroke-width="2" fill="none" stroke-dasharray="2,2"/>
            <!-- 舌先が歯茎に接触 -->
            <path d="M38,52 Q45,55 52,52" stroke="#ef4444" stroke-width="4" fill="#ff6b6b" opacity="0.7" stroke-linecap="round"/>
            <ellipse cx="45" cy="54" rx="7" ry="3" fill="#ef4444" opacity="0.6"/>
            <!-- 接触点の強調 -->
            <circle cx="45" cy="52" r="2" fill="#dc2626" opacity="0.8"/>
        ` 
    },
    postalveolar: { 
        t: "後部歯茎音 (Post-Alveolar)", 
        d: "唇を少し丸めて突き出し、舌を歯茎より少し後ろに引きます (sh, ch)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 丸めた唇 -->
            <path d="M28,58 Q45,55 62,58" stroke="#dc2626" stroke-width="3.5" fill="none" stroke-linecap="round"/>
            <path d="M28,62 Q45,59 62,62" stroke="#dc2626" stroke-width="3.5" fill="none" stroke-linecap="round"/>
            <!-- 舌が後ろに引かれている -->
            <path d="M35,58 Q45,62 55,58" stroke="#ef4444" stroke-width="3" fill="#ff6b6b" opacity="0.6"/>
            <ellipse cx="45" cy="60" rx="10" ry="4" fill="#ef4444" opacity="0.5"/>
            <!-- 舌の後ろの位置 -->
            <path d="M40,60 Q45,65 50,60" fill="#ef4444" opacity="0.4"/>
        ` 
    },
    velar: { 
        t: "軟口蓋音 (Velar)", 
        d: "舌の後ろを持ち上げて喉の奥（軟口蓋）につけ、息を止めたり流したりします (k, g)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 軟口蓋の位置 -->
            <path d="M20,48 Q45,45 70,48" stroke="#fbbf24" stroke-width="2" fill="none" stroke-dasharray="2,2" opacity="0.7"/>
            <!-- 舌の後ろが持ち上がっている -->
            <path d="M30,55 Q45,50 60,55" stroke="#ef4444" stroke-width="4" fill="#ff6b6b" opacity="0.7" stroke-linecap="round"/>
            <path d="M32,57 Q45,52 58,57" fill="#ef4444" opacity="0.5"/>
            <!-- 舌の後ろ部分が軟口蓋に接触 -->
            <ellipse cx="45" cy="50" rx="12" ry="5" fill="#dc2626" opacity="0.6"/>
            <circle cx="45" cy="50" r="3" fill="#dc2626" opacity="0.8"/>
        ` 
    },
    l_shape: { 
        t: "Lの発音 (L-Shape)", 
        d: "★重要: 舌先を上の前歯の裏に強く押し付けます。舌の両側から声を出すイメージです。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 舌先が上の前歯の裏に強く接触 -->
            <path d="M38,52 Q45,55 52,52" stroke="#ef4444" stroke-width="5" fill="#ff6b6b" opacity="0.8" stroke-linecap="round"/>
            <!-- 舌のL字型の形状 -->
            <path d="M40,52 L40,65 Q45,68 50,65 L50,52" fill="#ef4444" opacity="0.6" stroke="#dc2626" stroke-width="2"/>
            <!-- 舌の両側が開いている様子 -->
            <path d="M38,58 Q40,60 38,62" stroke="#22c55e" stroke-width="2" fill="none" opacity="0.7"/>
            <path d="M52,58 Q50,60 52,62" stroke="#22c55e" stroke-width="2" fill="none" opacity="0.7"/>
            <!-- 接触点の強調 -->
            <circle cx="45" cy="52" r="3" fill="#dc2626" opacity="0.9"/>
        ` 
    },
    r_shape: { 
        t: "Rの発音 (R-Shape)", 
        d: "★重要: 舌先をどこにも触れないように後ろへ引きます。唇を少し丸めると出しやすくなります。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 丸めた唇 -->
            <path d="M30,58 Q45,56 60,58" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M30,62 Q45,60 60,62" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
            <!-- 舌が後ろに引かれ、中央が持ち上がっている -->
            <path d="M35,60 Q45,55 55,60" stroke="#ef4444" stroke-width="4" fill="#ff6b6b" opacity="0.7"/>
            <!-- 舌の中央部分が丸まっている -->
            <ellipse cx="45" cy="57" rx="8" ry="5" fill="#ef4444" opacity="0.6"/>
            <!-- 舌先が浮いている様子 -->
            <path d="M40,62 Q45,58 50,62" fill="#ef4444" opacity="0.4"/>
            <!-- 舌がどこにも触れていないことを示す -->
            <circle cx="45" cy="57" r="2" fill="#22c55e" opacity="0.8"/>
        ` 
    },
    pucker: { 
        t: "すぼめ (Pucker)", 
        d: "口を小さくすぼめて、前に突き出します (w)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            <!-- すぼめた唇（前に突き出している） -->
            <ellipse cx="45" cy="60" rx="6" ry="8" fill="#dc2626" opacity="0.8" stroke="#b91c1c" stroke-width="2"/>
            <ellipse cx="45" cy="60" rx="4" ry="6" fill="#ff6b6b" opacity="0.5"/>
            <!-- 唇のハイライト -->
            <ellipse cx="43" cy="58" rx="2" ry="3" fill="#fff" opacity="0.4"/>
        ` 
    },
    wide: { 
        t: "大きく開く (Wide)", 
        d: "あごを下げて、口を大きく開けます (a)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 大きく開いた口 -->
            <ellipse cx="45" cy="70" rx="18" ry="12" fill="#1f2937" opacity="0.3"/>
            <path d="M27,65 Q45,82 63,65" stroke="#1f2937" stroke-width="2" fill="none"/>
            <!-- 下あごが下がっている -->
            <path d="M25,75 Q45,80 65,75" stroke="#cbd5e1" stroke-width="2" fill="none"/>
            <!-- 舌が平らに下がっている -->
            <path d="M30,70 Q45,75 60,70" stroke="#ef4444" stroke-width="3" fill="#ff6b6b" opacity="0.5"/>
            <ellipse cx="45" cy="73" rx="15" ry="4" fill="#ef4444" opacity="0.4"/>
        ` 
    },
    mid: { 
        t: "中間の開き (Mid)", 
        d: "口の力を抜いて、自然に少し開けた状態です (e, uh)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 自然に開いた口 -->
            <ellipse cx="45" cy="65" rx="12" ry="8" fill="#1f2937" opacity="0.2"/>
            <path d="M33,62 Q45,70 57,62" stroke="#1f2937" stroke-width="1.5" fill="none"/>
            <!-- 舌が自然な位置 -->
            <path d="M35,65 Q45,68 55,65" stroke="#ef4444" stroke-width="2.5" fill="#ff6b6b" opacity="0.5"/>
            <ellipse cx="45" cy="67" rx="10" ry="3" fill="#ef4444" opacity="0.3"/>
        ` 
    },
    spread: { 
        t: "横に引く (Spread)", 
        d: "口角を左右に強く引いて、ニコッと笑うような形にします (iy)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 横に引かれた口 -->
            <path d="M25,60 Q45,62 65,60" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M25,62 Q45,64 65,62" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
            <!-- 口角が上がっている -->
            <path d="M25,60 Q30,58 35,60" stroke="#ff6b6b" stroke-width="2" fill="none"/>
            <path d="M55,60 Q60,58 65,60" stroke="#ff6b6b" stroke-width="2" fill="none"/>
            <!-- 舌が少し上がっている -->
            <path d="M35,62 Q45,65 55,62" stroke="#ef4444" stroke-width="2.5" fill="#ff6b6b" opacity="0.5"/>
            <ellipse cx="45" cy="64" rx="10" ry="3" fill="#ef4444" opacity="0.4"/>
        ` 
    },
    round: { 
        t: "丸める (Round)", 
        d: "口を縦長の楕円形に開けます (o)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 縦長の楕円形の口 -->
            <ellipse cx="45" cy="62" rx="8" ry="12" fill="#1f2937" opacity="0.3"/>
            <ellipse cx="45" cy="62" rx="7" ry="11" stroke="#dc2626" stroke-width="2.5" fill="none"/>
            <!-- 丸めた唇 -->
            <path d="M37,58 Q45,55 53,58" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M37,66 Q45,69 53,66" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>
            <!-- 舌が少し丸まっている -->
            <ellipse cx="45" cy="64" rx="6" ry="4" fill="#ef4444" opacity="0.5"/>
        ` 
    },
    u_shape: { 
        t: "強く丸める (U-Shape)", 
        d: "唇を強く丸めて、小さく突き出します (u)。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            <!-- 強く丸めて突き出した唇 -->
            <circle cx="45" cy="60" r="7" fill="#dc2626" opacity="0.9" stroke="#b91c1c" stroke-width="2.5"/>
            <circle cx="45" cy="60" r="5" fill="#ff6b6b" opacity="0.6"/>
            <!-- 唇のハイライト -->
            <ellipse cx="43" cy="58" rx="2" ry="3" fill="#fff" opacity="0.5"/>
            <!-- 舌が後ろに引かれている -->
            <path d="M38,62 Q45,58 52,62" stroke="#ef4444" stroke-width="2.5" fill="#ff6b6b" opacity="0.4"/>
        ` 
    },
    silence: { 
        t: "待機中 (Ready)", 
        d: "上のボタンから音素を選んでください。", 
        p: `${baseFace}
            ${upperPalate}
            ${lowerJaw}
            ${upperTeeth}
            ${lowerTeeth}
            <!-- 閉じた口（自然な状態） -->
            <path d="M35,60 L55,60" stroke="#dc2626" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <!-- 舌が自然な位置 -->
            <path d="M38,62 Q45,63 52,62" stroke="#ef4444" stroke-width="2" fill="#ff6b6b" opacity="0.3"/>
        ` 
    }
};

// --- Visualizer State ---
let specCanvas = null; 
let lastAudioBuffer = null; 
let frequencySum = null; 
let frequencyCount = 0;
let animationFrameId = null; // アニメーションフレームIDを追跡（グローバルに公開）
window.visualizerAnimationFrameId = null; // 外部からアクセス可能にする

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
        canvasCtx.fillText("開始をタップして録音", 20, 30);
    }
}

function startAudioVisualization(stream) {
    // AudioContextの状態確認と再生成（バックグラウンドから戻った場合の対策）
    if (typeof window.ensureAudioContext === 'function') {
        window.ensureAudioContext();
        // ensureAudioContextがaudioCtxを更新した可能性があるので、グローバル変数を参照
        if (window.audioCtx) {
            audioCtx = window.audioCtx;
        }
    } else {
        // フォールバック: ensureAudioContextがまだ読み込まれていない場合
        if(!audioCtx || audioCtx.state === 'closed') {
            try {
                if (audioCtx && audioCtx.state === 'closed') {
                    audioCtx = null;
                    window.audioCtx = null;
                }
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                window.audioCtx = audioCtx; // グローバルにも保存
                console.log("AudioVisualization: AudioContext created, state:", audioCtx.state);
            } catch(e) {
                console.error("AudioVisualization: Failed to create AudioContext:", e);
                return;
            }
        }
        if(audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log("AudioVisualization: AudioContext resumed");
            }).catch(e => {
                console.error("AudioVisualization: Failed to resume AudioContext:", e);
            });
        }
    }
    
    // audioCtxがまだ存在しない場合はエラー
    if (!audioCtx) {
        console.error("AudioVisualization: AudioContext is not available");
        return;
    }
    
    if(analyser) analyser.disconnect();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // スペクトル合計用配列の初期化
    frequencySum = new Float32Array(analyser.frequencyBinCount);
    frequencyCount = 0;

    // 古いソースがあれば切断
    if(audioSourceNode) audioSourceNode.disconnect();
    
    // 新しいストリームを接続
    audioSourceNode = audioCtx.createMediaStreamSource(stream);
    audioSourceNode.connect(analyser);
    
    resetVisualizerState();
    initCanvas();
    
    // アニメーションフレームIDをリセット
    animationFrameId = null;
    window.visualizerAnimationFrameId = null;
    
    visualize(); 
}

function resetVisualizerState() {
    // アニメーションフレームを停止
    if(animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if(window.visualizerAnimationFrameId !== null) {
        cancelAnimationFrame(window.visualizerAnimationFrameId);
        window.visualizerAnimationFrameId = null;
    }
    
    lastAudioBuffer = null;
    frequencyCount = 0;
    if(frequencySum) frequencySum.fill(0); 
    
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
        if(visMode === 'wave') label.innerText = "波形";
        else if(visMode === 'spectrogram') label.innerText = "声紋";
        else label.innerText = "スペクトル"; 
    }
}

// Visualize Loop
function visualize(){
    if(!isRecording) {
        // 録音が停止したらアニメーションフレームもキャンセル
        if(animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            window.visualizerAnimationFrameId = null;
        }
        return;
    }
    animationFrameId = requestAnimationFrame(visualize);
    window.visualizerAnimationFrameId = animationFrameId; // グローバルにも保存
    
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
    
    // ★重要: Web Speech API ('web') の場合は、アプリ側のAuto Stopを無効化
    if(autoStop && autoStop.checked && currentProvider !== 'web'){
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
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("F3領域（概算）", 10, h*0.6 - 5);
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
            ctx.fillText("平均スペクトル（低周波 ➜ 高周波）", 10, 20);
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("周波数データが取得されていません", 10, 20);
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

// --- Phoneme & Mouth Logic (修正・追加) ---

function renderPhonemes() {
    const div=document.getElementById('phoneme-list');
    if(!div) return;
    div.innerHTML="";
    
    // ★修正: window.targetObj を明示的に参照
    const currentTarget = window.targetObj;
    if(!currentTarget || !currentTarget.b) return;

    currentTarget.b.forEach((ph,i)=>{
        const b=document.createElement('div'); b.className='phoneme-btn'; b.innerText=`/${ph.p}/`;
        b.onclick=()=>showDiagram(ph.t,b); div.appendChild(b);
        if(i===0) setTimeout(()=>b.click(),10);
    });
}

// ★追加: core_app_flow.js の nextQuestion から呼ばれる
function updatePhonemesAndMouth(pair, isTargetL) {
    // データ整合性のために再描画
    renderPhonemes();
    
    // 口の形のリセット、または最初の音素の表示
    const titleEl = document.getElementById('diagram-title');
    const descEl = document.getElementById('diagram-desc');
    const svgEl = document.getElementById('diagram-svg');
    
    // 一旦リセット
    if(titleEl) titleEl.innerHTML = "準備完了";
    if(descEl) descEl.innerText = "上の音素を選択してください";
    if(svgEl) svgEl.innerHTML = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">${visemes.silence.p}</svg>`;
    
    // ターゲット単語に発音データがない場合の処理
    const target = isTargetL ? pair.l : pair.r;
    if (!target.b || target.b.length === 0) {
        if(descEl) descEl.innerText = "この単語にはアニメーションデータがありません。";
    }
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