/**
 * feature_formant_game.js (v5: 表示完全独占版)
 * 設定で有効にすると、ビジュアライザー表示・ラベル・説明文を
 * 「F3ゲーム専用」に完全に固定し、他のモードの干渉を遮断します。
 */

(function() {
    const STORAGE_KEY = 'lr_f3game_enabled';
    const GAME_MODE_NAME = 'formant_game';
    const FREQ_MIN = 1200;
    const FREQ_MAX = 3500;

    // 元の関数を退避
    const originalToggleVisMode = window.toggleVisMode;
    const originalVisualize = window.visualize;
    const originalUpdateVisExplanation = window.updateVisExplanation;
    const originalRenderStaticResult = window.renderStaticResult;

    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            // ロード直後に一度状態を適用
            if (localStorage.getItem(STORAGE_KEY) === 'true') {
                applyF3ModeForcefully();
            }
        }, 800);
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
            if (checkbox.checked) {
                applyF3ModeForcefully();
            } else {
                // オフにしたらWaveに戻してあげる
                window.visMode = 'wave';
                if (originalUpdateVisExplanation) originalUpdateVisExplanation();
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

    // --- ヘルパー: F3モードを強制適用 ---
    function applyF3ModeForcefully() {
        window.visMode = GAME_MODE_NAME;
        // 即座にラベルなどを更新
        if (window.updateVisExplanation) window.updateVisExplanation();
    }

    // --- 2. 重要な上書き: 説明文とラベルの更新を乗っ取る ---
    window.updateVisExplanation = function() {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';

        // F3有効、または現在モードがF3なら、強制的にF3の表示にする
        if (isEnabled || window.visMode === GAME_MODE_NAME) {
            const el = document.getElementById('vis-explanation');
            const label = document.getElementById('vis-label');
            
            if(el) el.innerHTML = "【🎯 F3ハンター】<br>声を出しながら黄色いボールを操作しよう！<br><b>R (Right):</b> 舌を奥に引いてボールを「下」へ。<br><b>L (Light):</b> 舌を前歯の裏に当ててボールを「上」へ。";
            if(label) label.innerText = "F3 GAME"; // ★ここでSPECTRUM等を上書き
        } else {
            // それ以外なら元の関数にお任せ
            if (originalUpdateVisExplanation) originalUpdateVisExplanation();
        }
    };

    // --- 3. モード切替の無効化 ---
    window.toggleVisMode = function() {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        if (isEnabled) {
            applyF3ModeForcefully(); // 何回タップしてもF3のまま
        } else {
            if (originalToggleVisMode) originalToggleVisMode();
        }
    };

    // --- 4. 録音停止後の静止画表示も乗っ取る ---
    window.renderStaticResult = function(buffer) {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        if (isEnabled || window.visMode === GAME_MODE_NAME) {
            // F3ゲームの場合、静止画（波形）は描画せず、待機画面のようなものを出すか
            // あるいは「Game Paused」と出す
            const canvas = document.getElementById("visualizer");
            if (canvas) {
                const ctx = canvas.getContext("2d");
                const d = window.devicePixelRatio || 1;
                ctx.fillStyle='#020617'; 
                ctx.fillRect(0,0, canvas.width/d, canvas.height/d);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.font = '14px sans-serif';
                ctx.fillText("ゲーム一時停止（開始をタップ）", 20, 30);
            }
        } else {
            if (originalRenderStaticResult) originalRenderStaticResult(buffer);
        }
    };

    // --- 5. 描画ループ ---
    window.visualize = function() {
        if(!window.isRecording) return;
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        
        if (isEnabled || window.visMode === GAME_MODE_NAME) {
            // 念のためモード強制
            if(window.visMode !== GAME_MODE_NAME) window.visMode = GAME_MODE_NAME;
            
            drawGameMode();
            requestAnimationFrame(window.visualize);
        } else {
            if (originalVisualize) originalVisualize();
        }
    };

    // --- 6. ゲームモード描画 (変更なし) ---
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

        // ゾーン
        ctx.fillStyle = 'rgba(30, 64, 175, 0.3)'; ctx.fillRect(0, 0, w, h * 0.4); 
        ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 14px sans-serif'; ctx.fillText("L Zone (Target)", 10, 20);

        ctx.fillStyle = 'rgba(153, 27, 27, 0.3)'; ctx.fillRect(0, h * 0.6, w, h * 0.4); 
        ctx.fillStyle = '#f87171'; ctx.fillText("R Zone (Target)", 10, h - 10);

        // F3検出
        const sampleRate = window.audioCtx.sampleRate;
        const fftSize = window.analyser.fftSize; 
        const hzPerBin = sampleRate / fftSize; 
        const startBin = Math.floor(FREQ_MIN / hzPerBin);
        const endBin = Math.floor(FREQ_MAX / hzPerBin);

        let maxVal = 0; let maxIndex = 0;
        for (let i = startBin; i <= endBin; i++) {
            if (window.dataArray[i] > maxVal) { maxVal = window.dataArray[i]; maxIndex = i; }
        }

        const currentHz = maxIndex * hzPerBin;
        let normalizedPos = (currentHz - FREQ_MIN) / (FREQ_MAX - FREQ_MIN);
        if(normalizedPos < 0) normalizedPos = 0; if(normalizedPos > 1) normalizedPos = 1;
        const targetY = h - (normalizedPos * h);

        if (maxVal > 50) { 
            ctx.beginPath(); ctx.arc(w / 2, targetY, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.fillText(`${Math.round(currentHz)}Hz`, w/2 + 20, targetY + 4);
            
            ctx.font = 'bold 24px sans-serif';
            if (normalizedPos > 0.6) { ctx.fillStyle = '#60a5fa'; ctx.fillText("Hit! L", w - 80, h/2); }
            else if (normalizedPos < 0.4) { ctx.fillStyle = '#f87171'; ctx.fillText("Hit! R", w - 80, h/2); }
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '14px sans-serif';
            ctx.textAlign = 'center'; ctx.fillText("Speak Louder...", w/2, h/2); ctx.textAlign = 'left'; 
        }
    }
})();