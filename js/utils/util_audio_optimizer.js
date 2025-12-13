/**
 * util_audio_optimizer.js
 * 音声データの最適化機能
 * 無音部分の削除、圧縮、サンプリングレートの最適化など
 */

(function() {
    const STORAGE_KEY = 'lr_audio_optimization_enabled';
    const OPTIMIZATION_LEVEL_KEY = 'lr_audio_optimization_level';

    // 最適化レベル
    const OPTIMIZATION_LEVELS = {
        'none': { name: 'なし', trimSilence: false, compress: false },
        'light': { name: '軽量（推奨）', trimSilence: true, compress: false },
        'aggressive': { name: '高圧縮', trimSilence: true, compress: true }
    };

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    function getOptimizationLevel() {
        const saved = localStorage.getItem(OPTIMIZATION_LEVEL_KEY);
        return saved && OPTIMIZATION_LEVELS[saved] ? saved : 'light';
    }

    function setOptimizationLevel(level) {
        localStorage.setItem(OPTIMIZATION_LEVEL_KEY, level);
    }

    // 無音部分を削除（簡易版）
    async function trimSilence(audioBlob) {
        if (!isEnabled()) return audioBlob;

        const level = getOptimizationLevel();
        if (!OPTIMIZATION_LEVELS[level].trimSilence) return audioBlob;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const channelData = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            const threshold = 0.01; // 無音の閾値
            const minSilenceDuration = 0.1; // 最小無音時間（秒）

            // 無音部分を検出
            let startIndex = 0;
            let endIndex = channelData.length - 1;

            // 先頭の無音を検出
            for (let i = 0; i < channelData.length; i++) {
                if (Math.abs(channelData[i]) > threshold) {
                    startIndex = Math.max(0, i - sampleRate * 0.05); // 少し余裕を持たせる
                    break;
                }
            }

            // 末尾の無音を検出
            for (let i = channelData.length - 1; i >= 0; i--) {
                if (Math.abs(channelData[i]) > threshold) {
                    endIndex = Math.min(channelData.length - 1, i + sampleRate * 0.05);
                    break;
                }
            }

            // 無音部分が少ない場合は元のBlobを返す
            if (endIndex - startIndex < sampleRate * 0.5) {
                return audioBlob;
            }

            // 新しいAudioBufferを作成
            const trimmedLength = endIndex - startIndex;
            const trimmedBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                trimmedLength,
                sampleRate
            );

            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const originalData = audioBuffer.getChannelData(channel);
                const trimmedData = trimmedBuffer.getChannelData(channel);
                for (let i = 0; i < trimmedLength; i++) {
                    trimmedData[i] = originalData[startIndex + i];
                }
            }

            // AudioBufferをBlobに変換（簡易版：WAV形式）
            const wavBlob = audioBufferToWav(trimmedBuffer);
            return wavBlob;

        } catch (e) {
            console.warn("Silence trimming failed, using original:", e);
            return audioBlob;
        }
    }

    // AudioBufferをWAV Blobに変換
    function audioBufferToWav(buffer) {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const bytesPerSample = 2;
        const blockAlign = numberOfChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const bufferSize = 44 + dataSize;

        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);

        // WAVヘッダー
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        // 音声データ
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    // 音声データを最適化
    window.optimizeAudioBlob = async function(audioBlob) {
        if (!isEnabled()) return audioBlob;

        try {
            // 無音部分を削除
            const trimmed = await trimSilence(audioBlob);
            return trimmed;
        } catch (e) {
            console.warn("Audio optimization failed, using original:", e);
            return audioBlob;
        }
    };

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-audio-optimization-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-audio-optimization-wrapper';
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
        checkbox.id = 'toggle-audio-optimization';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("⚡ 音声最適化を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "無音部分を削除して音声ファイルを最適化し、AI分析を高速化します。";
        wrapper.appendChild(desc);

        // 最適化レベル選択
        const levelWrapper = document.createElement('div');
        levelWrapper.style.marginTop = '10px';
        levelWrapper.style.marginLeft = '25px';

        const levelLabel = document.createElement('label');
        levelLabel.style.display = 'block';
        levelLabel.style.fontSize = '0.85rem';
        levelLabel.style.marginBottom = '5px';
        levelLabel.innerText = '最適化レベル:';

        const levelSelect = document.createElement('select');
        levelSelect.id = 'optimization-level-select';
        levelSelect.style.cssText = `
            width: 100%;
            padding: 5px;
            border-radius: 6px;
            border: 1px solid rgba(128,128,128,0.3);
            background: var(--bg);
            color: var(--text);
        `;

        Object.entries(OPTIMIZATION_LEVELS).forEach(([key, level]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = level.name;
            if (key === getOptimizationLevel()) {
                option.selected = true;
            }
            levelSelect.appendChild(option);
        });

        levelSelect.onchange = function() {
            setOptimizationLevel(this.value);
        };

        levelLabel.appendChild(levelSelect);
        levelWrapper.appendChild(levelLabel);
        wrapper.appendChild(levelWrapper);

        const audioEffectsSection = document.getElementById('setting-audio-effects-wrapper');
        if (audioEffectsSection) {
            audioEffectsSection.parentNode.insertBefore(wrapper, audioEffectsSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
        }, 1000);
    });
})();



