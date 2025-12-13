/**
 * feature_api_debug.js
 * APIデバッグ情報（モデル名、プロンプト内容など）を表示する機能
 * 実際にどのモデルに対してどのようなリクエストを送っているかを確認できる
 */

(function() {
    const STORAGE_KEY = 'lr_api_debug_enabled';
    const MAX_LOG_ENTRIES = 50; // 最大表示件数
    
    // デバッグログデータ
    let debugLogs = [];
    
    // 有効/無効の確認
    function isEnabled() {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    
    // デバッグログを追加
    window.addApiDebugLog = function(provider, model, prompt, additionalInfo = {}) {
        if (!isEnabled()) return;
        
        const logEntry = {
            timestamp: new Date().toLocaleTimeString('ja-JP'),
            provider: provider,
            model: model || 'N/A',
            prompt: prompt || '',
            additionalInfo: additionalInfo
        };
        
        debugLogs.unshift(logEntry); // 最新を先頭に
        
        // 最大件数を超えたら古いものを削除
        if (debugLogs.length > MAX_LOG_ENTRIES) {
            debugLogs = debugLogs.slice(0, MAX_LOG_ENTRIES);
        }
        
        updateDebugDisplay();
    };
    
    // デバッグ表示を更新
    function updateDebugDisplay() {
        if (!isEnabled()) return;
        
        const container = document.getElementById('api-debug-display');
        if (!container) return;
        
        container.style.display = 'block';
        
        if (debugLogs.length === 0) {
            container.innerHTML = `
                <div style="font-size:0.75rem; color:var(--text); opacity:0.6; padding:10px; text-align:center;">
                    まだAPIリクエストがありません
                </div>
            `;
            return;
        }
        
        const logsHtml = debugLogs.map((log, index) => {
            const providerColor = log.provider === 'gemini' ? '#4285f4' : 
                                 log.provider === 'openai' ? '#10a37f' : 
                                 '#666';
            
            // プロンプトを短縮表示（長い場合は折りたたみ）
            const promptPreview = log.prompt.length > 200 
                ? log.prompt.substring(0, 200) + '...' 
                : log.prompt;
            const isLongPrompt = log.prompt.length > 200;
            
            return `
                <div style="
                    background: var(--card);
                    border-left: 3px solid ${providerColor};
                    padding: 10px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                ">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <div style="font-weight:bold; color:${providerColor};">
                            ${log.provider.toUpperCase()} → ${log.model}
                        </div>
                        <div style="color:var(--text); opacity:0.6; font-size:0.7rem;">
                            ${log.timestamp}
                        </div>
                    </div>
                    <div style="
                        background: rgba(128,128,128,0.1);
                        padding: 8px;
                        border-radius: 4px;
                        margin-top: 5px;
                        font-family: monospace;
                        font-size: 0.7rem;
                        white-space: pre-wrap;
                        word-break: break-word;
                        max-height: ${isLongPrompt ? '150px' : 'auto'};
                        overflow-y: auto;
                    ">
                        ${escapeHtml(promptPreview)}
                        ${isLongPrompt ? `
                            <div style="margin-top:5px; color:var(--primary); cursor:pointer; font-size:0.65rem;" 
                                 onclick="this.parentElement.style.maxHeight='none'; this.style.display='none';">
                                [全文を表示]
                            </div>
                        ` : ''}
                    </div>
                    ${Object.keys(log.additionalInfo).length > 0 ? `
                        <div style="margin-top:5px; font-size:0.65rem; color:var(--text); opacity:0.7;">
                            ${Object.entries(log.additionalInfo).map(([key, value]) => 
                                `<div>${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}</div>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div style="font-size:0.75rem; margin-bottom:8px; font-weight:bold; color:var(--text);">
                🔍 APIデバッグログ (最新${debugLogs.length}件)
            </div>
            <div style="max-height:400px; overflow-y:auto;">
                ${logsHtml}
            </div>
            <button onclick="clearApiDebugLogs()" style="
                width:100%;
                margin-top:10px;
                padding:6px;
                background:rgba(128,128,128,0.2);
                border:none;
                border-radius:4px;
                color:var(--text);
                cursor:pointer;
                font-size:0.7rem;
            ">ログをクリア</button>
        `;
    }
    
    // HTMLエスケープ
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ログをクリア
    window.clearApiDebugLogs = function() {
        debugLogs = [];
        updateDebugDisplay();
    };
    
    // 設定画面にオン/オフを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-api-debug-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-api-debug-wrapper';
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
        checkbox.id = 'toggle-api-debug';
        checkbox.style.marginRight = '10px';
        
        const saved = localStorage.getItem(STORAGE_KEY);
        checkbox.checked = saved === 'true';

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🔍 APIデバッグログを表示する"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "実際に送信しているモデル名とプロンプト内容を確認できます。";
        wrapper.appendChild(desc);

        // API使用量設定の後に挿入
        const apiUsageSetting = document.getElementById('setting-api-usage-wrapper');
        if (apiUsageSetting) {
            settingsBody.insertBefore(wrapper, apiUsageSetting.nextSibling);
        } else {
            // API使用量設定がない場合は、再生速度設定の前に挿入
            const rateSetting = document.getElementById('speech-rate')?.closest('div');
            if (rateSetting) {
                settingsBody.insertBefore(wrapper, rateSetting);
            } else {
                settingsBody.appendChild(wrapper);
            }
        }
    }

    // メイン画面に表示エリアを追加（履歴の下、API使用量表示の後に配置）
    function injectDebugDisplay() {
        if (document.getElementById('api-debug-display')) return;

        // API使用量表示があればその後に、なければ履歴コンテナの後に追加
        const apiUsageDisplay = document.getElementById('api-usage-display');
        const historyContainer = document.querySelector('.history-container');
        
        if (!historyContainer && !apiUsageDisplay) return;

        const display = document.createElement('div');
        display.id = 'api-debug-display';
        display.style.cssText = `
            margin-top: 20px;
            background: var(--card);
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-size: 0.75rem;
            display: none;
        `;

        // API使用量表示の後に追加（あれば）
        if (apiUsageDisplay && apiUsageDisplay.parentElement) {
            apiUsageDisplay.parentElement.insertBefore(display, apiUsageDisplay.nextSibling);
        } else if (historyContainer) {
            // 履歴コンテナの親要素（container）に追加
            const container = historyContainer.parentElement;
            if (container) {
                container.appendChild(display);
            } else {
                // フォールバック: 履歴コンテナの後に追加
                historyContainer.parentNode.insertBefore(display, historyContainer.nextSibling);
            }
        }
    }

    // 状態を適用
    function applyState() {
        if (isEnabled()) {
            injectDebugDisplay();
            updateDebugDisplay();
        } else {
            const display = document.getElementById('api-debug-display');
            if (display) {
                display.style.display = 'none';
            }
        }
    }

    // 初期化
    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            applyState();
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

