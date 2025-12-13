/**
 * feature_audio_effects.js
 * 音声エフェクト機能
 * 自分の声にエコーやリバーブをかけて聞く
 */

(function() {
    const STORAGE_KEY = 'lr_audio_effects_enabled';
    const EFFECT_TYPE_KEY = 'lr_audio_effect_type';

    const EFFECTS = {
        'none': { name: 'なし', icon: '🔊' },
        'echo': { name: 'エコー', icon: '🔁' },
        'reverb': { name: 'リバーブ', icon: '🌊' },
        'chorus': { name: 'コーラス', icon: '🎵' }
    };

    let effectCtx = null;

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    function getEffectType() {
        const saved = localStorage.getItem(EFFECT_TYPE_KEY);
        return saved && EFFECTS[saved] ? saved : 'echo';
    }

    function setEffectType(type) {
        localStorage.setItem(EFFECT_TYPE_KEY, type);
    }

    // エコーエフェクトを作成
    function createEchoEffect(audioContext, source) {
        const delay = audioContext.createDelay(1.0);
        delay.delayTime.value = 0.3;

        const feedback = audioContext.createGain();
        feedback.gain.value = 0.4;

        const wetGain = audioContext.createGain();
        wetGain.gain.value = 0.5;

        const dryGain = audioContext.createGain();
        dryGain.gain.value = 0.7;

        // 接続: source -> dryGain -> destination
        source.connect(dryGain);
        dryGain.connect(audioContext.destination);

        // 接続: source -> delay -> feedback -> delay (ループ)
        source.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);
        wetGain.connect(audioContext.destination);

        return { dryGain, wetGain, delay, feedback };
    }

    // リバーブエフェクトを作成（簡易版）
    function createReverbEffect(audioContext, source) {
        const convolver = audioContext.createConvolver();
        
        // 簡易リバーブ用のインパルスレスポンスを生成
        const length = audioContext.sampleRate * 2;
        const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;

        const wetGain = audioContext.createGain();
        wetGain.gain.value = 0.3;

        const dryGain = audioContext.createGain();
        dryGain.gain.value = 0.7;

        source.connect(dryGain);
        dryGain.connect(audioContext.destination);

        source.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(audioContext.destination);

        return { dryGain, wetGain, convolver };
    }

    // コーラスエフェクトを作成
    function createChorusEffect(audioContext, source) {
        const delay1 = audioContext.createDelay(0.05);
        const delay2 = audioContext.createDelay(0.05);
        
        delay1.delayTime.value = 0.015;
        delay2.delayTime.value = 0.020;

        const lfo1 = audioContext.createOscillator();
        const lfo2 = audioContext.createOscillator();
        lfo1.frequency.value = 1.5;
        lfo2.frequency.value = 1.8;

        const lfoGain1 = audioContext.createGain();
        const lfoGain2 = audioContext.createGain();
        lfoGain1.gain.value = 0.005;
        lfoGain2.gain.value = 0.005;

        lfo1.connect(lfoGain1);
        lfo2.connect(lfoGain2);
        lfoGain1.connect(delay1.delayTime);
        lfoGain2.connect(delay2.delayTime);

        lfo1.start();
        lfo2.start();

        const wetGain = audioContext.createGain();
        wetGain.gain.value = 0.4;

        const dryGain = audioContext.createGain();
        dryGain.gain.value = 0.6;

        source.connect(dryGain);
        dryGain.connect(audioContext.destination);

        source.connect(delay1);
        source.connect(delay2);
        delay1.connect(wetGain);
        delay2.connect(wetGain);
        wetGain.connect(audioContext.destination);

        return { dryGain, wetGain, delay1, delay2, lfo1, lfo2 };
    }

    // エフェクトをかけて再生
    function replayWithEffect() {
        if (!window.userAudioBlob) {
            alert("録音が見つかりません！");
            return;
        }

        if (!effectCtx) {
            effectCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (effectCtx.state === 'suspended') {
            effectCtx.resume();
        }

        const effectType = getEffectType();
        if (effectType === 'none') {
            // エフェクトなしで通常再生
            const audio = new Audio(URL.createObjectURL(window.userAudioBlob));
            audio.play();
            return;
        }

        window.userAudioBlob.arrayBuffer().then(arrayBuffer => {
            return effectCtx.decodeAudioData(arrayBuffer);
        }).then(audioBuffer => {
            const source = effectCtx.createBufferSource();
            source.buffer = audioBuffer;

            let effectNodes = null;
            switch (effectType) {
                case 'echo':
                    effectNodes = createEchoEffect(effectCtx, source);
                    break;
                case 'reverb':
                    effectNodes = createReverbEffect(effectCtx, source);
                    break;
                case 'chorus':
                    effectNodes = createChorusEffect(effectCtx, source);
                    break;
            }

            source.start(0);
        }).catch(e => {
            console.error("Audio Effect Error:", e);
            // フォールバック: 通常再生
            const audio = new Audio(URL.createObjectURL(window.userAudioBlob));
            audio.play();
        });
    }

    // エフェクト再生ボタンを追加
    function injectEffectButton() {
        if (!isEnabled()) return;

        const replayBtn = document.getElementById('replay-user-btn');
        if (!replayBtn || document.getElementById('effect-replay-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'effect-replay-btn';
        btn.innerText = `${EFFECTS[getEffectType()].icon} エフェクト再生`;
        btn.className = 'action-btn';
        btn.style.marginTop = '10px';
        btn.style.marginLeft = '5px';
        btn.style.background = '#a855f7';
        btn.style.color = 'white';
        btn.style.display = replayBtn.style.display;
        btn.onclick = replayWithEffect;

        replayBtn.parentNode.insertBefore(btn, replayBtn.nextSibling);

        // 表示状態を同期
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    btn.style.display = replayBtn.style.display;
                }
            });
        });
        observer.observe(replayBtn, { attributes: true });
    }

    // 設定画面にトグルとエフェクト選択を追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-audio-effects-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-audio-effects-wrapper';
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
        checkbox.id = 'toggle-audio-effects';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            if (checkbox.checked) {
                setTimeout(injectEffectButton, 500);
            } else {
                const btn = document.getElementById('effect-replay-btn');
                if (btn) btn.remove();
            }
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🎵 音声エフェクト機能を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "自分の声にエコーやリバーブなどのエフェクトをかけて聞くことができます。";
        wrapper.appendChild(desc);

        // エフェクト選択
        const effectWrapper = document.createElement('div');
        effectWrapper.style.marginTop = '10px';
        effectWrapper.style.marginLeft = '25px';

        const effectLabel = document.createElement('label');
        effectLabel.style.display = 'block';
        effectLabel.style.fontSize = '0.85rem';
        effectLabel.style.marginBottom = '5px';
        effectLabel.innerText = 'エフェクト種類:';

        const effectSelect = document.createElement('select');
        effectSelect.id = 'effect-type-select';
        effectSelect.style.cssText = `
            width: 100%;
            padding: 5px;
            border-radius: 6px;
            border: 1px solid rgba(128,128,128,0.3);
            background: var(--bg);
            color: var(--text);
        `;

        Object.entries(EFFECTS).forEach(([key, effect]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${effect.icon} ${effect.name}`;
            if (key === getEffectType()) {
                option.selected = true;
            }
            effectSelect.appendChild(option);
        });

        effectSelect.onchange = function() {
            setEffectType(this.value);
            const btn = document.getElementById('effect-replay-btn');
            if (btn) {
                btn.innerText = `${EFFECTS[this.value].icon} エフェクト再生`;
            }
        };

        effectLabel.appendChild(effectSelect);
        effectWrapper.appendChild(effectLabel);
        wrapper.appendChild(effectWrapper);

        const timeAttackSection = document.getElementById('setting-time-attack-wrapper');
        if (timeAttackSection) {
            timeAttackSection.parentNode.insertBefore(wrapper, timeAttackSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            if (isEnabled()) {
                setTimeout(injectEffectButton, 1500);
            }
        }, 1000);
    });
})();

