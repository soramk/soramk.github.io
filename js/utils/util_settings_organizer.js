/**
 * util_settings_organizer.js (v6: カテゴリ分け対応版)
 * 設定画面の拡張機能をカテゴリ別に整理します。
 * カテゴリ: ビジュアル・可視化、ゲーム・チャレンジ、UI・演出、API・デバッグ
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

        // Geminiリンク注入
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

        // 要素特定
        const providerSection = document.querySelector('#ai-provider') ? document.querySelector('#ai-provider').closest('div') : null;
        const configGemini = document.getElementById('config-gemini');
        const configOpenAI = document.getElementById('config-openai');
        const configWeb = document.getElementById('config-web');
        const speedSection = document.getElementById('speech-rate') ? document.getElementById('speech-rate').closest('div') : null;
        const saveBtn = scrollableBody.querySelector('.btn-main');
        const katakanaSection = document.getElementById('setting-katakana-wrapper');

        // ★更新: カテゴリ別の拡張機能定義
        const extensionCategories = {
            'visual': {
                title: '📹 ビジュアル・可視化',
                items: [
                    'setting-mirror-wrapper',      // ミラーモード
                    'setting-f3game-wrapper'       // F3ゲーム
                ]
            },
            'game': {
                title: '🎮 ゲーム・チャレンジ',
                items: [
                    'setting-blitz-wrapper',       // Blitzモード
                    'setting-sentence-wrapper',    // センテンスモード
                    'setting-twister-wrapper',     // 早口言葉
                    'setting-rhythm-wrapper',      // リズム練習モード
                    'setting-time-attack-wrapper'  // タイムアタックモード
                ]
            },
            'ui': {
                title: '✨ UI・演出',
                items: [
                    'setting-rank-wrapper',        // ランクシステム
                    'setting-celebration-wrapper', // 祝賀演出
                    'setting-mascot-wrapper'       // マスコット
                ]
            },
            'learning': {
                title: '📚 学習支援・分析',
                items: [
                    'setting-trend-wrapper',           // 発音トレンド分析
                    'setting-custom-session-wrapper',  // カスタム練習セッション
                    'setting-coaching-wrapper',        // 発音コーチングモード
                    'setting-detailed-stats-wrapper',  // 詳細統計ダッシュボード
                    'setting-reminder-wrapper',        // 復習リマインダー
                    'setting-notes-wrapper',           // 発音ノート機能
                    'setting-accent-wrapper',          // アクセント選択機能
                    'setting-audio-effects-wrapper',   // 音声エフェクト機能
                    'setting-audio-optimization-wrapper' // 音声最適化機能
                ]
            },
            'api': {
                title: '🔧 API・デバッグ',
                items: [
                    'setting-api-usage-wrapper',   // API使用量表示
                    'setting-api-debug-wrapper'    // APIデバッグログ
                ]
            }
        };

        const basicGroup = document.createElement('div');
        basicGroup.innerHTML = '<h4 style="margin:0 0 10px; color:var(--primary); border-bottom:2px solid rgba(128,128,128,0.1); padding-bottom:5px;">🎧 基本設定 (Basic)</h4>';
        basicGroup.style.marginBottom = '25px';

        if(providerSection) basicGroup.appendChild(providerSection);
        if(configGemini) basicGroup.appendChild(configGemini);
        if(configOpenAI) basicGroup.appendChild(configOpenAI);
        if(configWeb) basicGroup.appendChild(configWeb);
        if(speedSection) { speedSection.style.marginTop = "15px"; speedSection.style.marginBottom = "15px"; basicGroup.appendChild(speedSection); }
        if(katakanaSection) { katakanaSection.style.margin = "0"; basicGroup.appendChild(katakanaSection); }

        // カテゴリ別に拡張機能を整理
        const extGroupsContainer = document.createElement('div');
        extGroupsContainer.style.marginBottom = '10px';
        
        Object.entries(extensionCategories).forEach(([categoryKey, category]) => {
            const categoryGroup = document.createElement('div');
            categoryGroup.style.marginBottom = '20px';
            
            const categoryTitle = document.createElement('h4');
            categoryTitle.innerHTML = category.title;
            categoryTitle.style.margin = '0 0 10px 0';
            categoryTitle.style.color = 'var(--accent)';
            categoryTitle.style.borderBottom = '2px solid rgba(128,128,128,0.1)';
            categoryTitle.style.paddingBottom = '5px';
            categoryTitle.style.fontSize = '0.95rem';
            categoryGroup.appendChild(categoryTitle);
            
            const categoryItems = document.createElement('div');
            categoryItems.style.display = 'grid';
            categoryItems.style.gap = '12px';
            
            category.items.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.margin = '0';
                    categoryItems.appendChild(el);
                }
            });
            
            // カテゴリにアイテムがある場合のみ追加
            if (categoryItems.children.length > 0) {
                categoryGroup.appendChild(categoryItems);
                extGroupsContainer.appendChild(categoryGroup);
            }
        });

        scrollableBody.insertBefore(extGroupsContainer, scrollableBody.firstChild);
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