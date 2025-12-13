/**
 * feature_api_usage.js
 * API使用量（トークン数・リクエスト数）を表示する機能
 * モデルごとの無料枠内で利用できているかを視覚的に表示
 */

(function() {
    const STORAGE_KEY = 'lr_api_usage_enabled';
    const USAGE_DATA_KEY = 'lr_api_usage_data';
    
    // モデルごとの無料枠情報（1分間あたり）
    const MODEL_LIMITS = {
        // Gemini
        'gemini-1.5-flash': { rpm: 15, tpm: 1000000, name: 'Gemini 1.5 Flash' },
        'gemini-1.5-flash-8b': { rpm: 15, tpm: 1000000, name: 'Gemini 1.5 Flash 8B' },
        'gemini-1.5-pro': { rpm: 2, tpm: 32000, name: 'Gemini 1.5 Pro' },
        'gemini-1.5-pro-latest': { rpm: 2, tpm: 32000, name: 'Gemini 1.5 Pro' },
        'gemini-pro': { rpm: 2, tpm: 32000, name: 'Gemini Pro' },
        // OpenAI
        'whisper-1': { rpm: 50, tpm: 0, name: 'Whisper-1' }, // 音声認識なのでTPMは不要
        'gpt-4o-mini': { rpm: 500, tpm: 2000000, name: 'GPT-4o-mini' },
    };

    // 使用量データ（1分間のウィンドウ）
    let usageData = {
        requests: [], // [{timestamp, tokens, model}]
        currentWindowStart: Date.now()
    };

    // ローカルストレージから読み込み
    function loadUsageData() {
        try {
            const saved = localStorage.getItem(USAGE_DATA_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // 1分以上古いデータは削除
                const oneMinuteAgo = Date.now() - 60000;
                parsed.requests = parsed.requests.filter(r => r.timestamp > oneMinuteAgo);
                usageData = parsed;
            }
        } catch(e) {
            console.error("Failed to load usage data:", e);
        }
    }

    // ローカルストレージに保存
    function saveUsageData() {
        try {
            localStorage.setItem(USAGE_DATA_KEY, JSON.stringify(usageData));
        } catch(e) {
            console.error("Failed to save usage data:", e);
        }
    }

    // 1分間のウィンドウをリセット
    function resetWindowIfNeeded() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // 1分以上経過していたらウィンドウをリセット
        if (usageData.currentWindowStart < oneMinuteAgo) {
            usageData.requests = usageData.requests.filter(r => r.timestamp > oneMinuteAgo);
            usageData.currentWindowStart = now;
            saveUsageData();
        }
    }

    // トークン数の推定（簡易版）
    function estimateTokens(text) {
        // 日本語: 1文字 ≈ 1トークン、英語: 1単語 ≈ 1.3トークン
        // 簡易的に文字数/4 + 単語数*1.3 で推定
        const chars = text.length;
        const words = text.split(/\s+/).length;
        return Math.ceil(chars / 4 + words * 1.3);
    }

    // 音声ファイルからトークン数を推定（Whisper用）
    function estimateTokensFromAudio(blob) {
        // 音声ファイルのサイズから推定（1秒 ≈ 16KB、1秒 ≈ 150トークン）
        const sizeInKB = blob.size / 1024;
        const estimatedSeconds = sizeInKB / 16;
        return Math.ceil(estimatedSeconds * 150);
    }

    // API使用量を記録
    window.recordApiUsage = function(provider, model, inputTokens, outputTokens) {
        if (!isEnabled()) return;

        resetWindowIfNeeded();

        const totalTokens = (inputTokens || 0) + (outputTokens || 0);
        const timestamp = Date.now();

        usageData.requests.push({
            timestamp: timestamp,
            tokens: totalTokens,
            model: model || provider,
            provider: provider
        });

        // 1分以上古いリクエストを削除
        const oneMinuteAgo = timestamp - 60000;
        usageData.requests = usageData.requests.filter(r => r.timestamp > oneMinuteAgo);

        saveUsageData();
        updateUsageDisplay();
    };

    // 現在の使用量を取得
    function getCurrentUsage(model) {
        resetWindowIfNeeded();
        
        const oneMinuteAgo = Date.now() - 60000;
        const recentRequests = usageData.requests.filter(r => 
            r.timestamp > oneMinuteAgo && (model ? r.model === model : true)
        );

        const rpm = recentRequests.length;
        const tpm = recentRequests.reduce((sum, r) => sum + (r.tokens || 0), 0);

        return { rpm, tpm, requests: recentRequests };
    }

    // モデルの制限を取得
    function getModelLimits(model) {
        // 完全一致を優先
        if (MODEL_LIMITS[model]) {
            return MODEL_LIMITS[model];
        }
        
        // 部分一致で検索
        for (const [key, limits] of Object.entries(MODEL_LIMITS)) {
            if (model && (model.includes(key) || key.includes(model))) {
                return limits;
            }
        }
        
        // OpenAIの組み合わせ（Whisper + GPT-4o-mini）の場合
        if (model === 'openai-combined') {
            // より厳しい制限を返す（WhisperのRPM制限）
            return { rpm: 50, tpm: 2000000, name: 'OpenAI (Whisper + GPT-4o-mini)' };
        }
        
        // デフォルト値
        return { rpm: 15, tpm: 1000000, name: model || 'Unknown' };
    }

    // 使用量表示を更新
    function updateUsageDisplay() {
        if (!isEnabled()) return;

        const container = document.getElementById('api-usage-display');
        if (!container) return;

        const provider = document.getElementById('ai-provider')?.value;
        if (provider === 'web') {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        let model = '';
        if (provider === 'gemini') {
            model = document.getElementById('model-select')?.value || 'gemini-1.5-flash';
        } else if (provider === 'openai') {
            // OpenAIは2つのAPIを使うので、両方を考慮
            // 使用量は個別に記録されるが、表示は統合
            model = 'openai-combined';
        }

        const limits = getModelLimits(model);
        
        // OpenAIの場合は、WhisperとGPT-4o-miniの両方の使用量を集計
        let usage;
        if (provider === 'openai') {
            const whisperUsage = getCurrentUsage('whisper-1');
            const gptUsage = getCurrentUsage('gpt-4o-mini');
            usage = {
                rpm: whisperUsage.rpm + gptUsage.rpm, // リクエスト数は合計
                tpm: whisperUsage.tpm + gptUsage.tpm, // トークン数は合計
                requests: [...whisperUsage.requests, ...gptUsage.requests]
            };
        } else {
            usage = getCurrentUsage(model);
        }

        // 使用率を計算
        const rpmPercent = limits.rpm > 0 ? Math.min(100, (usage.rpm / limits.rpm) * 100) : 0;
        const tpmPercent = limits.tpm > 0 ? Math.min(100, (usage.tpm / limits.tpm) * 100) : 0;

        // 色を決定（80%以上で警告、100%以上で危険）
        const rpmColor = rpmPercent >= 100 ? '#ef4444' : rpmPercent >= 80 ? '#f59e0b' : '#22c55e';
        const tpmColor = tpmPercent >= 100 ? '#ef4444' : tpmPercent >= 80 ? '#f59e0b' : '#22c55e';

        container.innerHTML = `
            <div style="font-size:0.75rem; margin-bottom:5px; font-weight:bold; color:var(--text);">
                📊 API使用量 (${limits.name})
            </div>
            <div style="margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
                    <span>リクエスト: ${usage.rpm} / ${limits.rpm} RPM</span>
                    <span style="color:${rpmColor}; font-weight:bold;">${rpmPercent.toFixed(0)}%</span>
                </div>
                <div style="width:100%; height:6px; background:rgba(128,128,128,0.2); border-radius:3px; overflow:hidden;">
                    <div style="width:${rpmPercent}%; height:100%; background:${rpmColor}; transition:width 0.3s;"></div>
                </div>
            </div>
            ${limits.tpm > 0 ? `
            <div>
                <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
                    <span>トークン: ${usage.tpm.toLocaleString()} / ${limits.tpm.toLocaleString()} TPM</span>
                    <span style="color:${tpmColor}; font-weight:bold;">${tpmPercent.toFixed(1)}%</span>
                </div>
                <div style="width:100%; height:6px; background:rgba(128,128,128,0.2); border-radius:3px; overflow:hidden;">
                    <div style="width:${tpmPercent}%; height:100%; background:${tpmColor}; transition:width 0.3s;"></div>
                </div>
            </div>
            ` : ''}
        `;
    }

    // 有効/無効の確認
    function isEnabled() {
        const saved = localStorage.getItem(STORAGE_KEY);
        // API使用時はデフォルトON
        const provider = document.getElementById('ai-provider')?.value;
        if (provider === 'gemini' || provider === 'openai') {
            return saved === null ? true : saved === 'true';
        }
        return saved === 'true';
    }

    // 設定画面にオン/オフを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-api-usage-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-api-usage-wrapper';
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
        checkbox.id = 'toggle-api-usage';
        checkbox.style.marginRight = '10px';
        
        const saved = localStorage.getItem(STORAGE_KEY);
        const provider = document.getElementById('ai-provider')?.value;
        // API使用時はデフォルトON
        checkbox.checked = (provider === 'gemini' || provider === 'openai') 
            ? (saved === null ? true : saved === 'true')
            : (saved === 'true');

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("📊 API使用量表示を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "トークン数とリクエスト数を表示し、無料枠内で利用できているかを確認できます。";
        wrapper.appendChild(desc);

        // 再生速度設定の前に挿入
        const rateSetting = document.getElementById('speech-rate')?.closest('div');
        if (rateSetting) {
            settingsBody.insertBefore(wrapper, rateSetting);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // メイン画面に表示エリアを追加
    function injectUsageDisplay() {
        if (document.getElementById('api-usage-display')) return;

        const header = document.querySelector('.header-bar');
        if (!header) return;

        const display = document.createElement('div');
        display.id = 'api-usage-display';
        display.style.cssText = `
            position: absolute;
            top: 60px;
            right: 10px;
            background: var(--card);
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-width: 200px;
            font-size: 0.75rem;
            z-index: 1000;
            display: none;
        `;

        document.body.appendChild(display);
    }

    // 状態を適用
    function applyState() {
        if (isEnabled()) {
            injectUsageDisplay();
            loadUsageData();
            updateUsageDisplay();
            
            // プロバイダー変更時に更新
            const providerSelect = document.getElementById('ai-provider');
            const modelSelect = document.getElementById('model-select');
            if (providerSelect) {
                providerSelect.addEventListener('change', updateUsageDisplay);
            }
            if (modelSelect) {
                modelSelect.addEventListener('change', updateUsageDisplay);
            }
        } else {
            const display = document.getElementById('api-usage-display');
            if (display) {
                display.style.display = 'none';
            }
        }
    }
    
    // グローバルに公開（他のファイルから呼び出し可能）
    window.updateUsageDisplay = updateUsageDisplay;

    // 初期化
    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            applyState();
            
            // 定期的に表示を更新（1秒ごと）
            setInterval(() => {
                if (isEnabled()) {
                    updateUsageDisplay();
                }
            }, 1000);
        }, 800);
    });

    // 設定画面が開かれたときに再適用
    const originalOpenSettings = window.openSettings;
    if (originalOpenSettings) {
        window.openSettings = function() {
            originalOpenSettings();
            setTimeout(() => {
                injectSettingsToggle();
                applyState();
            }, 100);
        };
    }

})();

