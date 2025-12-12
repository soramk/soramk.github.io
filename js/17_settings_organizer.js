/**
 * 17_settings_organizer.js (v4: Geminiリンク追加版)
 * 設定項目を整理し、Gemini APIキー取得ページへのリンクを追加します。
 */

(function() {
    window.addEventListener('load', () => {
        setTimeout(organizeSettingsLayout, 1500);
    });

    function organizeSettingsLayout() {
        const modalContent = document.querySelector('#settings-modal .modal-content');
        if (!modalContent) return;
        const scrollableBody = modalContent.querySelector('div[style*="overflow"]');
        if (!scrollableBody) return;

        // --- 0. Geminiリンクの注入 (New!) ---
        const apiKeyInput = document.getElementById('api-key-gemini');
        if (apiKeyInput && !document.getElementById('gemini-link-hint')) {
            const linkDiv = document.createElement('div');
            linkDiv.id = 'gemini-link-hint';
            linkDiv.style.fontSize = '0.8rem';
            linkDiv.style.marginTop = '4px';
            linkDiv.innerHTML = `
                <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--primary); text-decoration:underline;">
                    🔑 Get Gemini API Key Here
                </a>
            `;
            apiKeyInput.parentNode.insertBefore(linkDiv, apiKeyInput.nextSibling);
        }

        // --- 以下、既存の整理ロジック ---
        const providerSection = document.querySelector('#ai-provider') ? document.querySelector('#ai-provider').closest('div') : null;
        const configGemini = document.getElementById('config-gemini');
        const configOpenAI = document.getElementById('config-openai');
        const configWeb = document.getElementById('config-web');
        const speedSection = document.getElementById('speech-rate') ? document.getElementById('speech-rate').closest('div') : null;
        const saveBtn = scrollableBody.querySelector('.btn-main');
        const katakanaSection = document.getElementById('setting-katakana-wrapper');

        const extensionOrder = [
            'setting-mirror-wrapper', 'setting-f3game-wrapper', 'setting-blitz-wrapper',
            'setting-twister-wrapper', 'setting-rank-wrapper', 'setting-celebration-wrapper'
        ];

        const basicGroup = document.createElement('div');
        basicGroup.innerHTML = '<h4 style="margin:0 0 10px; color:var(--primary); border-bottom:2px solid rgba(128,128,128,0.1); padding-bottom:5px;">🎧 基本設定 (Basic)</h4>';
        basicGroup.style.marginBottom = '25px';

        const extGroup = document.createElement('div');
        extGroup.innerHTML = '<h4 style="margin:0 0 10px; color:var(--accent); border-bottom:2px solid rgba(128,128,128,0.1); padding-bottom:5px;">🧩 拡張機能 (Extensions)</h4>';
        extGroup.style.marginBottom = '10px';
        extGroup.style.display = 'grid';
        extGroup.style.gap = '12px';

        if(providerSection) basicGroup.appendChild(providerSection);
        if(configGemini) basicGroup.appendChild(configGemini);
        if(configOpenAI) basicGroup.appendChild(configOpenAI);
        if(configWeb) basicGroup.appendChild(configWeb);
        if(speedSection) { speedSection.style.marginTop = "15px"; speedSection.style.marginBottom = "15px"; basicGroup.appendChild(speedSection); }
        if(katakanaSection) { katakanaSection.style.margin = "0"; basicGroup.appendChild(katakanaSection); }

        extensionOrder.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.margin = '0'; extGroup.appendChild(el); }
        });

        scrollableBody.insertBefore(extGroup, scrollableBody.firstChild);
        scrollableBody.insertBefore(basicGroup, scrollableBody.firstChild);

        if (saveBtn) {
            scrollableBody.style.maxHeight = '60vh'; 
            let footer = modalContent.querySelector('.settings-footer');
            if (!footer) {
                footer = document.createElement('div');
                footer.className = 'settings-footer';
                footer.style.borderTop = '1px solid rgba(128,128,128,0.2)';
                footer.style.paddingTop = '15px';
                footer.style.marginTop = '10px';
                footer.style.textAlign = 'center';
                modalContent.appendChild(footer);
            }
            saveBtn.style.width = '100%';
            saveBtn.style.margin = '0';
            footer.appendChild(saveBtn);
        }
    }
})();