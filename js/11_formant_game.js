/**
 * 11_formant_game.js (v2: 設定連動 & 日本語化)
 * L/Rの違い（F3フォルマント）を可視化する「F3 Game」モードを追加するプラグイン。
 * 設定画面でオン/オフが可能。
 * 既存の visualize 関数を安全に拡張（元の表示を壊さない設計）。
 */

(function() {
    const STORAGE_KEY = 'lr_f3game_enabled';
    const GAME_MODE_NAME = 'formant_game';
    
    // F3の検出範囲 (Hz)
    const FREQ_MIN = 1200;
    const FREQ_MAX = 3500;

    // 元の関数を退避
    const originalToggleVisMode = window.toggleVisMode;
    const originalVisualize = window.visualize;

    // --- 初期化 ---
    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
        }, 800);
    });

    // 1. 設定画面にスイッチを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-f3game-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-f3game-wrapper';
        wrapper.style.marginBottom = '15px';
        wrapper.style.padding = '10px';
        wrapper.style.background = 'rgba(128,128,128,0.05)';
        wrapper.style.borderRadius = '8px';

        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.cursor = 'pointer';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.9rem';
        label.style.color = 'var(--text)';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'toggle-f3game-feature';
        checkbox.style.marginRight = '10px';
        
        // デフォルトはオフにしておく（または好みでオン）
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        checkbox.checked = isEnabled;

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            // もし現在ゲームモード中にオフにされたら、Waveに戻すなどの処理が必要だが、
            // 次回の切り替えから反映されれば十分なので今回はスキップ
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🎯 F3ゲーム (可視化トレーニング) を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "ビジュアライザーに、舌の位置(フォルマント)を可視化してゲーム感覚で調整するモードを追加します。";
        wrapper.appendChild(desc);

        // 挿入場所: Blitz設定の前あたり
        const blitzSetting = document.getElementById('setting-blitz-wrapper');
        if(blitzSetting) {
            blitzSetting.parentNode.insertBefore(wrapper, blitzSetting.nextSibling); // Blitzの後ろ
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // --- 2. モード切替ロジックの拡張 ---
    
    window.toggleVisMode = function() {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';

        // サイクル: wave -> spectrogram -> frequency -> [GAME if enabled] -> wave
        if (window.visMode === 'frequency') {
            if (isEnabled) {
                // 有効ならゲームモードへ
                window.visMode = GAME_MODE_NAME;
                updateGameExplanation();
            } else {
                // 無効なら元のロジック（通常はWaveに戻る）へ
                // ※ originalToggleVisModeの実装は freq -> wave なので、それを呼ぶだけでOK
                if (originalToggleVisMode) originalToggleVisMode();
            }
        } else if (window.visMode === GAME_MODE_NAME) {
            // ゲームモードからは必ずWaveに戻る
            window.visMode = 'wave';
            if (typeof updateVisExplanation === 'function') updateVisExplanation();
        } else {
            // それ以外（wave -> spectrogram など）は元のロジックにお任せ
            if (originalToggleVisMode) originalToggleVisMode();
        }
    };

    function updateGameExplanation() {
        const el = document.getElementById('vis-explanation');
        const label = document.getElementById('vis-label');
        
        if (window.visMode === GAME_MODE_NAME) {
            if(el) el.innerHTML = "【🎯 F3ハンター】<br>声を出しながら黄色いボールを操作しよう！<br><b>R (Right):</b> 舌を奥に引いてボールを「下」へ。<br><b>L (Light):</b> 舌を前歯の裏に当ててボールを「上」へ。";
            if(label) label.innerText = "F3 GAME";
        }
    }


    // --- 3. 描画ループの拡張 ---

    window.visualize = function() {
        if(!window.isRecording) return;

        if (window.visMode === GAME_MODE_NAME) {
            // ゲームモードなら独自描画
            drawGameMode();
            requestAnimationFrame(window.visualize);
        } else {
            // それ以外は元の描画関数に任せる（これで既存表示は壊れない）
            if (originalVisualize) originalVisualize();
        }
    };


    // --- 4. ゲームモードの描画ロジック ---

    function drawGameMode() {
        const canvas = document.getElementById("visualizer");
        if (!canvas || !window.analyser || !window.dataArray) return;
        
        const ctx = canvas.getContext("2d");
        const d = window.devicePixelRatio || 1;
        const w = canvas.width / d;
        const h = canvas.height / d;

        window.analyser.getByteFrequencyData(window.dataArray);

        // 背景
        ctx.fillStyle='#020617'; 
        ctx.fillRect(0,0,w,h);

        // L Zone (Top, Blue)
        ctx.fillStyle = 'rgba(30, 64, 175, 0.3)';
        ctx.fillRect(0, 0, w, h * 0.4); 
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText("L Zone (Target)", 10, 20);

        // R Zone (Bottom, Red)
        ctx.fillStyle = 'rgba(153, 27, 27, 0.3)';
        ctx.fillRect(0, h * 0.6, w, h * 0.4); 
        ctx.fillStyle = '#f87171';
        ctx.fillText("R Zone (Target)", 10, h - 10);

        // ピーク検出
        const sampleRate = window.audioCtx.sampleRate;
        const fftSize = window.analyser.fftSize; 
        const hzPerBin = sampleRate / fftSize; 

        const startBin = Math.floor(FREQ_MIN / hzPerBin);
        const endBin = Math.floor(FREQ_MAX / hzPerBin);

        let maxVal = 0;
        let maxIndex = 0;
        
        for (let i = startBin; i <= endBin; i++) {
            if (window.dataArray[i] > maxVal) {
                maxVal = window.dataArray[i];
                maxIndex = i;
            }
        }

        const currentHz = maxIndex * hzPerBin;
        let normalizedPos = (currentHz - FREQ_MIN) / (FREQ_MAX - FREQ_MIN);
        if(normalizedPos < 0) normalizedPos = 0;
        if(normalizedPos > 1) normalizedPos = 1;

        const targetY = h - (normalizedPos * h);

        if (maxVal > 50) { 
            // ボール
            ctx.beginPath();
            ctx.arc(w / 2, targetY, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15'; 
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(`${Math.round(currentHz)}Hz`, w/2 + 20, targetY + 4);

            ctx.font = 'bold 24px sans-serif';
            if (normalizedPos > 0.6) { 
                ctx.fillStyle = '#60a5fa';
                ctx.fillText("Hit! L", w - 80, h/2);
            } else if (normalizedPos < 0.4) {
                ctx.fillStyle = '#f87171';
                ctx.fillText("Hit! R", w - 80, h/2);
            }
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Speak Louder...", w/2, h/2);
            ctx.textAlign = 'left'; 
        }
    }

})();