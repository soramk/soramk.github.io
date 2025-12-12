/**
 * 11_formant_game.js (v3: F3単独モード版)
 * 設定で有効にすると、ビジュアライザーを「F3ゲーム専用」に固定します。
 * 他の波形（Wave/Spectrogram）への切り替えは無効化されます。
 */

(function() {
    const STORAGE_KEY = 'lr_f3game_enabled';
    const GAME_MODE_NAME = 'formant_game';
    const FREQ_MIN = 1200;
    const FREQ_MAX = 3500;

    const originalToggleVisMode = window.toggleVisMode;
    const originalVisualize = window.visualize;

    window.addEventListener('load', () => {
        setTimeout(injectSettingsToggle, 800);
    });

    // 1. 設定画面
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
        
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        checkbox.checked = isEnabled;

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            // 設定変更時、即座にモードを反映
            if (checkbox.checked) {
                window.visMode = GAME_MODE_NAME;
                updateGameExplanation();
            } else {
                window.visMode = 'wave';
                if(typeof updateVisExplanation === 'function') updateVisExplanation();
            }
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🎯 F3ゲーム (これのみ表示)"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "有効にすると、ビジュアライザーがF3ゲーム専用になり、他の波形は表示されなくなります。";
        wrapper.appendChild(desc);

        const blitzSetting = document.getElementById('setting-blitz-wrapper');
        if(blitzSetting) {
            blitzSetting.parentNode.insertBefore(wrapper, blitzSetting.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // --- 2. モード切替の無効化 (F3固定) ---
    
    window.toggleVisMode = function() {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';

        if (isEnabled) {
            // 有効なら何回タップしてもF3ゲームのまま (切り替えさせない)
            window.visMode = GAME_MODE_NAME;
            updateGameExplanation();
        } else {
            // 無効なら元のロジック（通常切り替え）
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

    // --- 3. 描画ループ ---

    window.visualize = function() {
        if(!window.isRecording) return;

        // 設定が有効、または現在モードがゲームならゲームを描画
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        
        if (isEnabled || window.visMode === GAME_MODE_NAME) {
            // 強制的にモード名を合わせる
            if(window.visMode !== GAME_MODE_NAME) {
                window.visMode = GAME_MODE_NAME;
                updateGameExplanation();
            }
            drawGameMode();
            requestAnimationFrame(window.visualize);
        } else {
            // それ以外は元の描画関数
            if (originalVisualize) originalVisualize();
        }
    };

    // --- 4. ゲームモード描画 (前回と同じ) ---
    function drawGameMode() {
        const canvas = document.getElementById("visualizer");
        if (!canvas || !window.analyser || !window.dataArray) return;
        
        const ctx = canvas.getContext("2d");
        const d = window.devicePixelRatio || 1;
        const w = canvas.width / d;
        const h = canvas.height / d;

        window.analyser.getByteFrequencyData(window.dataArray);

        ctx.fillStyle='#020617'; 
        ctx.fillRect(0,0,w,h);

        ctx.fillStyle = 'rgba(30, 64, 175, 0.3)';
        ctx.fillRect(0, 0, w, h * 0.4); 
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText("L Zone (Target)", 10, 20);

        ctx.fillStyle = 'rgba(153, 27, 27, 0.3)';
        ctx.fillRect(0, h * 0.6, w, h * 0.4); 
        ctx.fillStyle = '#f87171';
        ctx.fillText("R Zone (Target)", 10, h - 10);

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