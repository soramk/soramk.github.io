/**
 * feature_rhythm_mode.js
 * リズム練習モード機能
 * メトロノームに合わせて発音練習
 */

(function() {
    const STORAGE_KEY = 'lr_rhythm_mode_enabled';
    const BPM_KEY = 'lr_rhythm_bpm';

    let metronomeInterval = null;
    let metronomeCtx = null;
    let isMetronomeRunning = false;
    let currentBPM = 60;

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    function getBPM() {
        const saved = localStorage.getItem(BPM_KEY);
        return saved ? parseInt(saved, 10) : 60;
    }

    function setBPM(bpm) {
        currentBPM = bpm;
        localStorage.setItem(BPM_KEY, bpm.toString());
    }

    // メトロノーム音を鳴らす
    function playMetronomeTick() {
        if (!metronomeCtx) {
            metronomeCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (metronomeCtx.state === 'suspended') {
            metronomeCtx.resume();
        }

        const oscillator = metronomeCtx.createOscillator();
        const gainNode = metronomeCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // 高めの音
        
        gainNode.gain.setValueAtTime(0.3, metronomeCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, metronomeCtx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(metronomeCtx.destination);
        
        oscillator.start();
        oscillator.stop(metronomeCtx.currentTime + 0.1);
    }

    // メトロノーム開始/停止
    function toggleMetronome() {
        if (isMetronomeRunning) {
            stopMetronome();
        } else {
            startMetronome();
        }
    }

    function startMetronome() {
        if (isMetronomeRunning) return;
        
        currentBPM = getBPM();
        const intervalMs = (60 / currentBPM) * 1000;
        
        playMetronomeTick(); // 即座に1回鳴らす
        metronomeInterval = setInterval(() => {
            playMetronomeTick();
        }, intervalMs);
        
        isMetronomeRunning = true;
        updateMetronomeButton();
    }

    function stopMetronome() {
        if (metronomeInterval) {
            clearInterval(metronomeInterval);
            metronomeInterval = null;
        }
        isMetronomeRunning = false;
        updateMetronomeButton();
    }

    // メトロノームボタンを追加
    function injectMetronomeButton() {
        if (!isEnabled()) return;

        const controls = document.getElementById('controls-speaking');
        if (!controls || document.getElementById('metronome-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'metronome-btn';
        btn.className = 'action-btn';
        btn.innerText = '🎵 メトロノーム OFF';
        btn.style.background = '#8b5cf6';
        btn.style.color = 'white';
        btn.onclick = toggleMetronome;

        // お手本ボタンの後に追加
        const modelBtn = controls.querySelector('.btn-model');
        if (modelBtn) {
            modelBtn.parentNode.insertBefore(btn, modelBtn.nextSibling);
        } else {
            controls.appendChild(btn);
        }
    }

    function updateMetronomeButton() {
        const btn = document.getElementById('metronome-btn');
        if (!btn) return;
        
        if (isMetronomeRunning) {
            btn.innerText = `🎵 メトロノーム ON (${currentBPM} BPM)`;
            btn.style.background = '#22c55e';
        } else {
            btn.innerText = `🎵 メトロノーム OFF (${currentBPM} BPM)`;
            btn.style.background = '#8b5cf6';
        }
    }

    // 設定画面にトグルとBPM設定を追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-rhythm-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-rhythm-wrapper';
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
        checkbox.id = 'toggle-rhythm';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            if (checkbox.checked) {
                setTimeout(injectMetronomeButton, 500);
            } else {
                stopMetronome();
                const btn = document.getElementById('metronome-btn');
                if (btn) btn.remove();
            }
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🎵 リズム練習モードを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "メトロノームに合わせて発音練習ができます。";
        wrapper.appendChild(desc);

        // BPM設定
        const bpmWrapper = document.createElement('div');
        bpmWrapper.style.marginTop = '10px';
        bpmWrapper.style.marginLeft = '25px';

        const bpmLabel = document.createElement('label');
        bpmLabel.style.display = 'block';
        bpmLabel.style.fontSize = '0.85rem';
        bpmLabel.style.marginBottom = '5px';
        bpmLabel.innerText = 'BPM (拍/分):';

        const bpmInput = document.createElement('input');
        bpmInput.type = 'number';
        bpmInput.min = '40';
        bpmInput.max = '200';
        bpmInput.value = getBPM();
        bpmInput.style.cssText = `
            width: 100px;
            padding: 5px;
            border-radius: 6px;
            border: 1px solid rgba(128,128,128,0.3);
            background: var(--bg);
            color: var(--text);
        `;
        bpmInput.onchange = function() {
            const bpm = Math.max(40, Math.min(200, parseInt(this.value, 10) || 60));
            setBPM(bpm);
            if (isMetronomeRunning) {
                stopMetronome();
                startMetronome();
            }
            updateMetronomeButton();
        };

        bpmLabel.appendChild(bpmInput);
        bpmWrapper.appendChild(bpmLabel);
        wrapper.appendChild(bpmWrapper);

        const gameSection = document.getElementById('setting-blitz-wrapper');
        if (gameSection) {
            gameSection.parentNode.insertBefore(wrapper, gameSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 問題が変わったらメトロノームを停止
    function hookNextQuestion() {
        const originalNext = window.nextQuestion;
        if (originalNext) {
            window.nextQuestion = function() {
                stopMetronome();
                originalNext();
            };
        }
    }

    window.addEventListener('load', () => {
        currentBPM = getBPM();
        hookNextQuestion();
        setTimeout(() => {
            injectSettingsToggle();
            if (isEnabled()) {
                setTimeout(injectMetronomeButton, 1500);
            }
        }, 1000);
    });
})();

