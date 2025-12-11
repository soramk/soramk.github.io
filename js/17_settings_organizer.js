/**
 * 17_settings_organizer.js
 * 散らばってしまった設定画面の項目を「基本設定」と「拡張機能」にグループ分けし、
 * レイアウトを整理整頓するプラグイン。
 */

(function() {
    window.addEventListener('load', () => {
        // 他のスクリプトが要素を追加し終わるのを待ってから整理を実行
        setTimeout(organizeSettingsLayout, 1200);
    });

    function organizeSettingsLayout() {
        const modalBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!modalBody) return;

        // --- 1. 要素の特定 ---
        
        // 基本設定系 (AIプロバイダ、APIキー設定、再生速度)
        const providerSection = document.querySelector('#ai-provider').closest('div');
        const configGemini = document.getElementById('config-gemini');
        const configOpenAI = document.getElementById('config-openai');
        const configWeb = document.getElementById('config-web');
        const speedSection = document.getElementById('speech-rate').closest('div');
        const saveBtn = modalBody.querySelector('.btn-main'); // 保存ボタン

        // 拡張機能系 (IDで特定)
        const extensionIds = [
            'setting-mirror-wrapper',      // Mirror
            'setting-blitz-wrapper',       // Blitz
            'setting-twister-wrapper',     // Twister
            'setting-f3game-wrapper',      // F3 Game
            'setting-celebration-wrapper', // Celebration
            'setting-rank-wrapper'         // Rank System
        ];

        // --- 2. グループコンテナの作成 ---

        // A. 基本設定エリア
        const basicGroup = document.createElement('div');
        basicGroup.innerHTML = '<h4 style="margin:0 0 10px; color:var(--primary); border-bottom:2px solid rgba(128,128,128,0.1); padding-bottom:5px;">🎧 基本設定 (AI & Audio)</h4>';
        basicGroup.style.marginBottom = '20px';

        // B. 拡張機能エリア
        const extGroup = document.createElement('div');
        extGroup.innerHTML = '<h4 style="margin:0 0 10px; color:var(--accent); border-bottom:2px solid rgba(128,128,128,0.1); padding-bottom:5px;">🧩 拡張機能 (ON/OFF)</h4>';
        extGroup.style.marginBottom = '20px';
        extGroup.style.display = 'grid';
        extGroup.style.gap = '10px'; // 項目間の隙間

        // --- 3. 要素の移動 (appendChildは移動になるので元の場所からは消えます) ---

        // 基本設定を移動
        if(providerSection) basicGroup.appendChild(providerSection);
        if(configGemini) basicGroup.appendChild(configGemini);
        if(configOpenAI) basicGroup.appendChild(configOpenAI);
        if(configWeb) basicGroup.appendChild(configWeb);
        
        // ★ここがポイント: スピード調整を基本設定の最後に入れる
        if(speedSection) {
            speedSection.style.marginTop = "15px"; // 少し隙間をあける
            basicGroup.appendChild(speedSection);
        }

        // 拡張機能を移動
        extensionIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // スタイル調整（横幅いっぱいにし、マージンをリセット）
                el.style.margin = '0';
                extGroup.appendChild(el);
            }
        });

        // --- 4. モーダルへの再配置 ---

        // 一旦中身を空にするわけにはいかない（保存ボタンなどが消える）ので、上に追加していく
        // 保存ボタンを特定して、その前に挿入するのが安全
        
        if (saveBtn) {
            modalBody.insertBefore(basicGroup, saveBtn);
            modalBody.insertBefore(extGroup, saveBtn);
        } else {
            modalBody.appendChild(basicGroup);
            modalBody.appendChild(extGroup);
        }

        console.log("Settings Organizer: Layout cleaned up.");
    }
})();